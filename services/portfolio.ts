import type {ChartPoint, Quote} from './marketData';
import {MarketDate, toMarketDate} from './engine/dates';
import {
  CostSettings,
  isShortTerm,
  spreadFee,
  taxOnSale,
  taxYear,
  taxYearSoFar,
} from './engine/costs';
import {cleanDecimalInput} from './format';

// Paper trading: orders fill instantly at the given price against a virtual
// cash balance. Everything here is pure so it can be unit tested.

export const DEFAULT_STARTING_CASH = 100000;
export const STARTING_CASH_OPTIONS = [10000, 50000, 100000, 1000000];

// Fractional shares are kept to 6 decimal places (0.000001 of a share), like
// most brokers that offer them. Money is kept to the cent.
export const SHARE_DECIMALS = 6;
const SHARE_UNIT = 10 ** SHARE_DECIMALS;

// Bumped whenever the saved shape changes; see migratePortfolio.
export const PORTFOLIO_VERSION = 2;

// One purchase. Positions keep their lots separately, instead of merging
// them into a single average, because some rules need to know about each
// purchase: when it happened (short-term tax applies to holdings of a year
// or less) and what it cost.
//
// Stock splits: prices are always quoted in the shares that exist on the day
// you look. If a stock splits 10-for-1 after you bought 1 share at $1,000,
// you now have 10 shares that cost $100 each. `unitsAsOf` is the day whose
// shares the lot is counted in, so applySplit knows which lots still need
// converting.
export interface Lot {
  shares: number;
  price: number; // cost per share, including any buying fees
  date: number; // when it was bought
  unitsAsOf: MarketDate;
}

export interface Position {
  symbol: string;
  name: string;
  lots: Lot[]; // oldest first; selling uses the oldest lots first (FIFO)
  // Totals across the lots, kept in sync by buildPosition so screens can
  // read them directly.
  shares: number;
  avgCost: number;
}

export type TradeSide = 'BUY' | 'SELL';

// Who placed a trade: you, or one of the automations.
export type TradeSource =
  | 'manual'
  | 'recurring'
  | 'risk'
  | 'bot'
  | 'rebalance'
  | 'dividend'; // a dividend reinvested in more shares (backtests)

// Why an automated trade happened, stored as a code plus the numbers it
// mentions, e.g. {code: 'trailingStop', params: {percent: 8}}. Screens turn
// it into a sentence in the current language, so it isn't saved in one.
export interface TradeReason {
  code: string;
  params?: Record<string, string | number>;
}

export interface Transaction {
  id: string;
  side: TradeSide;
  symbol: string;
  name: string;
  shares: number;
  price: number;
  total: number; // shares × price, before fees and tax
  realizedPnL?: number; // sells only, after this sale's fees and tax
  date: number;
  source: TradeSource;
  reason?: TradeReason;
  automationId?: string; // the rule or bot that placed it
  fees?: number; // the spread (see engine/costs.ts)
  // Estimated tax set aside from a sale. Negative when a loss gave back
  // tax set aside earlier in the year.
  tax?: number;
  // Sells only: the gain (or loss, negative) on the shares that had been
  // held a year or less, after this sale's fees. Kept on every sale, even
  // with taxes off, so turning them on mid-year nets against earlier sales.
  shortTermGain?: number;
  unitsAsOf?: MarketDate; // see Lot; missing on trades saved before splits were tracked
}

// A split that has been applied to this portfolio's lots.
export interface AppliedSplit {
  symbol: string;
  date: MarketDate;
  ratio: number;
}

export interface Portfolio {
  version: number;
  startingCash: number;
  cash: number;
  positions: Record<string, Position>;
  transactions: Transaction[]; // newest first
  splits: AppliedSplit[];
  createdAt: number;
}

export type OrderErrorCode =
  | 'INVALID_QUANTITY'
  | 'INVALID_PRICE'
  | 'INSUFFICIENT_CASH'
  | 'INSUFFICIENT_SHARES';

