import {addDays, marketCloseTime, MarketDate} from './dates';
import {nextOccurrence, RecurringRule} from './recurring';
import type {DailyHistory} from '../data/types';
import {
  applySplit,
  executeOrder,
  maxAffordableShares,
  Portfolio,
  TradeReason,
  Transaction,
} from '../portfolio';

// The runner brings automations up to date. The app can't run while it's
// closed, so each time it opens, the runner replays every finished trading
// day it missed, in order, and fills each automated trade at that day's
// close. Replaying day by day means a Monday purchase spends cash before a
// Wednesday one, as it would have in real time. The backtester (Phase 4)
// will reuse this same loop.
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
  histories: Record<string, DailyHistory>;
  through: MarketDate; // the last finished trading day
  // The day the histories were downloaded. Downloaded prices are in that
  // day's shares (see Lot in portfolio.ts).
  unitsAsOf: MarketDate;
}

export interface RunResult {
  portfolio: Portfolio;
  recurring: RecurringRule[];
  trades: Transaction[];
  events: AutomationEvent[];
}

// Which prices a run needs: symbol -> the first date to download.
// - Active recurring rules need prices from their next purchase date.
// - Held stocks need split events since their oldest lot was priced.
export const priceRequests = (
  portfolio: Portfolio,
  recurring: RecurringRule[],
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

export const runAutomations = ({
  portfolio,
  recurring,
  histories,
  through,
  unitsAsOf,
}: RunInput): RunResult => {
  let current = applyKnownSplits(portfolio, histories);
  const rules = recurring.map(rule => ({...rule}));
  const trades: Transaction[] = [];
  const events: AutomationEvent[] = [];

  // closes.get('SPY').get('2026-11-09') → that day's close.
  const closes = new Map<string, Map<MarketDate, number>>();
  for (const history of Object.values(histories)) {
    closes.set(
      history.symbol,
      new Map(history.bars.map(bar => [bar.date, bar.close])),
    );
  }

  // Oldest rule first, so when two buys land on the same day, the older
  // rule gets the cash first.
  const active = rules
    .filter(rule => !rule.paused)
    .sort((a, b) => a.createdAt - b.createdAt);
  if (!active.length) {
    return {portfolio: current, recurring: rules, trades, events};
  }
  const start = active.reduce(
    (earliest, rule) => (rule.nextDate < earliest ? rule.nextDate : earliest),
    active[0].nextDate,
  );
  const days = [
    ...new Set(
      Object.values(histories).flatMap(history =>
        history.bars.map(bar => bar.date),
      ),
    ),
  ]
    .filter(day => day >= start && day <= through)
    .sort();

  for (const day of days) {
    for (const rule of active) {
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
  }
  return {portfolio: current, recurring: rules, trades, events};
};
