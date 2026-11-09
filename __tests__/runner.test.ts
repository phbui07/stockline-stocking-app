import {MarketDate} from '../services/engine/dates';
import {RecurringRule} from '../services/engine/recurring';
import {priceRequests, runAutomations} from '../services/engine/runner';
import type {DailyHistory, SplitEvent} from '../services/data/types';
import {createPortfolio, executeOrder, Portfolio} from '../services/portfolio';

// Small, hand-checked price series. Mondays in this stretch: 19 Oct,
// 26 Oct, 2 Nov and 9 Nov 2026.

const history = (
  symbol: string,
  bars: [MarketDate, number][],
  splits: SplitEvent[] = [],
): DailyHistory => ({
  symbol,
  bars: bars.map(([date, close]) => ({date, close, adjClose: close})),
  splits,
  dividends: [],
});

const rule = (overrides: Partial<RecurringRule> = {}): RecurringRule => ({
  id: 'r1',
  symbol: 'SPY',
  name: 'SPY',
  amount: 100,
  frequency: 'weekly',
  weekday: 1,
  dayOfMonth: 1,
  paused: false,
  nextDate: '2026-11-02',
  createdAt: 1,
  ...overrides,
});

const run = (
  portfolio: Portfolio,
  recurring: RecurringRule[],
  histories: DailyHistory[],
  through: MarketDate,
) =>
  runAutomations({
    portfolio,
    recurring,
    histories: Object.fromEntries(histories.map(h => [h.symbol, h])),
    through,
    unitsAsOf: '2026-11-09',
  });

describe('recurring purchases', () => {
  it('buys at the scheduled day’s close, rounded down to a millionth', () => {
    const result = run(
      createPortfolio(1000, 0),
      [rule()],
      [
        history('SPY', [
          ['2026-11-02', 300],
          ['2026-11-03', 301],
        ]),
      ],
      '2026-11-03',
    );
    // $100 / $300 = 0.333333… → 0.333333 shares, costing $99.9999 → $100.00.
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({
      id: 'recurring:r1:2026-11-02',
      side: 'BUY',
      shares: 0.333333,
      price: 300,
      total: 100,
      date: Date.parse('2026-11-02T21:00:00Z'), // 4 pm in New York
      source: 'recurring',
      reason: {
        code: 'recurringBuy',
        params: {amount: 100, frequency: 'weekly'},
      },
      automationId: 'r1',
      unitsAsOf: '2026-11-09',
    });
    expect(result.portfolio.cash).toBe(900);
    expect(result.recurring[0].nextDate).toBe('2026-11-09');
  });

  it('buys on the next trading day when the date is a weekend', () => {
    const result = run(
      createPortfolio(1000, 0),
      [rule({frequency: 'monthly', dayOfMonth: 7, nextDate: '2026-11-07'})],
      [
        history('SPY', [
          ['2026-11-06', 50], // Friday, before the scheduled Saturday
          ['2026-11-09', 40], // Monday
        ]),
      ],
      '2026-11-09',
    );
    expect(result.trades.map(t => [t.price, t.shares])).toEqual([[40, 2.5]]);
    expect(result.recurring[0].nextDate).toBe('2026-12-07');
  });

  it('catches up on missed weeks in order, each at its own close', () => {
    const result = run(
      createPortfolio(1000, 0),
      [rule({nextDate: '2026-10-19'})],
      [
        history('SPY', [
          ['2026-10-19', 100],
          ['2026-10-20', 90],
          ['2026-10-26', 80],
          ['2026-11-02', 125],
          ['2026-11-03', 130],
        ]),
      ],
      '2026-11-03',
    );
    // $100 each Monday: 1 share at $100, 1.25 at $80, 0.8 at $125.
    expect(result.trades.map(t => [t.price, t.shares])).toEqual([
      [100, 1],
      [80, 1.25],
      [125, 0.8],
    ]);
    const position = result.portfolio.positions.SPY;
    expect(position.shares).toBe(3.05);
    expect(result.portfolio.cash).toBe(700);
    // The point of dollar-cost averaging: the average cost ($300 / 3.05 =
    // $98.36) is below the average of the three prices ($101.67), because
    // the cheap week bought the most shares.
    expect(position.avgCost).toBeCloseTo(98.36, 2);
    expect(result.recurring[0].nextDate).toBe('2026-11-09');
  });

  it('skips a purchase when cash is short and says why', () => {
    const result = run(
      createPortfolio(150, 0),
      [rule({nextDate: '2026-10-19'})],
      [
        history('SPY', [
          ['2026-10-19', 100],
          ['2026-10-26', 100],
        ]),
      ],
      '2026-10-30',
    );
    expect(result.trades).toHaveLength(1);
    expect(result.portfolio.cash).toBe(50);
    expect(result.events).toEqual([
      {
        id: 'skip:r1:2026-10-26',
        kind: 'skipped',
        automationId: 'r1',
        symbol: 'SPY',
        date: '2026-10-26',
        reason: {code: 'recurringSkippedCash', params: {amount: 100, cash: 50}},
      },
    ]);
    expect(result.recurring[0].nextDate).toBe('2026-11-02');
  });

  it('gives the older rule the cash first when two are due the same day', () => {
    const result = run(
      createPortfolio(150, 0),
      [
        rule({id: 'newer', symbol: 'QQQ', createdAt: 2}),
        rule({id: 'older', symbol: 'SPY', createdAt: 1}),
      ],
      [
        history('SPY', [['2026-11-02', 100]]),
        history('QQQ', [['2026-11-02', 100]]),
      ],
      '2026-11-02',
    );
    expect(result.trades.map(t => t.automationId)).toEqual(['older']);
    expect(result.events.map(e => e.automationId)).toEqual(['newer']);
  });

  it('ignores paused rules', () => {
    const result = run(
      createPortfolio(1000, 0),
      [rule({paused: true})],
      [history('SPY', [['2026-11-02', 100]])],
      '2026-11-02',
    );
    expect(result.trades).toEqual([]);
    expect(result.recurring[0].nextDate).toBe('2026-11-02');
  });

  it('never acts on a day after `through`', () => {
    const result = run(
      createPortfolio(1000, 0),
      [rule({nextDate: '2026-11-04'})],
      [history('SPY', [['2026-11-04', 100]])], // a price for a day not yet finished
      '2026-11-03',
    );
    expect(result.trades).toEqual([]);
  });

  it('does not buy twice if the rules weren’t saved after a run', () => {
    const rules = [rule()];
    const prices = [history('SPY', [['2026-11-02', 100]])];
    const first = run(createPortfolio(1000, 0), rules, prices, '2026-11-02');
    // Same rules as before (as if the app closed before saving them), but
    // the portfolio already has the purchase.
    const again = run(first.portfolio, rules, prices, '2026-11-02');
    expect(again.trades).toEqual([]);
    expect(again.portfolio.cash).toBe(900);
    expect(again.recurring[0].nextDate).toBe('2026-11-09');
  });

  it('returns the same portfolio object when nothing happened', () => {
    const portfolio = createPortfolio(1000, 0);
    const result = run(portfolio, [rule()], [], '2026-11-02');
    expect(result.portfolio).toBe(portfolio);
  });
});

