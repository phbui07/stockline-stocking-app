import {addDays, marketCloseTime, MarketDate, toMarketDate} from './dates';
import {nextOccurrence, RecurringRule} from './recurring';
import {
  crossesLine,
  firstUnchecked,
  RISK_KINDS,
  riskLine,
  riskReference,
  RiskRule,
} from './risk';
import type {DailyHistory} from '../data/types';
import {
  applySplit,
  executeOrder,
  maxAffordableShares,
  Portfolio,
  Position,
  TradeReason,
  Transaction,
} from '../portfolio';

// The runner brings automations up to date. The app can't run while it's
// closed, so each time it opens, the runner replays every finished trading
// day it missed, in order, and fills each automated trade at that day's
// close. Replaying day by day means Monday's trades happen before
// Wednesday's, as they would have in real time. The backtester (Phase 4)
// will reuse this same loop.
//
// Each day it does, in this order:
// 1. Risk rules: check the positions you held coming into the day.
// 2. Recurring purchases.
//
// It's a pure function: prices come in, an updated portfolio and rules come
// out. Downloading prices and saving results happen in automation.tsx.

// Something an automation did that isn't a trade, such as a skipped
// purchase. Trades themselves are saved in the portfolio's transactions.
export interface AutomationEvent {
  id: string;
  kind: 'skipped';
  automationId: string;
  symbol: string;
  date: MarketDate;
  reason: TradeReason;
}

export interface RunInput {
  portfolio: Portfolio;
  recurring: RecurringRule[];
  risk: RiskRule[];
  histories: Record<string, DailyHistory>;
  through: MarketDate; // the last finished trading day
  // The day the histories were downloaded. Downloaded prices are in that
  // day's shares (see Lot in portfolio.ts).
  unitsAsOf: MarketDate;
}

export interface RunResult {
  portfolio: Portfolio;
  recurring: RecurringRule[];
  risk: RiskRule[];
  trades: Transaction[];
  events: AutomationEvent[];
}

// The day a position was opened: when its oldest remaining lot was bought.
const purchaseDate = (position: Position) =>
  toMarketDate(Math.min(...position.lots.map(lot => lot.date)));

// Which prices a run needs: symbol -> the first date to download.
// - Recurring rules need prices from their next purchase date.
// - Risk rules need prices from the next close they check. A trailing stop
//   also needs every close since the purchase, to find the highest one.
// - Held stocks need split events since their oldest lot was priced.
export const priceRequests = (
  portfolio: Portfolio,
  recurring: RecurringRule[],
  risk: RiskRule[],
  through: MarketDate,
): Record<string, MarketDate> => {
  const from: Record<string, MarketDate> = {};
  const want = (symbol: string, date: MarketDate) => {
    if (date <= through && (!from[symbol] || date < from[symbol])) {
      from[symbol] = date;
    }
  };
  recurring
    .filter(rule => !rule.paused)
    .forEach(rule => want(rule.symbol, rule.nextDate));
  risk
    .filter(rule => rule.status === 'active')
    .forEach(rule => {
      const position = portfolio.positions[rule.symbol];
      if (!position || firstUnchecked(rule) > through) {
        return; // nothing to check yet
      }
      want(
        rule.symbol,
        rule.kind === 'trailingStop'
          ? purchaseDate(position)
          : firstUnchecked(rule),
      );
    });
  Object.values(portfolio.positions).forEach(position =>
    position.lots.forEach(lot =>
      want(position.symbol, addDays(lot.unitsAsOf, 1)),
    ),
  );
  return from;
};

// Converts lots for any splits in the downloaded data. applySplit ignores
// splits it has already applied, so running this every time is safe.
const applyKnownSplits = (
  portfolio: Portfolio,
  histories: Record<string, DailyHistory>,
) => {
  let result = portfolio;
  for (const history of Object.values(histories)) {
    const traded = result.transactions.some(t => t.symbol === history.symbol);
    if (!traded) {
      continue;
    }
    for (const split of history.splits) {
      result = applySplit(result, {symbol: history.symbol, ...split});
    }
  }
  return result;
};

const earliest = (dates: MarketDate[]) =>
  dates.reduce((min, date) => (date < min ? date : min), dates[0]);

