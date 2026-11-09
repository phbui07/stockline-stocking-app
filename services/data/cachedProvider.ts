import {MarketDate, maxDate, minDate} from '../engine/dates';
import {readJSON, removeKey, writeJSON} from '../storage';
import {DailyHistory, DailyPriceProvider, sliceHistory} from './types';

// Wraps a provider with a cache in memory and on the device, so reopening
// the app or re-running a backtest doesn't download the same years of prices
// again.
//
// Each symbol keeps one entry covering a date range. Asking for dates
// outside it downloads the combined range in one piece, rather than gluing
// two downloads together. That matters because adjusted prices change
// whenever a new split or dividend happens: pieces fetched on different days
// wouldn't line up.

interface CacheEntry {
  from: MarketDate;
  to: MarketDate;
  fetchedAt: number;
  history: DailyHistory;
}

// Re-download after this long, to pick up new dividends and splits.
export const FRESH_FOR_MS = 6 * 60 * 60 * 1000;
// Keep at most this many symbols on the device; the least recently used go.
export const MAX_CACHED_SYMBOLS = 25;

export const withCache = (
  inner: DailyPriceProvider,
  {
    now = Date.now,
    freshForMs = FRESH_FOR_MS,
    maxSymbols = MAX_CACHED_SYMBOLS,
  } = {},
): DailyPriceProvider => {
  const prefix = `stockline.prices.${inner.id}.`;
  const indexKey = `${prefix}index`; // symbol -> when it was last saved
  const memory = new Map<string, Promise<CacheEntry | null>>();
  // Screens that ask for the same prices at the same moment share a download.
  const inFlight = new Map<string, Promise<DailyHistory>>();

  const load = (symbol: string) => {
    let entry = memory.get(symbol);
    if (!entry) {
      entry = readJSON<CacheEntry | null>(prefix + symbol, null);
      memory.set(symbol, entry);
    }
    return entry;
  };

  const save = async (symbol: string, entry: CacheEntry) => {
    memory.set(symbol, Promise.resolve(entry));
    await writeJSON(prefix + symbol, entry);
    const index = await readJSON<Record<string, number>>(indexKey, {});
    index[symbol] = entry.fetchedAt;
    const newestFirst = Object.keys(index).sort((a, b) => index[b] - index[a]);
    for (const old of newestFirst.slice(maxSymbols)) {
      delete index[old];
      memory.delete(old);
      await removeKey(prefix + old);
    }
    await writeJSON(indexKey, index);
  };

  const download = (symbol: string, from: MarketDate, to: MarketDate) => {
    const key = `${symbol}:${from}:${to}`;
    let request = inFlight.get(key);
    if (!request) {
      request = inner
        .getDailyHistory(symbol, from, to)
        .then(async history => {
          await save(symbol, {from, to, fetchedAt: now(), history});
          return history;
        })
        .finally(() => inFlight.delete(key));
      inFlight.set(key, request);
    }
    return request;
  };

  return {
    id: inner.id,
    async getDailyHistory(symbol, from, to) {
      const entry = await load(symbol);
      const fresh = entry && now() - entry.fetchedAt < freshForMs;
      if (fresh && entry.from <= from && entry.to >= to) {
        return sliceHistory(entry.history, from, to);
      }
      const start = entry ? minDate(entry.from, from) : from;
      const end = entry ? maxDate(entry.to, to) : to;
      return sliceHistory(await download(symbol, start, end), from, to);
    },
  };
};
