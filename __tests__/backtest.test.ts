import {
  buyAndHold,
  runBacktest,
  validateBacktest,
} from '../services/engine/backtest';
import {annualReturn, maxDrawdown} from '../services/engine/metrics';
import {weekdaysFrom} from '../services/data/mockProvider';
import {STRATEGIES} from '../services/engine/strategies';
import {
  MaCrossSettings,
  maCrossover,
} from '../services/engine/strategies/maCrossover';
import type {BotInput} from '../services/engine/bots';
import type {DailyHistory, DividendEvent} from '../services/data/types';
import type {Strategy} from '../services/engine/strategy';

// Hand-checked series on consecutive weekdays from Monday 5 Jan 2026.
const DATES = weekdaysFrom('2026-01-05', 40);

const history = (
  closes: number[],
  dividends: DividendEvent[] = [],
  symbol = 'X',
): DailyHistory => ({
  symbol,
  bars: closes.map((close, i) => ({date: DATES[i], close, adjClose: close})),
  splits: [],
  dividends,
});

const bot = (
  settings: Partial<MaCrossSettings> = {},
  overrides: Partial<BotInput> = {},
): BotInput => ({
  symbol: 'X',
  name: 'X',
  strategy: 'maCross',
  // Price vs its 2-day average unless a test says otherwise.
  settings: {
    ...maCrossover.defaults,
    mode: 'price',
    slowLength: 2,
    ...settings,
  },
  exits: {},
  riskPercent: 100,
  ...overrides,
});

const run = (
  closes: number[],
  options: {
    bot?: BotInput;
    benchmark?: DailyHistory;
    dividends?: DividendEvent[];
    from?: string;
    costs?: {spreadPercent: number; taxPercent: number};
  } = {},
) =>
  runBacktest({
    bot: options.bot ?? bot(),
    history: history(closes, options.dividends),
    benchmark: options.benchmark,
    from: options.from ?? DATES[0],
    to: DATES[closes.length - 1],
    startingBalance: 1000,
    costs: options.costs,
  })!;

describe('a full run', () => {
  // Price vs its 2-day average, $1,000, all-in (100% risk, no stop):
  // day 0: warming up (needs 2 days)
  // day 1: 20 vs 15   → buy 50 shares at $20
  // day 2: 25 vs 22.5 → hold
  // day 3: 15 vs 20   → sell 50 at $15 = $750 (−25%)
  // day 4: 10 vs 12.5 → stay out
  // day 5: 20 vs 15   → buy 37.5 shares at $20
  // day 6: 30 vs 25   → hold: 37.5 × $30 = $1,125
  const closes = [10, 20, 25, 15, 10, 20, 30];
  const result = run(closes, {
    benchmark: history([100, 100, 100, 100, 100, 100, 110], [], 'SPY'),
  });

  it('replays the account day by day', () => {
    expect(result.equity).toEqual([1000, 1000, 1250, 750, 750, 750, 1125]);
    expect(
      result.transactions.map(t => [t.side, t.shares, t.price, t.total]),
    ).toEqual([
      ['BUY', 50, 20, 1000],
      ['SELL', 50, 15, 750],
      ['BUY', 37.5, 20, 750],
    ]);
  });

  it('reports return, drawdown, trades, win rate and time in the market', () => {
    const {stats} = result;
    expect(stats.strategy.totalReturn).toBeCloseTo(12.5, 10);
    // From $1,250 on day 2 down to $750 on day 3: −40%.
    expect(stats.strategy.maxDrawdown).toEqual({
      percent: -40,
      peakIndex: 2,
      troughIndex: 3,
    });
    expect(stats.strategy.annualReturn).toBeUndefined(); // under a year
    expect(stats.closedTrades).toBe(1);
    expect(stats.openTrades).toBe(1);
    expect(stats.wins).toBe(0);
    expect(stats.winRate).toBe(0);
    // Held at the close on days 1, 2, 5 and 6: 4 of 7 days.
    expect(stats.exposure).toBeCloseTo((4 / 7) * 100, 10);
  });

  it('lists each round trip with its reasons', () => {
    expect(result.trades).toMatchObject([
      {
        entryIndex: 1,
        entryPrice: 20,
        exitIndex: 3,
        exitPrice: 15,
        proceeds: 750,
        open: false,
        returnPercent: -25,
        entryReason: {code: 'maBuy'},
        exitReason: {code: 'maSell'},
      },
      {entryIndex: 5, entryPrice: 20, open: true, returnPercent: 50},
    ]);
  });

  it('compares against buy-and-hold and the index', () => {
    // 100 shares at $10, held to $30.
    expect(result.buyHold).toEqual([1000, 2000, 2500, 1500, 1000, 2000, 3000]);
    expect(result.stats.buyHold.totalReturn).toBeCloseTo(200, 10);
    expect(result.stats.buyHold.maxDrawdown.percent).toBeCloseTo(-60, 10);
    expect(result.stats.benchmark!.totalReturn).toBeCloseTo(10, 10);
  });

  it('gives the strategy’s lines over the same days', () => {
    expect(result.indicators[0].values).toEqual([
      undefined,
      15,
      22.5,
      20,
      12.5,
      15,
      25,
    ]);
  });
});

