import {daysBetween, marketCloseTime, MarketDate} from './dates';
import type {DailyHistory} from '../data/types';
import {
  createPortfolio,
  executeOrder,
  maxAffordableShares,
  Portfolio,
  TradeReason,
  Transaction,
} from '../portfolio';
import type {CostSettings} from './costs';
import {crossesLine, RISK_KINDS, riskLine} from './risk';
import {BotInput, stopDistance} from './bots';
import {getStrategy} from './strategies';
import {historyUpTo, IndicatorLine, PriceBar} from './strategy';
import {positionShares} from './sizing';
import {annualReturn, Drawdown, maxDrawdown, totalReturn} from './metrics';

// The backtester replays a bot over past prices, one trading day at a time,
// in a fresh simulated account. Each day, in this order:
// 1. Dividends: if the bot holds the stock on its ex-dividend date, the
//    dividend buys more shares at that day's close.
// 2. Exits: stop-loss, take-profit and trailing stop, measured from the
//    trade's entry price (the trailing stop from the highest close since
//    the entry). An exit sells everything.
// 3. The strategy: BUY, SELL or HOLD, decided from prices up to today only.
// 4. The account's value at the close is recorded.
//
// Every trade fills at that day's closing price. That's a simplification:
// in real life you can't know the close and trade at it, but it keeps
// results easy to check.
//
// After an exit, the bot doesn't buy straight back. Otherwise a stop-loss
// in a still-rising trend would sell and immediately rebuy at the same
// price. It waits until its own rule turns negative (the strategy would
// sell if it held), and then for a fresh buy.
//
// Buy-and-hold and the index benchmark are measured the same way: everything
// invested at the first close, with dividends reinvested at each ex-date's
// close. Cash earns nothing.
//
// Costs (optional, see engine/costs.ts): every bot trade pays the spread,
// and every sale sets aside the estimated short-term tax. Buy-and-hold and
// the index pay the spread once, on their first purchase, and never sell,
// so they owe no tax. Shares still held at the end are valued at the last
// close, with no selling costs, for all three lines alike. Reinvested
// dividends pay no spread, as with most brokers' reinvestment plans.

export interface BacktestInput {
  bot: BotInput;
  // The stock's prices, starting early enough for the strategy's warm-up.
  history: DailyHistory;
  // The index (SPY) over the same dates, or undefined if it couldn't load.
  benchmark?: DailyHistory;
  from: MarketDate;
  to: MarketDate;
  startingBalance: number;
  costs?: CostSettings;
}

// One round trip: a buy and the sale that closed it.
export interface BacktestTrade {
  entryIndex: number; // position in BacktestResult.dates
  entryDate: MarketDate;
  entryPrice: number;
  cost: number; // including the spread
  shares: number; // including shares bought with dividends
  entryReason: TradeReason;
  exitIndex?: number;
  exitDate?: MarketDate;
  exitPrice?: number;
  proceeds?: number; // after the spread, before tax
  exitReason?: TradeReason;
  fees: number; // the spread paid on the buy and the sale
  tax?: number; // set aside from the sale (negative: given back)
  open: boolean; // still held at the end
  // After the spread, before tax. Tax depends on the whole year's sales,
  // so it's counted for the account, not per trade. An open trade is
  // valued at the last close.
  returnPercent: number;
}

export interface LineStats {
  finalValue: number;
  totalReturn: number;
  annualReturn?: number;
  maxDrawdown: Drawdown;
}

export interface BacktestResult {
  dates: MarketDate[];
  // True when the prices started after the requested start date, so the
  // test begins later than asked (a young stock, or an index that starts
  // later). A start date on a weekend or holiday doesn't count.
  startedLate: boolean;
  closes: number[];
  indicators: IndicatorLine[]; // the strategy's lines, over `dates`
  equity: number[]; // the bot's account value at each close
  buyHold: number[];
  benchmark?: number[];
  trades: BacktestTrade[];
  transactions: Transaction[]; // every simulated trade, oldest first
  stats: {
    strategy: LineStats;
    buyHold: LineStats;
    benchmark?: LineStats;
    closedTrades: number;
    openTrades: number;
    wins: number;
    winRate?: number; // percent of closed trades that made money
    exposure: number; // percent of days it held the stock
    spreadPaid: number;
    taxPaid: number; // net of refunds
  };
}

export const MIN_BALANCE = 100;
export const MAX_BALANCE = 10000000;

export type BacktestError = 'range' | 'balance';

export const validateBacktest = (
  from: MarketDate,
  to: MarketDate,
  startingBalance: number,
): BacktestError[] => {
  const errors: BacktestError[] = [];
  if (!(from < to)) {
    errors.push('range');
  }
  if (!(startingBalance >= MIN_BALANCE && startingBalance <= MAX_BALANCE)) {
    errors.push('balance');
  }
  return errors;
};

