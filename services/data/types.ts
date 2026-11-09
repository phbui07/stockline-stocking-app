import type {MarketDate} from '../engine/dates';

// The contract every source of daily prices follows. The automation engine
// only ever sees these types, so swapping Yahoo for another provider (or
// for hardcoded sample data in tests) changes nothing else.

export interface DailyBar {
  date: MarketDate;
  // The closing price, adjusted for splits: every bar is in today's shares,
  // so a 10-for-1 split doesn't look like a 90% crash. Use it for trading.
  close: number;
  // Also adjusted for dividends, as if each dividend were reinvested. Use
  // it to compare returns fairly ("total return").
  adjClose: number;
}

export interface SplitEvent {
  date: MarketDate; // first day the stock traded at the new share count
  ratio: number; // new shares per old share: 10 for a 10-for-1 split
}

export interface DividendEvent {
  date: MarketDate; // ex-dividend date: buyers from this day don't get it
  amount: number; // cash per share
}

export interface DailyHistory {
  symbol: string;
  bars: DailyBar[]; // oldest first, one per trading day
  splits: SplitEvent[];
  dividends: DividendEvent[];
}

export interface DailyPriceProvider {
  // Short name, used to keep each provider's cached data apart.
  readonly id: string;
  // Bars from `from` to `to`, both included (fewer if the stock is younger).
  getDailyHistory(
    symbol: string,
    from: MarketDate,
    to: MarketDate,
  ): Promise<DailyHistory>;
}

export class PriceDataError extends Error {}

export const emptyHistory = (symbol: string): DailyHistory => ({
  symbol,
  bars: [],
  splits: [],
  dividends: [],
});

// Keeps the bars and events that fall inside [from, to].
export const sliceHistory = (
  history: DailyHistory,
  from: MarketDate,
  to: MarketDate,
): DailyHistory => {
  const inside = (date: MarketDate) => date >= from && date <= to;
  return {
    symbol: history.symbol,
    bars: history.bars.filter(bar => inside(bar.date)),
    splits: history.splits.filter(split => inside(split.date)),
    dividends: history.dividends.filter(dividend => inside(dividend.date)),
  };
};
