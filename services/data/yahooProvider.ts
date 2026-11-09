import {addDays, MarketDate, toMarketDate} from '../engine/dates';
import {getJSON} from '../marketData';
import {
  DailyBar,
  DailyHistory,
  DailyPriceProvider,
  PriceDataError,
  sliceHistory,
} from './types';

// Daily closes from Yahoo Finance's chart endpoint. Yahoo's `close` is
// already adjusted for splits and its `adjclose` also for dividends, which
// is exactly what DailyBar expects. Split and dividend events come along
// when we ask for events=div,split.

const CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

const toSeconds = (date: MarketDate) => Date.parse(`${date}T00:00:00Z`) / 1000;

const isPrice = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

export const parseYahooHistory = (
  symbol: string,
  result: any,
): DailyHistory => {
  const timestamps: number[] = result?.timestamp ?? [];
  const closes: unknown[] = result?.indicators?.quote?.[0]?.close ?? [];
  const adjCloses: unknown[] =
    result?.indicators?.adjclose?.[0]?.adjclose ?? [];

  // Yahoo stamps each daily bar with that day's opening time (9:30 am New
  // York), so converting it to a New York date gives the trading day. While
  // the market is open, the last bar can repeat a date, and the later one
  // wins.
  const byDate = new Map<MarketDate, DailyBar>();
  timestamps.forEach((seconds, i) => {
    const close = closes[i];
    if (!isPrice(close)) {
      return; // days with missing data come back as null
    }
    const adjClose = adjCloses[i];
    const date = toMarketDate(seconds * 1000);
    byDate.set(date, {
      date,
      close,
      adjClose: isPrice(adjClose) ? adjClose : close,
    });
  });

  const events = result?.events ?? {};
  return {
    symbol,
    bars: [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1)),
    splits: Object.values<any>(events.splits ?? {})
      .filter(split => split.numerator > 0 && split.denominator > 0)
      .map(split => ({
        date: toMarketDate(split.date * 1000),
        ratio: split.numerator / split.denominator,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
    dividends: Object.values<any>(events.dividends ?? {})
      .filter(dividend => dividend.amount > 0)
      .map(dividend => ({
        date: toMarketDate(dividend.date * 1000),
        amount: dividend.amount,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
  };
};

export const yahooProvider: DailyPriceProvider = {
  id: 'yahoo',
  async getDailyHistory(symbol, from, to) {
    // period2 is exclusive, so ask for one extra day.
    const url =
      `${CHART_URL}/${encodeURIComponent(symbol)}` +
      `?period1=${toSeconds(from)}&period2=${toSeconds(addDays(to, 1))}` +
      '&interval=1d&events=div,split';
    const data = await getJSON(url);
    const result = data?.chart?.result?.[0];
    if (!result) {
      throw new PriceDataError(`No daily prices for ${symbol}`);
    }
    // Trim anything Yahoo returns outside the requested dates.
    return sliceHistory(parseYahooHistory(symbol, result), from, to);
  },
};
