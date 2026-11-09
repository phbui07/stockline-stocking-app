import type {MarketDate} from './dates';
import type {TradeReason} from '../portfolio';

// What every trading strategy looks like to the rest of the app. A
// strategy is a set of settings plus a `decide` function. On each day it gets
// the price history up to and including that day, never later, and says
// BUY, SELL or HOLD, with a reason.
//
// To add a strategy (RSI, for example), write a file in strategies/ that
// exports one of these, and register it in strategies/index.ts. The
// backtester, the bots and the screens work with any strategy through this
// interface.

export interface PriceBar {
  date: MarketDate;
  close: number;
}

export type Action = 'BUY' | 'SELL' | 'HOLD';

export interface Decision {
  action: Action;
  reason: TradeReason;
}

// A line to draw on the price chart, such as a moving average.
export interface IndicatorLine {
  key: string;
  label: TradeReason; // translated like a reason, e.g. "50-day average"
  values: (number | undefined)[];
}

export interface Strategy<S> {
  id: string;
  defaults: S;
  // Problems with the settings, as codes the screens translate.
  validate: (settings: S) => string[];
  // How many days of prices it needs to decide: the longest lookback it uses.
  warmupBars: (settings: S) => number;
  // `history` ends today: history[history.length - 1] is today's bar. It
  // holds at most warmupBars days (see historyUpTo).
  // `holding` says whether the strategy already owns the stock.
  decide: (
    history: readonly PriceBar[],
    settings: S,
    holding: boolean,
  ) => Decision;
  indicators: (closes: number[], settings: S) => IndicatorLine[];
}

// What a strategy is shown on day i: the last `warmup` days up to and
// including day i, never a later one. Older days are left out because the
// strategy doesn't need them, and copying the whole history every day would
// make a 25-year backtest slow on a phone.
export const historyUpTo = <T>(bars: readonly T[], i: number, warmup: number) =>
  bars.slice(Math.max(0, i + 1 - warmup), i + 1);