export class OrderError extends Error {
  code: OrderErrorCode;
  constructor(code: OrderErrorCode) {
    super(code);
    this.code = code;
  }
}

export interface OrderInput {
  side: TradeSide;
  symbol: string;
  name: string;
  shares: number;
  price: number;
  date?: number;
  id?: string;
  source?: TradeSource; // defaults to 'manual'
  reason?: TradeReason;
  automationId?: string;
  fees?: number;
  tax?: number;
  // Spread and tax rates to charge (see engine/costs.ts). The spread is
  // added to `fees`; the tax is worked out from the year's earlier sales,
  // unless `tax` is given.
  costs?: CostSettings;
  // Which day's shares the price is quoted in. Live prices are in today's
  // shares, which is the default. An automation that fills a past day at
  // that day's close passes the day the prices were downloaded, because
  // downloaded history is already converted to today's shares.
  unitsAsOf?: MarketDate;
}

const cents = (value: number) => Math.round(value * 100) / 100;
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export const roundShares = (value: number) =>
  Math.round(value * SHARE_UNIT) / SHARE_UNIT;

// Cleans what the user types as a share quantity (see cleanDecimalInput).
export const cleanSharesInput = (text: string) =>
  cleanDecimalInput(text, SHARE_DECIMALS);

// The text to show in a quantity box for a number of shares.
export const sharesToInput = (shares: number) =>
  String(roundShares(Math.max(0, shares)));

export const createPortfolio = (
  startingCash = DEFAULT_STARTING_CASH,
  now = Date.now(),
): Portfolio => ({
  version: PORTFOLIO_VERSION,
  startingCash,
  cash: startingCash,
  positions: {},
  transactions: [],
  splits: [],
  createdAt: now,
});

// Recomputes a position's totals from its lots.
export const buildPosition = (
  symbol: string,
  name: string,
  lots: Lot[],
): Position => {
  const shares = roundShares(sum(lots.map(lot => lot.shares)));
  return {
    symbol,
    name,
    lots,
    shares,
    avgCost: shares ? sum(lots.map(lot => lot.shares * lot.price)) / shares : 0,
  };
};

// The most shares the cash can buy, rounded down to a whole SHARE_DECIMALS
// unit. The tiny epsilon stops float noise from rounding a whole number down:
// 0.3 / 0.1 is 2.9999999999999996 in floating point, but it should buy 3.
export const maxAffordableShares = (cash: number, price: number) =>
  price > 0 ? Math.floor((cash / price) * SHARE_UNIT + 1e-6) / SHARE_UNIT : 0;

// What buying costs in all: the shares plus the spread.
export const buyCost = (shares: number, price: number, spreadPercent = 0) => {
  const total = cents(shares * price);
  return cents(total + spreadFee(total, spreadPercent));
};

// The most shares `cash` can buy once the spread is paid too. Each amount
// is rounded to the cent, which can add up to a cent, so if the first guess
// goes over, it tries again with a cent less.
export const affordableShares = (
  cash: number,
  price: number,
  spreadPercent = 0,
) => {
  const perShare = 1 + spreadPercent / 100;
  const shares = maxAffordableShares(cash / perShare, price);
  return buyCost(shares, price, spreadPercent) <= cash
    ? shares
    : maxAffordableShares(Math.max(0, cash - 0.01) / perShare, price);
};

// Takes `shares` from the oldest lots first. Returns what's left, how much
// those shares had cost, and how many of them (and their cost) had been
// held a year or less on `soldOn`.
const takeFifo = (lots: Lot[], shares: number, soldOn: MarketDate) => {
  const remaining: Lot[] = [];
  let toTake = shares;
  let cost = 0;
  const shortTerm = {shares: 0, cost: 0};
  for (const lot of lots) {
    const taken = Math.min(lot.shares, toTake);
    toTake = roundShares(toTake - taken);
    cost += taken * lot.price;
    if (taken > 0 && isShortTerm(toMarketDate(lot.date), soldOn)) {
      shortTerm.shares += taken;
      shortTerm.cost += taken * lot.price;
    }
    const left = roundShares(lot.shares - taken);
    if (left > 0) {
      remaining.push({...lot, shares: left});
    }
  }
  return {remaining, cost, shortTerm};
};