const cents = (value: number) => Math.round(value * 100) / 100;

// The value over `dates` of `amount` put into `history` at the first close,
// with dividends reinvested. If the stock didn't trade on one of the dates,
// its last close carries over.
export const buyAndHold = (
  dates: MarketDate[],
  history: DailyHistory,
  amount: number,
  spreadPercent = 0,
): number[] => {
  const dividends = new Map<MarketDate, number>();
  history.dividends.forEach(d =>
    dividends.set(d.date, (dividends.get(d.date) ?? 0) + d.amount),
  );
  const bars = history.bars;
  let next = 0;
  let price: number | undefined;
  let shares = 0;
  return dates.map((date, day) => {
    while (next < bars.length && bars[next].date <= date) {
      const bar = bars[next++];
      price = bar.close;
      const dividend = dividends.get(bar.date);
      if (day > 0 && shares && dividend) {
        shares += (shares * dividend) / bar.close;
      }
    }
    if (day === 0) {
      // The first purchase pays the spread: $1,000 at 0.1% buys $999.00
      // worth of shares, rounded.
      shares = price ? amount / (price * (1 + spreadPercent / 100)) : 0;
    }
    return shares * (price ?? 0);
  });
};

// Returns are measured from the money put in, not from the first close's
// value: with a spread, a line that buys on day one is already worth a
// little less than it started with, and that cost has to count.
const lineStats = (
  values: number[],
  startingBalance: number,
  from: MarketDate,
  to: MarketDate,
): LineStats => {
  const finalValue = values[values.length - 1];
  return {
    finalValue,
    totalReturn: totalReturn(startingBalance, finalValue),
    annualReturn: annualReturn(startingBalance, finalValue, from, to),
    maxDrawdown: maxDrawdown(values),
  };
};

