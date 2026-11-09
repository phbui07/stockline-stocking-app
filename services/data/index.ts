import {lastCompletedMarketDate, MarketDate, minDate} from '../engine/dates';
import {withCache} from './cachedProvider';
import {emptyHistory, DailyHistory, DailyPriceProvider} from './types';
import {yahooProvider} from './yahooProvider';

// Where the automation engine gets daily prices. Exactly one provider is
// active; tests (and, later, an offline sample-data mode) swap it out.

export * from './types';

let active: DailyPriceProvider = withCache(yahooProvider);

export const setPriceProvider = (provider: DailyPriceProvider) => {
  active = provider;
};

export const getPriceProvider = () => active;

// Daily history up to `to`, but never including a day whose close isn't
// final yet. While the market is open, today's "close" is just the latest
// price and would change. Automations must only act on finished days.
export const getDailyHistory = (
  symbol: string,
  from: MarketDate,
  to: MarketDate,
  now = Date.now(),
): Promise<DailyHistory> => {
  const end = minDate(to, lastCompletedMarketDate(now));
  if (from > end) {
    return Promise.resolve(emptyHistory(symbol));
  }
  return active.getDailyHistory(symbol, from, end);
};