export const executeOrder = (
  portfolio: Portfolio,
  order: OrderInput,
): {portfolio: Portfolio; transaction: Transaction} => {
  const {side, symbol, name, price, costs} = order;
  let shares = roundShares(order.shares);
  if (!Number.isFinite(shares) || shares <= 0) {
    throw new OrderError('INVALID_QUANTITY');
  }
  if (!(price > 0)) {
    throw new OrderError('INVALID_PRICE');
  }

  const date = order.date ?? Date.now();
  const unitsAsOf = order.unitsAsOf ?? toMarketDate(date);
  const positions = {...portfolio.positions};
  const existing = positions[symbol];
  const total = cents(shares * price);
  const fees = cents(
    (order.fees ?? 0) + spreadFee(total, costs?.spreadPercent ?? 0),
  );
  let tax = cents(order.tax ?? 0);
  let cash = portfolio.cash;
  let realizedPnL: number | undefined;
  let shortTermGain: number | undefined;

  if (side === 'BUY') {
    if (cents(total + fees) > cash) {
      throw new OrderError('INSUFFICIENT_CASH');
    }
    const lot: Lot = {shares, price: price + fees / shares, date, unitsAsOf};
    positions[symbol] = buildPosition(symbol, name, [
      ...(existing?.lots ?? []),
      lot,
    ]);
    cash = cents(cash - total - fees);
  } else {
    if (!existing || shares > existing.shares) {
      throw new OrderError('INSUFFICIENT_SHARES');
    }
    const soldOn = toMarketDate(date);
    const {remaining, cost, shortTerm} = takeFifo(
      existing.lots,
      shares,
      soldOn,
    );
    if (shortTerm.shares > 0) {
      // The short-term shares' part of the proceeds and the selling fees.
      // When every share sold is short-term, this is the whole gain.
      const part = shortTerm.shares / shares;
      shortTermGain = cents((total - fees) * part - shortTerm.cost);
      if (order.tax === undefined && costs?.taxPercent) {
        const year = taxYearSoFar(portfolio.transactions, taxYear(soldOn));
        tax = taxOnSale(year, shortTermGain, costs.taxPercent);
      }
    }
    realizedPnL = cents(total - cost - fees - tax);
    if (remaining.length) {
      positions[symbol] = buildPosition(symbol, existing.name, remaining);
    } else {
      delete positions[symbol];
    }
    cash = cents(cash + total - fees - tax);
  }

  const transaction: Transaction = {
    id: order.id ?? `${date}-${Math.random().toString(36).slice(2, 8)}`,
    side,
    symbol,
    name,
    shares,
    price,
    total,
    realizedPnL,
    date,
    source: order.source ?? 'manual',
    unitsAsOf,
  };
  // Leave optional fields out unless they're used, to keep saved data small.
  if (order.reason) {
    transaction.reason = order.reason;
  }
  if (order.automationId) {
    transaction.automationId = order.automationId;
  }
  if (fees) {
    transaction.fees = fees;
  }
  if (tax) {
    transaction.tax = tax;
  }
  if (shortTermGain !== undefined) {
    transaction.shortTermGain = shortTermGain;
  }
  // Keep the history newest first. A manual trade is always the newest, but
  // an automation catching up fills a past day's close, which may be older
  // than trades already in the list, so insert by date.
  const at = portfolio.transactions.findIndex(t => t.date <= date);
  const transactions =
    at === -1
      ? [...portfolio.transactions, transaction]
      : [
          ...portfolio.transactions.slice(0, at),
          transaction,
          ...portfolio.transactions.slice(at),
        ];
  return {
    portfolio: {...portfolio, cash, positions, transactions},
    transaction,
  };
};