export const runBacktest = (input: BacktestInput): BacktestResult | null => {
  const {bot, history, benchmark, to, startingBalance, costs} = input;
  const spread = costs?.spreadPercent ?? 0;
  const strategy = getStrategy(bot.strategy);
  const warmup = strategy.warmupBars(bot.settings);
  const bars = history.bars.filter(bar => bar.date <= to);

  // Compare over the same period: start once both the stock and the index
  // have prices.
  const benchmarkStart = benchmark?.bars[0]?.date;
  const from =
    benchmarkStart && benchmarkStart > input.from ? benchmarkStart : input.from;
  const start = bars.findIndex(bar => bar.date >= from);
  if (start < 0 || start >= bars.length - 1) {
    return null; // fewer than two days to compare
  }
  // A weekend plus a holiday can push the first trading day up to 4 days
  // past the requested date. More than that means the prices began later.
  const startedLate = daysBetween(input.from, bars[start].date) > 5;

  const symbol = bot.symbol;
  const priceBars: PriceBar[] = bars.map(({date, close}) => ({date, close}));
  const dividends = new Map<MarketDate, number>();
  history.dividends.forEach(d =>
    dividends.set(d.date, (dividends.get(d.date) ?? 0) + d.amount),
  );
  const stop = stopDistance(bot.exits);

  let portfolio: Portfolio = createPortfolio(startingBalance, 0);
  let trade: BacktestTrade | undefined;
  let highSinceEntry = 0; // for the trailing stop, updated day by day
  let waitForReset = false;
  let daysHolding = 0;
  const trades: BacktestTrade[] = [];
  const equity: number[] = [];

  const order = (
    side: 'BUY' | 'SELL',
    shares: number,
    i: number,
    reason: TradeReason,
    source: Transaction['source'],
  ) => {
    const result = executeOrder(portfolio, {
      // Fixed ids, so running the same backtest twice gives the same result.
      id: `bt-${portfolio.transactions.length + 1}`,
      side,
      symbol,
      name: bot.name,
      shares,
      price: bars[i].close,
      date: marketCloseTime(bars[i].date),
      source,
      reason,
      unitsAsOf: to,
      // Reinvested dividends pay no spread.
      costs: source === 'dividend' ? undefined : costs,
    });
    portfolio = result.portfolio;
    return result.transaction;
  };

  const sellAll = (i: number, reason: TradeReason) => {
    const sale = order(
      'SELL',
      portfolio.positions[symbol].shares,
      i,
      reason,
      'bot',
    );
    const proceeds = cents(sale.total - (sale.fees ?? 0));
    Object.assign(trade!, {
      exitIndex: i - start,
      exitDate: bars[i].date,
      exitPrice: bars[i].close,
      proceeds,
      exitReason: reason,
      fees: cents(trade!.fees + (sale.fees ?? 0)),
      tax: sale.tax,
      open: false,
      returnPercent: totalReturn(trade!.cost, proceeds),
    });
    trades.push(trade!);
    trade = undefined;
  };

  for (let i = start; i < bars.length; i++) {
    const {date, close} = bars[i];

    // 1. Dividends, reinvested at today's close.
    const dividend = dividends.get(date);
    if (trade && dividend) {
      const payout = cents(portfolio.positions[symbol].shares * dividend);
      portfolio = {...portfolio, cash: cents(portfolio.cash + payout)};
      const shares = maxAffordableShares(payout, close);
      if (shares > 0) {
        order(
          'BUY',
          shares,
          i,
          {code: 'dividendReinvest', params: {amount: dividend, total: payout}},
          'dividend',
        );
        trade.shares += shares;
      }
    }

    // 2. Exits, checked from the day after the entry.
    if (trade && i - start > trade.entryIndex) {
      highSinceEntry = Math.max(highSinceEntry, close);
      for (const kind of RISK_KINDS) {
        const percent = bot.exits[kind];
        if (percent === undefined) {
          continue;
        }
        const reference =
          kind === 'trailingStop' ? highSinceEntry : trade.entryPrice;
        if (crossesLine(kind, close, riskLine(kind, percent, reference))) {
          sellAll(i, {code: kind, params: {percent, close, reference}});
          waitForReset = true;
          break;
        }
      }
    }

    // 3. The strategy, shown only the days up to today.
    const recent = historyUpTo(priceBars, i, warmup);
    if (trade) {
      const decision = strategy.decide(recent, bot.settings, true);
      if (decision.action === 'SELL') {
        sellAll(i, decision.reason);
      }
    } else if (waitForReset) {
      // After an exit, wait until the rule itself would sell.
      if (strategy.decide(recent, bot.settings, true).action === 'SELL') {
        waitForReset = false;
      }
    } else {
      const decision = strategy.decide(recent, bot.settings, false);
      if (decision.action === 'BUY') {
        const shares = positionShares(
          {
            equity: portfolio.cash,
            cash: portfolio.cash,
            riskPercent: bot.riskPercent,
            stopPercent: stop,
          },
          close,
          spread,
        );
        if (shares > 0) {
          const buy = order('BUY', shares, i, decision.reason, 'bot');
          highSinceEntry = close;
          trade = {
            entryIndex: i - start,
            entryDate: date,
            entryPrice: close,
            cost: cents(buy.total + (buy.fees ?? 0)),
            shares,
            entryReason: decision.reason,
            fees: buy.fees ?? 0,
            open: true,
            returnPercent: 0,
          };
        }
      }
    }

    // 4. The account's value at today's close.
    const held = portfolio.positions[symbol]?.shares ?? 0;
    equity.push(portfolio.cash + held * close);
    if (held) {
      daysHolding++;
    }
  }

  const dates = bars.slice(start).map(bar => bar.date);
  const lastClose = bars[bars.length - 1].close;
  if (trade) {
    trade.returnPercent = totalReturn(trade.cost, trade.shares * lastClose);
    trades.push(trade);
  }

  const buyHold = buyAndHold(dates, history, startingBalance, spread);
  const benchmarkValues = benchmark
    ? buyAndHold(dates, benchmark, startingBalance, spread)
    : undefined;
  const transactions = [...portfolio.transactions].reverse();
  const totalOf = (field: 'fees' | 'tax') =>
    cents(transactions.reduce((total, t) => total + (t[field] ?? 0), 0));
  const closed = trades.filter(t => !t.open);
  const wins = closed.filter(t => (t.proceeds ?? 0) > t.cost).length;
  const first = dates[0];
  const last = dates[dates.length - 1];

  return {
    dates,
    startedLate,
    closes: bars.slice(start).map(bar => bar.close),
    indicators: strategy
      .indicators(
        priceBars.map(bar => bar.close),
        bot.settings,
      )
      .map(line => ({...line, values: line.values.slice(start)})),
    equity,
    buyHold,
    benchmark: benchmarkValues,
    trades,
    transactions,
    stats: {
      strategy: lineStats(equity, startingBalance, first, last),
      buyHold: lineStats(buyHold, startingBalance, first, last),
      benchmark: benchmarkValues
        ? lineStats(benchmarkValues, startingBalance, first, last)
        : undefined,
      closedTrades: closed.length,
      openTrades: trades.length - closed.length,
      wins,
      winRate: closed.length ? (wins / closed.length) * 100 : undefined,
      exposure: (daysHolding / dates.length) * 100,
      spreadPaid: totalOf('fees'),
      taxPaid: totalOf('tax'),
    },
  };
};