describe('no look-ahead', () => {
  it('only ever shows the strategy days up to the one it decides', () => {
    // A strategy that records what it was shown and never trades.
    const seen: {last: string; length: number}[] = [];
    const spy: Strategy<null> = {
      id: 'spy',
      defaults: null,
      validate: () => [],
      warmupBars: () => 3,
      decide: shown => {
        seen.push({last: shown[shown.length - 1].date, length: shown.length});
        return {action: 'HOLD', reason: {code: 'test'}};
      },
      indicators: () => [],
    };
    (STRATEGIES as any).spy = spy;
    try {
      run([1, 2, 3, 4, 5, 6], {bot: bot({}, {strategy: 'spy' as any})});
    } finally {
      delete (STRATEGIES as any).spy;
    }
    // One decision per day, each ending on that day, never longer than the
    // 3-day warm-up.
    expect(seen.map(s => s.last)).toEqual(DATES.slice(0, 6));
    expect(seen.every(s => s.length <= 3)).toBe(true);
  });

  it('gives identical results up to a day, whatever happens after it', () => {
    // Same prices through day 4, then a boom in one and a crash in the other.
    // If any later price leaked into an earlier decision, the first five
    // days would differ.
    const boom = run([10, 20, 25, 15, 10, 50, 60], {
      bot: bot({}, {exits: {stopLoss: 10, trailingStop: 15}}),
    });
    const crash = run([10, 20, 25, 15, 10, 5, 4], {
      bot: bot({}, {exits: {stopLoss: 10, trailingStop: 15}}),
    });
    expect(boom.equity.slice(0, 5)).toEqual(crash.equity.slice(0, 5));
    const upToDay4 = (r: typeof boom) =>
      r.transactions.filter(t => t.date <= Date.parse(`${DATES[4]}T23:00Z`));
    expect(upToDay4(boom)).toEqual(upToDay4(crash));
    // The runs do differ afterwards (from day 6; on day 5 one buys at $50 with
    // its $750, so both accounts are still worth $750).
    expect(boom.equity[6]).not.toBe(crash.equity[6]);
  });

  it('costs can’t see the future either', () => {
    // Tax depends on the year's other sales. Only earlier ones may count.
    const costs = {spreadPercent: 0.5, taxPercent: 30};
    const prices = [10, 20, 25, 30, 22, 26];
    const boom = run([...prices, 40, 50, 20], {costs});
    const crash = run([...prices, 8, 6, 30], {costs});
    expect(boom.equity.slice(0, 6)).toEqual(crash.equity.slice(0, 6));
    const upToDay5 = (r: typeof boom) =>
      r.transactions.filter(t => t.date <= Date.parse(`${DATES[5]}T23:00Z`));
    expect(upToDay5(boom)).toEqual(upToDay5(crash));
    expect(upToDay5(boom).some(t => t.tax)).toBe(true); // a taxed sale
  });
});

describe('exits', () => {
  it('a trailing stop sells, then the bot waits for its rule to reset', () => {
    // Price vs its 3-day average, 10% trailing stop:
    // day 2: 20 vs 13.67 → buy 50 at $20
    // day 3: high $30, line $27 → hold
    // day 4: $26 ≤ $27 → trailing stop sells at $26 = $1,300.
    //        The rule is still positive (26 vs 25.33), so it doesn't rebuy.
    // day 5: 27 vs 27.67 → the rule turns negative: ready again
    // day 6: 28 vs 27 → buy at $28
    const result = run([10, 11, 20, 30, 26, 27, 28], {
      bot: bot({slowLength: 3}, {exits: {trailingStop: 10}}),
    });
    expect(result.trades).toMatchObject([
      {
        entryIndex: 2,
        exitIndex: 4,
        exitPrice: 26,
        proceeds: 1300,
        returnPercent: expect.closeTo(30, 10),
        exitReason: {
          code: 'trailingStop',
          params: {percent: 10, close: 26, reference: 30},
        },
      },
      {entryIndex: 6, entryPrice: 28, open: true},
    ]);
  });

  it('sizes by risk and measures the stop from the entry price', () => {
    // $1,000, 1% risk, 8% stop → $10 at risk → $125 position = 6.25 shares
    // at $20. The stop line is $18.40; the next close is $18, past it, so
    // the loss is $12.50 (1.25%): a one-day drop can lose more than planned.
    const result = run([10, 20, 18, 18.3], {
      bot: bot({}, {exits: {stopLoss: 8}, riskPercent: 1}),
    });
    expect(result.trades[0]).toMatchObject({
      shares: 6.25,
      cost: 125,
      exitPrice: 18,
      proceeds: 112.5,
      exitReason: {code: 'stopLoss', params: {reference: 20}},
    });
    expect(result.equity[2]).toBe(987.5);
  });
});

