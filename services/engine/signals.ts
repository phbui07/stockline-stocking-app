import type {Action, PriceBar, Strategy} from './strategy';
import type {TradeReason} from '../portfolio';

// Walks through history day by day and records where a strategy would have
// bought and sold. It only tracks whether the strategy is in or out: no
// money, sizing or exits yet (that's the backtester's job).
//
// No look-ahead: on day i the strategy gets a copy of bars 0..i only, so it
// can't see later prices even by accident.

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
  for (let i = strategy.warmupBars(settings) - 1; i < bars.length; i++) {
    const decision = strategy.decide(bars.slice(0, i + 1), settings, holding);
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
