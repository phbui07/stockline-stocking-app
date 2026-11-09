import {historyUpTo} from './strategy';
import type {Action, PriceBar, Strategy} from './strategy';
import type {TradeReason} from '../portfolio';

// Walks through history day by day and records where a strategy would have
// bought and sold. It only tracks whether the strategy is in or out: no
// money, sizing or exits yet (that's the backtester's job).
//
// No look-ahead: on day i the strategy gets a copy of the days up to i only
// (see historyUpTo), so it can't see later prices even by accident.

export interface Signal {
  index: number; // position in `bars`
  date: string;
  action: Exclude<Action, 'HOLD'>;
  reason: TradeReason;
}

export const signalHistory = <S>(
  strategy: Strategy<S>,
  settings: S,
  bars: readonly PriceBar[],
): Signal[] => {
  const signals: Signal[] = [];
  let holding = false;
  const warmup = strategy.warmupBars(settings);
  for (let i = warmup - 1; i < bars.length; i++) {
    const decision = strategy.decide(
      historyUpTo(bars, i, warmup),
      settings,
      holding,
    );
    if (decision.action === 'HOLD') {
      continue;
    }
    signals.push({
      index: i,
      date: bars[i].date,
      action: decision.action,
      reason: decision.reason,
    });
    holding = decision.action === 'BUY';
  }
  return signals;
};