describe('dividends', () => {
  it('buy-and-hold reinvests dividends at the ex-date close', () => {
    // 100 shares at $10; a $1 dividend buys 10 more at $10 → $1,100.
    const values = buyAndHold(
      DATES.slice(0, 3),
      history([10, 10, 10], [{date: DATES[1], amount: 1}]),
      1000,
    );
    expect(values).toEqual([1000, 1100, 1100]);
  });

  it('the bot reinvests while it holds, and not on the day it buys', () => {
    // Buys 50 at $20 on day 1. A $2 dividend on day 2 pays $100, which
    // buys 5 more shares: 55 × $20 = $1,100.
    const held = run([10, 20, 20, 20], {
      dividends: [{date: DATES[2], amount: 2}],
    });
    expect(held.equity[3]).toBe(1100);
    expect(held.trades[0].shares).toBe(55);
    expect(held.transactions.map(t => t.source)).toEqual(['bot', 'dividend']);
    expect(held.stats.closedTrades + held.stats.openTrades).toBe(1);

    // A dividend going ex on the buying day belongs to the previous owner.
    const sameDay = run([10, 20, 20, 20], {
      dividends: [{date: DATES[1], amount: 2}],
    });
    expect(sameDay.equity[3]).toBe(1000);
  });
});

describe('dates and benchmark', () => {
  it('starts when both the stock and the index have prices', () => {
    // The index's prices begin two weeks (10 trading days) in.
    const lateIndex: DailyHistory = {
      symbol: 'SPY',
      bars: [100, 100, 100, 110].map((close, i) => ({
        date: DATES[i + 10],
        close,
        adjClose: close,
      })),
      splits: [],
      dividends: [],
    };
    const closes = Array.from({length: 14}, (_, i) => 10 + i);
    const result = run(closes, {benchmark: lateIndex});
    expect(result.dates[0]).toBe(DATES[10]);
    expect(result.startedLate).toBe(true);
  });

  it('a start date on a weekend is not “late”', () => {
    // Saturday 3 Jan; the first trading day is Monday 5 Jan.
    const result = run([10, 20, 25, 15], {from: '2026-01-03'});
    expect(result.dates[0]).toBe('2026-01-05');
    expect(result.startedLate).toBe(false);
  });

  it('carries the index’s last close over a day it didn’t trade', () => {
    const gap: DailyHistory = {
      symbol: 'SPY',
      bars: [
        {date: DATES[0], close: 100, adjClose: 100},
        {date: DATES[2], close: 120, adjClose: 120},
      ],
      splits: [],
      dividends: [],
    };
    expect(buyAndHold(DATES.slice(0, 3), gap, 1000)).toEqual([
      1000, 1000, 1200,
    ]);
  });

  it('returns nothing when the range has fewer than two days', () => {
    expect(
      runBacktest({
        bot: bot(),
        history: history([10, 11]),
        from: DATES[1],
        to: DATES[1],
        startingBalance: 1000,
      }),
    ).toBeNull();
  });

  it('validateBacktest checks the range and balance', () => {
    expect(validateBacktest('2020-01-01', '2021-01-01', 1000)).toEqual([]);
    expect(validateBacktest('2021-01-01', '2020-01-01', 50)).toEqual([
      'range',
      'balance',
    ]);
  });
});

describe('metrics', () => {
  it('maxDrawdown finds the largest drop from a peak', () => {
    expect(maxDrawdown([1000, 1250, 750, 1125]).percent).toBe(-40);
    expect(maxDrawdown([1, 2, 3]).percent).toBe(0);
  });

  it('annualReturn spreads a total return over the years', () => {
    // 21% over two years is 10% a year (1.1 × 1.1 = 1.21).
    expect(annualReturn(100, 121, '2020-01-01', '2021-12-31')).toBeCloseTo(
      10,
      1,
    );
    expect(annualReturn(100, 121, '2020-01-01', '2020-06-01')).toBeUndefined();
  });
});

it('runs 25 years of daily prices quickly', () => {
  // About 6,300 trading days with a 20/50-day crossover and a 200-day
  // trend filter. This would take far longer if every day copied the
  // whole history.
  const dates = weekdaysFrom('2000-01-03', 6300);
  const closes = dates.map((_, i) => 100 + 30 * Math.sin(i / 40) + i / 50);
  const long: DailyHistory = {
    symbol: 'X',
    bars: dates.map((date, i) => ({
      date,
      close: closes[i],
      adjClose: closes[i],
    })),
    splits: [],
    dividends: [],
  };
  const started = Date.now();
  const result = runBacktest({
    bot: bot(
      {mode: 'cross', fastLength: 20, slowLength: 50, trendFilter: true},
      {exits: {trailingStop: 10}},
    ),
    history: long,
    from: dates[0],
    to: dates[dates.length - 1],
    startingBalance: 10000,
  })!;
  expect(result.dates).toHaveLength(6300);
  expect(result.stats.closedTrades).toBeGreaterThan(10);
  expect(Date.now() - started).toBeLessThan(2000);
});
