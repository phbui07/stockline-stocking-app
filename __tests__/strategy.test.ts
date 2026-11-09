import {averageOfLast, movingAverage} from '../services/engine/indicators';
import {
  MaCrossSettings,
  maCrossover,
} from '../services/engine/strategies/maCrossover';
import {signalHistory} from '../services/engine/signals';
import {positionBudget, positionShares} from '../services/engine/sizing';
import {stopDistance, validateBot} from '../services/engine/bots';
import type {PriceBar, Strategy} from '../services/engine/strategy';

// Bars on consecutive made-up dates, from a list of closes.
const bars = (closes: number[]): PriceBar[] =>
  closes.map((close, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    close,
  }));

const settings = (
  overrides: Partial<MaCrossSettings> = {},
): MaCrossSettings => ({
  ...maCrossover.defaults,
  ...overrides,
});
const decide = (
  closes: number[],
  overrides: Partial<MaCrossSettings>,
  holding = false,
) => maCrossover.decide(bars(closes), settings(overrides), holding);

describe('moving averages', () => {
  it('movingAverage averages the last N values', () => {
    expect(movingAverage([1, 2, 3, 4], 3)).toEqual([
      undefined,
      undefined,
      2, // (1 + 2 + 3) / 3
      3, // (2 + 3 + 4) / 3
    ]);
  });

  it('averageOfLast needs enough bars', () => {
    expect(averageOfLast(bars([1, 2, 3, 4]), 2)).toBe(3.5);
    expect(averageOfLast(bars([1, 2]), 3)).toBeUndefined();
  });
});

describe('moving-average crossover', () => {
  it('price mode buys when the close is above its average', () => {
    // 3-day average of 10, 10, 10 is 10: the close isn't above it.
    expect(decide([10, 10, 10], {mode: 'price', slowLength: 3}).action).toBe(
      'HOLD',
    );
    // 10, 10, 13 → average 11, close 13 is above.
    expect(decide([10, 10, 13], {mode: 'price', slowLength: 3})).toEqual({
      action: 'BUY',
      reason: {
        code: 'maBuy',
        params: {mode: 'price', fast: 20, slow: 3, buffer: 0},
      },
    });
  });

  it('cross mode compares a short average with a long one', () => {
    // 2-day average 12.5 vs 3-day average 11.67 → buy.
    expect(
      decide([10, 12, 13], {mode: 'cross', fastLength: 2, slowLength: 3})
        .action,
    ).toBe('BUY');
    // While holding: 2-day 8.5 vs 3-day 9.33 → sell.
    expect(
      decide([11, 9, 8], {mode: 'cross', fastLength: 2, slowLength: 3}, true)
        .action,
    ).toBe('SELL');
  });

  it('only buys when not holding, and only sells when holding', () => {
    expect(
      decide([10, 10, 13], {mode: 'price', slowLength: 3}, true).action,
    ).toBe('HOLD');
    expect(decide([13, 10, 7], {mode: 'price', slowLength: 3}).action).toBe(
      'HOLD',
    );
  });

  it('the buffer needs a move of more than X% past the average', () => {
    const buffered = {mode: 'price' as const, slowLength: 3, bufferPercent: 10};
    // Average 10.5, so buying needs a close above 10.5 × 1.1 = 11.55.
    expect(decide([10, 10, 11.5], buffered).action).toBe('HOLD');
    // Average 10.67 → needs above 11.73; 12 is.
    expect(decide([10, 10, 12], buffered).action).toBe('BUY');
    // Holding, average 11.5 → selling needs below 11.5 × 0.9 = 10.35.
    expect(decide([12, 12, 10.5], buffered, true).action).toBe('HOLD');
    // Average 11.33 → needs below 10.2; 10 is.
    expect(decide([12, 12, 10], buffered, true).action).toBe('SELL');
  });

  it('the trend filter blocks buys below the long average', () => {
    const filtered = {
      mode: 'price' as const,
      slowLength: 2,
      trendFilter: true,
      trendLength: 4,
    };
    // 2-day average 11, close 12 → a buy signal, but the 4-day average is
    // 13 and the close is below it.
    expect(decide([20, 10, 10, 12], filtered)).toEqual({
      action: 'HOLD',
      reason: {code: 'maTrendBlocked', params: {trend: 4}},
    });
    // 4-day average 10.5: the close is above, so it buys.
    expect(decide([10, 10, 10, 12], filtered).action).toBe('BUY');
    // It never forces a sell: holding below the trend line but above the
    // 2-day average just holds.
    expect(decide([20, 20, 10, 12], filtered, true).action).toBe('HOLD');
  });

  it('waits until it has enough history', () => {
    expect(decide([10, 11], {mode: 'price', slowLength: 3})).toEqual({
      action: 'HOLD',
      reason: {code: 'maWarmup', params: {days: 3}},
    });
    expect(maCrossover.warmupBars(settings({trendFilter: true}))).toBe(200);
    expect(maCrossover.warmupBars(settings())).toBe(50);
  });

  it('validate explains bad settings', () => {
    expect(maCrossover.validate(settings())).toEqual([]);
    expect(
      maCrossover.validate(settings({fastLength: 50, slowLength: 50})),
    ).toEqual(['fastLength']);
    // In price mode the short average isn't used, so it isn't checked.
    expect(
      maCrossover.validate(settings({mode: 'price', fastLength: 500})),
    ).toEqual([]);
    expect(maCrossover.validate(settings({slowLength: 1}))).toContain(
      'slowLength',
    );
    expect(maCrossover.validate(settings({bufferPercent: 25}))).toEqual([
      'buffer',
    ]);
    expect(
      maCrossover.validate(settings({trendFilter: true, trendLength: 0})),
    ).toEqual(['trendLength']);
  });

  it('draws one line per average it uses', () => {
    const closes = [1, 2, 3, 4];
    const keys = (overrides: Partial<MaCrossSettings>) =>
      maCrossover.indicators(closes, settings(overrides)).map(line => line.key);
    expect(keys({mode: 'price'})).toEqual(['slow']);
    expect(keys({mode: 'cross', trendFilter: true})).toEqual([
      'fast',
      'slow',
      'trend',
    ]);
  });
});