export const runAutomations = ({
  portfolio,
  recurring,
  risk,
  histories,
  through,
  unitsAsOf,
}: RunInput): RunResult => {
  let current = applyKnownSplits(portfolio, histories);
  const rules = recurring.map(rule => ({...rule}));
  const riskRules = risk.map(rule => ({...rule}));
  const trades: Transaction[] = [];
  const events: AutomationEvent[] = [];

  const bars = (symbol: string) => histories[symbol]?.bars ?? [];
  // closes.get('SPY').get('2026-11-09') → that day's close.
  const closes = new Map<string, Map<MarketDate, number>>();
  for (const history of Object.values(histories)) {
    closes.set(
      history.symbol,
      new Map(history.bars.map(bar => [bar.date, bar.close])),
    );
  }
  const highestClose = (symbol: string, from: MarketDate, to: MarketDate) =>
    Math.max(
      ...bars(symbol)
        .filter(bar => bar.date >= from && bar.date <= to)
        .map(bar => bar.close),
    );

  // Oldest rule first, so when two buys land on the same day, the older
  // rule gets the cash first.
  const activeRecurring = rules
    .filter(rule => !rule.paused)
    .sort((a, b) => a.createdAt - b.createdAt);
  // In RISK_KINDS order, so same-day triggers are reported predictably.
  const activeRisk = riskRules
    .filter(rule => rule.status === 'active')
    .sort(
      (a, b) =>
        RISK_KINDS.indexOf(a.kind) - RISK_KINDS.indexOf(b.kind) ||
        a.createdAt - b.createdAt,
    );

  const starts = [
    ...activeRecurring.map(rule => rule.nextDate),
    ...activeRisk.map(firstUnchecked),
  ];
  const days = starts.length
    ? [
        ...new Set(
          Object.values(histories).flatMap(history =>
            history.bars.map(bar => bar.date),
          ),
        ),
      ]
        .filter(day => day >= earliest(starts) && day <= through)
        .sort()
    : [];

  // Ends a symbol's other active rules once its position is gone.
  const endRules = (symbol: string, day: MarketDate) =>
    activeRisk
      .filter(rule => rule.symbol === symbol && rule.status === 'active')
      .forEach(rule => {
        rule.status = 'ended';
        rule.endedOn = day;
      });

  const checkRisk = (day: MarketDate) => {
    for (const rule of activeRisk) {
      const close = closes.get(rule.symbol)?.get(day);
      if (
        rule.status !== 'active' ||
        close === undefined ||
        firstUnchecked(rule) > day
      ) {
        continue;
      }
      const position = current.positions[rule.symbol];
      if (!position) {
        endRules(rule.symbol, day); // sold some other way
        continue;
      }
      const reference = riskReference(
        rule.kind,
        position.avgCost,
        highestClose(rule.symbol, purchaseDate(position), day),
      );
      const line = riskLine(rule.kind, rule.percent, reference);
      if (!crossesLine(rule.kind, close, line)) {
        rule.checkedThrough = day;
        continue;
      }
      // One sale per rule, so its id can't repeat. If an earlier run made
      // it but the rules weren't saved, just mark the rule as done.
      const id = `risk:${rule.id}`;
      if (!current.transactions.some(t => t.id === id)) {
        const result = executeOrder(current, {
          id,
          side: 'SELL',
          symbol: rule.symbol,
          name: position.name,
          shares: position.shares,
          price: close,
          date: marketCloseTime(day),
          source: 'risk',
          reason: {
            code: rule.kind,
            params: {percent: rule.percent, close, reference},
          },
          automationId: rule.id,
          unitsAsOf,
        });
        current = result.portfolio;
        trades.push(result.transaction);
      }
      rule.checkedThrough = day;
      rule.tradeId = id;
      endRules(rule.symbol, day);
      rule.status = 'triggered';
    }
  };

  const buyRecurring = (day: MarketDate) => {
    for (const rule of activeRecurring) {
      const close = closes.get(rule.symbol)?.get(day);
      if (close === undefined) {
        continue; // this stock didn't trade today (or we have no prices)
      }
      // Every scheduled date up to today that hasn't been handled buys now.
      // Usually that's one; after a long gap in the data it can be more.
      while (rule.nextDate <= day) {
        const scheduled = rule.nextDate;
        rule.nextDate = nextOccurrence(rule, scheduled);
        // The id is fixed per rule and date, so if a previous run already
        // made this purchase (and the app closed before saving the rule's
        // new date), it isn't bought twice.
        const id = `recurring:${rule.id}:${scheduled}`;
        if (current.transactions.some(t => t.id === id)) {
          continue;
        }
        if (current.cash < rule.amount) {
          events.push({
            id: `skip:${rule.id}:${scheduled}`,
            kind: 'skipped',
            automationId: rule.id,
            symbol: rule.symbol,
            date: day,
            reason: {
              code: 'recurringSkippedCash',
              params: {amount: rule.amount, cash: current.cash},
            },
          });
          continue;
        }
        const result = executeOrder(current, {
          id,
          side: 'BUY',
          symbol: rule.symbol,
          name: rule.name,
          // Rounded down, so the cost never goes over the amount.
          shares: maxAffordableShares(rule.amount, close),
          price: close,
          date: marketCloseTime(day),
          source: 'recurring',
          reason: {
            code: 'recurringBuy',
            params: {amount: rule.amount, frequency: rule.frequency},
          },
          automationId: rule.id,
          unitsAsOf,
        });
        current = result.portfolio;
        trades.push(result.transaction);
      }
    }
  };

  for (const day of days) {
    checkRisk(day);
    buyRecurring(day);
  }
  return {
    portfolio: current,
    recurring: rules,
    risk: riskRules,
    trades,
    events,
  };
};