// Converts lots bought before a split into post-split shares: a 10-for-1
// split turns 1 share at $1,000 into 10 shares at $100. The cost and value
// don't change. Applying the same split twice does nothing.
export const applySplit = (
  portfolio: Portfolio,
  split: AppliedSplit,
): Portfolio => {
  const alreadyApplied = portfolio.splits.some(
    s => s.symbol === split.symbol && s.date === split.date,
  );
  if (alreadyApplied || !(split.ratio > 0)) {
    return portfolio;
  }
  const positions = {...portfolio.positions};
  const position = positions[split.symbol];
  if (position) {
    const lots = position.lots.map(lot =>
      lot.unitsAsOf < split.date
        ? {
            ...lot,
            shares: roundShares(lot.shares * split.ratio),
            price: lot.price / split.ratio,
            unitsAsOf: split.date,
          }
        : lot,
    );
    positions[split.symbol] = buildPosition(
      position.symbol,
      position.name,
      lots,
    );
  }
  return {...portfolio, positions, splits: [...portfolio.splits, split]};
};

// Upgrades a portfolio saved by an older version of the app.
// Version 1 stored each position as total shares plus an average cost, and
// trades had no source. Each old position becomes a single lot dated at the
// first purchase of that stock.
export const migratePortfolio = (saved: any): Portfolio => {
  if ((saved?.version ?? 1) >= PORTFOLIO_VERSION) {
    return saved;
  }
  const transactions: Transaction[] = (saved.transactions ?? []).map(
    (t: any) => ({...t, source: t.source ?? 'manual'}),
  );
  const firstBuy = (symbol: string) => {
    const dates = transactions
      .filter(t => t.symbol === symbol && t.side === 'BUY')
      .map(t => t.date);
    return dates.length ? Math.min(...dates) : saved.createdAt ?? Date.now();
  };
  const positions: Record<string, Position> = {};
  for (const old of Object.values<any>(saved.positions ?? {})) {
    if (!(old.shares > 0)) {
      continue;
    }
    const date = firstBuy(old.symbol);
    positions[old.symbol] = buildPosition(old.symbol, old.name, [
      {
        shares: old.shares,
        price: old.avgCost,
        date,
        unitsAsOf: toMarketDate(date),
      },
    ]);
  }
  return {
    ...saved,
    version: PORTFOLIO_VERSION,
    positions,
    transactions,
    splits: saved.splits ?? [],
  };
};

export interface Holding {
  position: Position;
  quote?: Quote;
  price: number;
  value: number;
  cost: number;
  pnl: number;
  pnlPercent: number;
  dayChange: number;
}

export const toHolding = (position: Position, quote?: Quote): Holding => {
  // Until a quote arrives, value the position at cost.
  const price = quote?.price ?? position.avgCost;
  const value = price * position.shares;
  const cost = position.avgCost * position.shares;
  const pnl = value - cost;
  return {
    position,
    quote,
    price,
    value,
    cost,
    pnl,
    pnlPercent: cost ? (pnl / cost) * 100 : 0,
    dayChange: quote ? quote.change * position.shares : 0,
  };
};

export const summarize = (
  portfolio: Portfolio,
  quotes: Record<string, Quote | undefined>,
) => {
  const holdings = Object.values(portfolio.positions).map(position =>
    toHolding(position, quotes[position.symbol]),
  );
  const holdingsValue = sum(holdings.map(h => h.value));
  const cost = sum(holdings.map(h => h.cost));
  const totalValue = portfolio.cash + holdingsValue;
  const dayChange = sum(holdings.map(h => h.dayChange));
  const previousValue = totalValue - dayChange;
  const totalReturn = totalValue - portfolio.startingCash;
  return {
    holdings,
    cash: portfolio.cash,
    holdingsValue,
    totalValue,
    unrealizedPnL: holdingsValue - cost,
    unrealizedPercent: cost ? ((holdingsValue - cost) / cost) * 100 : 0,
    gain: sum(holdings.filter(h => h.pnl > 0).map(h => h.pnl)),
    loss: -sum(holdings.filter(h => h.pnl < 0).map(h => h.pnl)),
    dayChange,
    dayChangePercent: previousValue ? (dayChange / previousValue) * 100 : 0,
    totalReturn,
    totalReturnPercent: portfolio.startingCash
      ? (totalReturn / portfolio.startingCash) * 100
      : 0,
  };
};