describe('signalHistory', () => {
  it('lists the buys and sells in order', () => {
    // Price vs its 2-day average, day by day (index: close vs average):
    // 1: 11 vs 10.5 → buy
    // 2: 10 vs 10.5 → sell (holding, and below)
    // 3:  9 vs 9.5  → stay out
    // 4: 10 vs 9.5  → buy
    // 5: 12 vs 11   → keep holding
    const signals = signalHistory(
      maCrossover,
      settings({mode: 'price', slowLength: 2}),
      bars([10, 11, 10, 9, 10, 12]),
    );
    expect(signals.map(s => [s.index, s.action])).toEqual([
      [1, 'BUY'],
      [2, 'SELL'],
      [4, 'BUY'],
    ]);
  });

  it('never shows the strategy a price from after the day it decides', () => {
    const lengths: number[] = [];
    const spy: Strategy<null> = {
      id: 'spy',
      defaults: null,
      validate: () => [],
      warmupBars: () => 1,
      decide: history => {
        lengths.push(history.length);
        return {action: 'HOLD', reason: {code: 'test'}};
      },
      indicators: () => [],
    };
    signalHistory(spy, null, bars([1, 2, 3, 4]));
    expect(lengths).toEqual([1, 2, 3, 4]); // day i sees i bars, never more

    // Two histories that only differ after day 4 give the same signals up
    // to day 4.
    const s = settings({mode: 'price', slowLength: 2});
    const a = signalHistory(maCrossover, s, bars([10, 11, 10, 9, 50, 60]));
    const b = signalHistory(maCrossover, s, bars([10, 11, 10, 9, 1, 2]));
    const upToDay4 = (list: typeof a) => list.filter(x => x.index <= 3);
    expect(upToDay4(a)).toEqual(upToDay4(b));
  });
});

describe('position sizing', () => {
  it('sizes so a stop-out loses at most X% of the account', () => {
    // $10,000, 1% risk, 8% stop → $100 at risk → $1,250 position.
    expect(
      positionBudget({
        equity: 10000,
        cash: 10000,
        riskPercent: 1,
        stopPercent: 8,
      }),
    ).toBe(1250);
    expect(
      positionShares(
        {equity: 10000, cash: 10000, riskPercent: 1, stopPercent: 8},
        50,
      ),
    ).toBe(25);
  });

  it('without a stop, invests at most X% of the account', () => {
    expect(positionBudget({equity: 10000, cash: 10000, riskPercent: 1})).toBe(
      100,
    );
  });

  it('never spends more than the cash', () => {
    // 5% risk with a 2% stop would mean a $25,000 position.
    expect(
      positionBudget({
        equity: 10000,
        cash: 6000,
        riskPercent: 5,
        stopPercent: 2,
      }),
    ).toBe(6000);
  });
});

describe('bots', () => {
  const input = {
    symbol: 'SPY',
    name: 'SPY',
    strategy: 'maCross' as const,
    settings: settings(),
    exits: {},
    riskPercent: 100,
  };

  it('validateBot checks the strategy, exits and sizing', () => {
    expect(validateBot(input)).toEqual([]);
    expect(
      validateBot({
        ...input,
        exits: {stopLoss: 95},
        riskPercent: 0,
        settings: settings({slowLength: 1}),
      }),
    ).toEqual(
      expect.arrayContaining(['slowLength', 'stopLoss', 'riskPercent']),
    );
  });

  it('stopDistance uses the closer of the two stops', () => {
    expect(stopDistance({})).toBeUndefined();
    expect(stopDistance({takeProfit: 20})).toBeUndefined();
    expect(stopDistance({stopLoss: 8, trailingStop: 5})).toBe(5);
  });
});