it('converts lots bought before a split, but not ones priced after it', () => {
  // You bought 1 share at $1,000 before a 10-for-1 split. A recurring
  // purchase on the split day used post-split prices.
  const portfolio = executeOrder(createPortfolio(2000, 0), {
    side: 'BUY',
    symbol: 'NVDA',
    name: 'NVDA',
    shares: 1,
    price: 1000,
    unitsAsOf: '2024-06-05',
  }).portfolio;
  const result = runAutomations({
    portfolio,
    recurring: [rule({symbol: 'NVDA', nextDate: '2024-06-10'})],
    histories: {
      NVDA: history(
        'NVDA',
        [['2024-06-10', 120]],
        [{date: '2024-06-10', ratio: 10}],
      ),
    },
    through: '2024-06-10',
    unitsAsOf: '2024-06-12',
  });
  // $100 / $120 = 0.833333 shares, plus the 10 converted shares.
  expect(
    result.portfolio.positions.NVDA.lots.map(l => [l.shares, l.price]),
  ).toEqual([
    [10, 100],
    [0.833333, 120],
  ]);
  expect(result.portfolio.positions.NVDA.shares).toBe(10.833333);
});

it('priceRequests asks for what rules and held lots need', () => {
  const portfolio = executeOrder(createPortfolio(1000, 0), {
    side: 'BUY',
    symbol: 'AAPL',
    name: 'AAPL',
    shares: 1,
    price: 100,
    unitsAsOf: '2026-10-15',
  }).portfolio;
  const requests = priceRequests(
    portfolio,
    [
      rule({symbol: 'SPY', nextDate: '2026-11-02'}),
      rule({symbol: 'AAPL', nextDate: '2026-11-02'}),
      rule({symbol: 'QQQ', paused: true}),
      rule({symbol: 'VTI', nextDate: '2026-11-20'}), // not due yet
    ],
    '2026-11-09',
  );
  expect(requests).toEqual({
    SPY: '2026-11-02',
    AAPL: '2026-10-16', // splits after the lot was priced
  });
});
