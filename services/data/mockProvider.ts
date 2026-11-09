import {addDays, isWeekday, MarketDate} from '../engine/dates';
import {adjustForDividends} from './adjust';
import {SAMPLE_DATA} from './sampleData';
import {
  DailyHistory,
  DailyPriceProvider,
  DividendEvent,
  PriceDataError,
  sliceHistory,
  SplitEvent,
} from './types';

// A price provider that serves hardcoded prices, so features can be built
// and tested without a network. Tests pass their own small series; the app
// can use the bundled sample data in sampleData.ts.

export interface MockSeries {
  // Either explicit dates, or a start date that's expanded to consecutive
  // weekdays (one per close).
  dates?: MarketDate[];
  start?: MarketDate;
  closes: number[];
  splits?: SplitEvent[];
  dividends?: DividendEvent[];
}

export const weekdaysFrom = (start: MarketDate, count: number) => {
  const dates: MarketDate[] = [];
  for (let date = start; dates.length < count; date = addDays(date, 1)) {
    if (isWeekday(date)) {
      dates.push(date);
    }
  }
  return dates;
};

const toHistory = (symbol: string, series: MockSeries): DailyHistory => {
  const dates =
    series.dates ??
    weekdaysFrom(series.start ?? '2024-01-02', series.closes.length);
  if (dates.length !== series.closes.length) {
    throw new Error(
      `Mock series for ${symbol} has mismatched dates and closes`,
    );
  }
  const dividends = series.dividends ?? [];
  return {
    symbol,
    bars: adjustForDividends(
      series.closes.map((close, i) => ({date: dates[i], close})),
      dividends,
    ),
    splits: series.splits ?? [],
    dividends,
  };
};

export class MockPriceProvider implements DailyPriceProvider {
  readonly id = 'mock';
  private histories = new Map<string, DailyHistory>();
  calls = 0; // how many requests were made, so tests can check caching

  constructor(data: Record<string, MockSeries> = SAMPLE_DATA) {
    for (const [symbol, series] of Object.entries(data)) {
      this.histories.set(symbol, toHistory(symbol, series));
    }
  }

  async getDailyHistory(symbol: string, from: MarketDate, to: MarketDate) {
    this.calls++;
    const history = this.histories.get(symbol);
    if (!history) {
      throw new PriceDataError(`No sample data for ${symbol}`);
    }
    return sliceHistory(history, from, to);
  }
}