export const tradingStats = (transactions: Transaction[]) => {
  const sells = transactions.filter(t => t.side === 'SELL');
  const wins = sells.filter(t => (t.realizedPnL ?? 0) > 0).length;
  return {
    totalTrades: transactions.length,
    winRate: sells.length ? (wins / sells.length) * 100 : 0,
    realizedPnL: cents(sum(sells.map(t => t.realizedPnL ?? 0))),
  };
};

// Cumulative realized P&L at the end of each of the last `days` days.
export const realizedPnLSeries = (
  transactions: Transaction[],
  days = 7,
  now = Date.now(),
) => {
  const sells = transactions.filter(t => t.side === 'SELL');
  const series: {label: string; value: number}[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayEnd = new Date(now);
    dayEnd.setHours(24, 0, 0, 0);
    dayEnd.setDate(dayEnd.getDate() - i);
    const day = new Date(dayEnd.getTime() - 1);
    series.push({
      label: `${day.getDate()}/${day.getMonth() + 1}`,
      value: cents(
        sum(
          sells
            .filter(t => t.date < dayEnd.getTime())
            .map(t => t.realizedPnL ?? 0),
        ),
      ),
    });
  }
  return series;
};

// Symbols whose prices are needed to value the portfolio over time.
export const tradedSymbols = (portfolio: Portfolio) => [
  ...new Set(portfolio.transactions.map(t => t.symbol)),
];

// How many of today's shares one share from a trade has become, after the
// splits that happened since its price was quoted.
const splitFactor = (portfolio: Portfolio, trade: Transaction) => {
  const unitsAsOf = trade.unitsAsOf ?? toMarketDate(trade.date);
  return portfolio.splits
    .filter(s => s.symbol === trade.symbol && s.date > unitsAsOf)
    .reduce((factor, s) => factor * s.ratio, 1);
};

// Replays the trades over `timeline`, valuing shares at each symbol's last
// known price at that moment (or the trade price before any data point).
// Chart prices are split-adjusted, so trade shares are converted to today's
// shares to match.
export const portfolioHistory = (
  portfolio: Portfolio,
  prices: Record<string, ChartPoint[]>,
  timeline: number[],
): ChartPoint[] => {
  const trades = [...portfolio.transactions].sort((a, b) => a.date - b.date);
  const shares: Record<string, number> = {};
  const lastPrice: Record<string, number> = {};
  const cursors: Record<string, number> = {};
  let cash = portfolio.startingCash;
  let next = 0;

  return [...timeline]
    .sort((a, b) => a - b)
    .map(t => {
      while (next < trades.length && trades[next].date <= t) {
        const trade = trades[next++];
        const factor = splitFactor(portfolio, trade);
        const costs = (trade.fees ?? 0) + (trade.tax ?? 0);
        if (trade.side === 'BUY') {
          cash -= trade.total + costs;
          shares[trade.symbol] =
            (shares[trade.symbol] ?? 0) + trade.shares * factor;
        } else {
          cash += trade.total - costs;
          shares[trade.symbol] =
            (shares[trade.symbol] ?? 0) - trade.shares * factor;
        }
        if (lastPrice[trade.symbol] === undefined) {
          lastPrice[trade.symbol] = trade.price / factor;
        }
      }
      let value = cash;
      for (const [symbol, count] of Object.entries(shares)) {
        const points = prices[symbol] ?? [];
        let cursor = cursors[symbol] ?? 0;
        while (cursor < points.length && points[cursor].t <= t) {
          lastPrice[symbol] = points[cursor].value;
          cursor++;
        }
        cursors[symbol] = cursor;
        value += count * (lastPrice[symbol] ?? 0);
      }
      return {t, value: cents(value)};
    });
};
