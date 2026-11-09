import AsyncStorage from '@react-native-async-storage/async-storage';
import {adjustForDividends} from '../services/data/adjust';
import {withCache} from '../services/data/cachedProvider';
import {
  getDailyHistory,
  getPriceProvider,
  PriceDataError,
  setPriceProvider,
} from '../services/data';
import {MockPriceProvider, weekdaysFrom} from '../services/data/mockProvider';
import {parseYahooHistory, yahooProvider} from '../services/data/yahooProvider';
import type {DailyPriceProvider} from '../services/data/types';

const utc = (iso: string) => Date.parse(`${iso}Z`);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('adjustForDividends', () => {
  const dates = ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08'];
  const bars = [100, 102, 101, 103].map((close, i) => ({
    date: dates[i],
    close,
  }));

  it('scales closes before the ex-date by 1 - dividend / previous close', () => {
    // $1 dividend going ex on day 3; the day before closed at 102, so the
    // factor is 1 - 1/102 = 101/102.
    const adjusted = adjustForDividends(bars, [{date: dates[2], amount: 1}]);
    expect(adjusted[0].adjClose).toBeCloseTo((100 * 101) / 102, 10);
    expect(adjusted[1].adjClose).toBeCloseTo(101, 10);
    expect(adjusted[2].adjClose).toBe(101); // from the ex-date on, unchanged
    expect(adjusted[3].adjClose).toBe(103);
    expect(adjusted.map(b => b.close)).toEqual([100, 102, 101, 103]);
  });

  it('multiplies the factors of several dividends', () => {
    // A second dividend of 2.02 going ex on day 4: factor 1 - 2.02/101 = 0.98,
    // applied to days 1 to 3.
    const adjusted = adjustForDividends(bars, [
      {date: dates[2], amount: 1},
      {date: dates[3], amount: 2.02},
    ]);
    expect(adjusted[0].adjClose).toBeCloseTo(((100 * 101) / 102) * 0.98, 10);
    expect(adjusted[1].adjClose).toBeCloseTo(98.98, 10);
    expect(adjusted[2].adjClose).toBeCloseTo(98.98, 10);
    expect(adjusted[3].adjClose).toBe(103);
  });

  it('ignores dividends outside the data', () => {
    const adjusted = adjustForDividends(bars, [
      {date: '2025-12-01', amount: 1},
      {date: '2026-02-01', amount: 1},
    ]);
    expect(adjusted.map(b => b.adjClose)).toEqual([100, 102, 101, 103]);
  });
});

describe('MockPriceProvider', () => {
  it('expands a start date into weekdays', () => {
    // Thursday 5 Nov 2026 → Thu, Fri, then Mon, Tue.
    expect(weekdaysFrom('2026-11-05', 4)).toEqual([
      '2026-11-05',
      '2026-11-06',
      '2026-11-09',
      '2026-11-10',
    ]);
  });

  it('returns only the requested dates', async () => {
    const provider = new MockPriceProvider({
      X: {start: '2026-11-05', closes: [10, 11, 12, 13]},
    });
    const history = await provider.getDailyHistory(
      'X',
      '2026-11-06',
      '2026-11-09',
    );
    expect(history.bars.map(b => [b.date, b.close])).toEqual([
      ['2026-11-06', 11],
      ['2026-11-09', 12],
    ]);
  });

  it('rejects symbols it has no data for', async () => {
    await expect(
      new MockPriceProvider({}).getDailyHistory(
        'NOPE',
        '2026-01-01',
        '2026-02-01',
      ),
    ).rejects.toBeInstanceOf(PriceDataError);
  });

  it('bundles two years of sample data, including a split', async () => {
    const provider = new MockPriceProvider();
    const spy = await provider.getDailyHistory(
      'SPY',
      '2000-01-01',
      '2030-01-01',
    );
    expect(spy.bars).toHaveLength(522);
    expect(spy.bars[0].date).toBe('2024-01-02');
    expect(spy.bars[521].date).toBe('2025-12-31');
    // Dividends make earlier adjusted closes lower than actual closes; after
    // the last ex-date they match.
    expect(spy.bars[0].adjClose).toBeLessThan(spy.bars[0].close);
    expect(spy.bars[521].adjClose).toBe(spy.bars[521].close);
    const nvda = await provider.getDailyHistory(
      'NVDA',
      '2024-01-01',
      '2024-12-31',
    );
    expect(nvda.splits).toEqual([{date: '2024-06-10', ratio: 10}]);
  });
});

describe('Yahoo provider', () => {
  // A trimmed copy of a real chart response around NVDA's 10-for-1 split.
  // Timestamps are each day's 9:30 am New York opening time.
  const result = {
    timestamp: [1717767000, 1718026200, 1718112600, 1718112600 + 86400],
    indicators: {
      quote: [{close: [120.888, 121.79, null, 125.2]}],
      adjclose: [{adjclose: [120.544, 121.444, null, 124.854]}],
    },
    events: {
      splits: {
        1718026200: {date: 1718026200, numerator: 10, denominator: 1},
      },
      dividends: {1718112600: {amount: 0.01, date: 1718112600}},
    },
  };

  it('parses bars, splits and dividends onto New York dates', () => {
    const history = parseYahooHistory('NVDA', result);
    expect(history.bars).toEqual([
      {date: '2024-06-07', close: 120.888, adjClose: 120.544},
      {date: '2024-06-10', close: 121.79, adjClose: 121.444},
      // 11 June had no price (null) and is dropped.
      {date: '2024-06-12', close: 125.2, adjClose: 124.854},
    ]);
    expect(history.splits).toEqual([{date: '2024-06-10', ratio: 10}]);
    expect(history.dividends).toEqual([{date: '2024-06-11', amount: 0.01}]);
  });

  it('keeps the later bar when a date repeats and falls back to close', () => {
    const history = parseYahooHistory('X', {
      timestamp: [1717767000, 1717767000 + 3600],
      indicators: {quote: [{close: [10, 11]}]},
    });
    expect(history.bars).toEqual([
      {date: '2024-06-07', close: 11, adjClose: 11},
    ]);
  });

  it('requests the date range with split and dividend events', async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({chart: {result: [result]}}),
      } as Response),
    );
    globalThis.fetch = fetchMock as any;
    const history = await yahooProvider.getDailyHistory(
      'NVDA',
      '2024-06-08',
      '2024-06-11',
    );
    const url = (fetchMock.mock.calls[0] as unknown as [string])[0];
    expect(url).toContain('/v8/finance/chart/NVDA?');
    expect(url).toContain(`period1=${utc('2024-06-08T00:00') / 1000}`);
    // The end is exclusive, so it asks up to the start of the next day.
    expect(url).toContain(`period2=${utc('2024-06-12T00:00') / 1000}`);
    expect(url).toContain('interval=1d&events=div,split');
    // Bars outside the requested dates are trimmed.
    expect(history.bars.map(b => b.date)).toEqual(['2024-06-10']);
  });
});

describe('withCache', () => {
  const series = {
    X: {start: '2026-01-05', closes: [10, 11, 12, 13, 14]}, // Mon–Fri
    Y: {start: '2026-01-05', closes: [20, 21, 22, 23, 24]},
  };

  it('downloads once and serves smaller ranges from the cache', async () => {
    const inner = new MockPriceProvider(series);
    const cached = withCache(inner);
    await cached.getDailyHistory('X', '2026-01-05', '2026-01-09');
    const part = await cached.getDailyHistory('X', '2026-01-06', '2026-01-07');
    expect(inner.calls).toBe(1);
    expect(part.bars.map(b => b.close)).toEqual([11, 12]);
  });

  it('downloads the combined range when asked for dates outside it', async () => {
    const inner = new MockPriceProvider(series);
    const spy = jest.spyOn(inner, 'getDailyHistory');
    const cached = withCache(inner);
    await cached.getDailyHistory('X', '2026-01-07', '2026-01-08');
    await cached.getDailyHistory('X', '2026-01-05', '2026-01-06');
    expect(spy).toHaveBeenLastCalledWith('X', '2026-01-05', '2026-01-08');
  });

  it('re-downloads once the data is stale', async () => {
    let time = 0;
    const inner = new MockPriceProvider(series);
    const cached = withCache(inner, {now: () => time, freshForMs: 1000});
    await cached.getDailyHistory('X', '2026-01-05', '2026-01-09');
    time = 999;
    await cached.getDailyHistory('X', '2026-01-05', '2026-01-09');
    expect(inner.calls).toBe(1);
    time = 1000;
    await cached.getDailyHistory('X', '2026-01-05', '2026-01-09');
    expect(inner.calls).toBe(2);
  });

  it('keeps data on the device between app launches', async () => {
    const first = new MockPriceProvider(series);
    await withCache(first).getDailyHistory('X', '2026-01-05', '2026-01-09');
    // A new cache instance has an empty memory, like a fresh launch.
    const second = new MockPriceProvider(series);
    const history = await withCache(second).getDailyHistory(
      'X',
      '2026-01-05',
      '2026-01-09',
    );
    expect(second.calls).toBe(0);
    expect(history.bars).toHaveLength(5);
  });

  it('forgets the least recently saved symbols beyond the limit', async () => {
    let time = 0;
    const cached = withCache(new MockPriceProvider(series), {
      now: () => ++time,
      maxSymbols: 1,
    });
    await cached.getDailyHistory('X', '2026-01-05', '2026-01-09');
    await cached.getDailyHistory('Y', '2026-01-05', '2026-01-09');
    expect(await AsyncStorage.getItem('stockline.prices.mock.X')).toBeNull();
    expect(
      await AsyncStorage.getItem('stockline.prices.mock.Y'),
    ).not.toBeNull();
  });
});

describe('getDailyHistory', () => {
  const original = getPriceProvider();
  afterEach(() => setPriceProvider(original));

  it('never returns a day whose close is not final', async () => {
    const calls: string[][] = [];
    const spy: DailyPriceProvider = {
      id: 'spy',
      getDailyHistory: async (symbol, from, to) => {
        calls.push([from, to]);
        return {symbol, bars: [], splits: [], dividends: []};
      },
    };
    setPriceProvider(spy);
    // Friday 6 Nov 2026 at 3 pm New York time: Friday isn't finished yet.
    const friday3pm = utc('2026-11-06T20:00');
    await getDailyHistory('X', '2026-11-01', '2026-11-06', friday3pm);
    expect(calls).toEqual([['2026-11-01', '2026-11-05']]);
  });

  it('returns nothing without asking when the range has no finished days', async () => {
    const provider = new MockPriceProvider({});
    setPriceProvider(provider);
    const history = await getDailyHistory(
      'X',
      '2026-11-06',
      '2026-11-06',
      utc('2026-11-06T20:00'),
    );
    expect(history.bars).toEqual([]);
    expect(provider.calls).toBe(0);
  });
});
