import {MarketDate} from '../services/engine/dates';
import {RecurringRule} from '../services/engine/recurring';
import {RiskRule} from '../services/engine/risk';
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
  risk: RiskRule[] = [],
) =>
  runAutomations({
    portfolio,
    recurring,
    risk,
    histories: Object.fromEntries(histories.map(h => [h.symbol, h])),
    through,
    unitsAsOf: '2026-11-09',
  });

const riskRule = (overrides: Partial<RiskRule> = {}): RiskRule => ({
  id: 'k1',
  symbol: 'AAPL',
  kind: 'stopLoss',
  percent: 10,
  createdAt: 1,
  startDate: '2026-11-02',
  status: 'active',
  ...overrides,
});

// You own 10 AAPL at $100 each, bought on Monday 26 Oct.
const holding = (cash = 0) =>
  executeOrder(createPortfolio(1000 + cash, 0), {
    side: 'BUY',
    symbol: 'AAPL',
    name: 'Apple',
    shares: 10,
    price: 100,
    date: Date.parse('2026-10-26T20:00:00Z'),
  }).portfolio;

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
    risk: [],
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
    [],
    '2026-11-09',
  );
  expect(requests).toEqual({
    SPY: '2026-11-02',
    AAPL: '2026-10-16', // splits after the lot was priced
  });
});

describe('risk rules', () => {
  // AAPL closes in this stretch. You bought on 26 Oct; the rules were
  // turned on later and start checking on 2 Nov.
  const aapl = (closes: [MarketDate, number][]) => history('AAPL', closes);

  it('stop-loss sells everything at the first close at or below the line', () => {
    // Average cost $100, 10% stop-loss → line at $90.
    const result = run(
      holding(),
      [],
      [
        aapl([
          ['2026-10-27', 85], // below the line, but before the rule existed
          ['2026-11-02', 95],
          ['2026-11-03', 91],
          ['2026-11-04', 88], // first close at or below $90
          ['2026-11-05', 80],
        ]),
      ],
      '2026-11-05',
      [riskRule()],
    );
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({
      id: 'risk:k1',
      side: 'SELL',
      shares: 10,
      price: 88, // the close, below the $90 line: a one-day drop sells past it
      realizedPnL: -120,
      source: 'risk',
      reason: {
        code: 'stopLoss',
        params: {percent: 10, close: 88, reference: 100},
      },
      date: Date.parse('2026-11-04T21:00:00Z'),
    });
    expect(result.portfolio.positions.AAPL).toBeUndefined();
    expect(result.portfolio.cash).toBe(880);
    expect(result.risk[0]).toMatchObject({
      status: 'triggered',
      endedOn: '2026-11-04',
      checkedThrough: '2026-11-04',
      tradeId: 'risk:k1',
    });
  });

  it('never acts on a close from before the rule existed', () => {
    // A recurring rule makes the runner replay 27 Oct, when AAPL closed at
    // $85, below the stop-loss line. The stop-loss was only turned on later
    // (it starts 2 Nov), so selling at $85 would use hindsight.
    const result = run(
      holding(100),
      [rule({symbol: 'SPY', nextDate: '2026-10-27'})],
      [
        aapl([
          ['2026-10-27', 85],
          ['2026-11-02', 95],
        ]),
        history('SPY', [['2026-10-27', 100]]),
      ],
      '2026-11-02',
      [riskRule()],
    );
    expect(result.trades.map(t => [t.side, t.symbol])).toEqual([
      ['BUY', 'SPY'],
    ]);
    expect(result.risk[0]).toMatchObject({
      status: 'active',
      checkedThrough: '2026-11-02',
    });
  });

  it('take-profit sells at the first close at or above the line', () => {
    // 20% take-profit → line at $120. Touching it counts.
    const result = run(
      holding(),
      [],
      [
        aapl([
          ['2026-11-02', 110],
          ['2026-11-03', 120],
        ]),
      ],
      '2026-11-03',
      [riskRule({kind: 'takeProfit', percent: 20})],
    );
    expect(result.trades.map(t => [t.price, t.realizedPnL])).toEqual([
      [120, 200],
    ]);
  });

  it('trailing stop follows the highest close since you bought', () => {
    // 8% trailing stop. Highest close since 26 Oct:
    //   2 Nov $110 → line $101.20
    //   3 Nov $120 → line $110.40
    //   4 Nov $115 (high still $120, line $110.40) → holds
    //   5 Nov $110 ≤ $110.40 → sells, 8.33% below the $120 high
    const result = run(
      holding(),
      [],
      [
        aapl([
          ['2026-10-26', 100],
          ['2026-11-02', 110],
          ['2026-11-03', 120],
          ['2026-11-04', 115],
          ['2026-11-05', 110],
        ]),
      ],
      '2026-11-05',
      [riskRule({kind: 'trailingStop', percent: 8})],
    );
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({
      price: 110,
      realizedPnL: 100,
      reason: {params: {percent: 8, close: 110, reference: 120}},
      date: Date.parse('2026-11-05T21:00:00Z'),
    });
  });

  it('counts highs from before the rule was turned on', () => {
    // The spec measures from the highest close since purchase, so a peak
    // of $150 on 28 Oct counts even though the rule starts on 2 Nov.
    // 10% below $150 is $135, so the first close it checks ($130) sells.
    const result = run(
      holding(),
      [],
      [
        aapl([
          ['2026-10-28', 150],
          ['2026-11-02', 130],
        ]),
      ],
      '2026-11-02',
      [riskRule({kind: 'trailingStop', percent: 10})],
    );
    expect(result.trades.map(t => t.price)).toEqual([130]);
  });

  it('ends the other rules on the position when one sells it', () => {
    const result = run(
      holding(),
      [],
      [aapl([['2026-11-02', 85]])],
      '2026-11-02',
      [
        riskRule({id: 'take', kind: 'takeProfit', percent: 20}),
        riskRule({id: 'stop', kind: 'stopLoss', percent: 10}),
      ],
    );
    expect(result.risk.map(r => [r.id, r.status])).toEqual([
      ['take', 'ended'],
      ['stop', 'triggered'],
    ]);
  });

  it('never checks the same close twice', () => {
    // 2 Nov was already checked by an earlier run, when the rule was looser.
    // With the rule now at 4%, 2 Nov's $95 would be below the line, but a
    // checked close is never looked at again.
    const result = run(
      holding(),
      [],
      [
        aapl([
          ['2026-11-02', 95],
          ['2026-11-03', 99],
        ]),
      ],
      '2026-11-03',
      [riskRule({percent: 4, checkedThrough: '2026-11-02'})],
    );
    // 4% below $100 is $96: 3 Nov ($99) is fine, and 2 Nov ($95) is skipped.
    expect(result.trades).toEqual([]);
    expect(result.risk[0].checkedThrough).toBe('2026-11-03');
  });

  it('checks risk before recurring buys on the same day', () => {
    // The stop-loss sells the 10 shares held coming into 2 Nov; then the
    // weekly purchase buys $100 at the same close and starts a new position.
    const result = run(
      holding(100),
      [rule({symbol: 'AAPL', nextDate: '2026-11-02'})],
      [aapl([['2026-11-02', 80]])],
      '2026-11-02',
      [riskRule()],
    );
    expect(result.trades.map(t => [t.side, t.shares])).toEqual([
      ['SELL', 10],
      ['BUY', 1.25],
    ]);
    expect(result.portfolio.positions.AAPL.shares).toBe(1.25);
    expect(result.risk[0].status).toBe('triggered');
  });

  it('ends a rule whose position was sold some other way', () => {
    const result = run(
      createPortfolio(1000, 0),
      [],
      [aapl([['2026-11-02', 85]])],
      '2026-11-02',
      [riskRule()],
    );
    expect(result.trades).toEqual([]);
    expect(result.risk[0]).toMatchObject({
      status: 'ended',
      endedOn: '2026-11-02',
    });
  });

  it('does not sell twice if the rules weren’t saved after a run', () => {
    const prices = [aapl([['2026-11-02', 85]])];
    const first = run(holding(), [], prices, '2026-11-02', [riskRule()]);
    // The portfolio was saved with the sale, the rule wasn't.
    const again = run(first.portfolio, [], prices, '2026-11-02', [riskRule()]);
    expect(again.trades).toEqual([]);
    expect(again.risk[0].status).toBe('ended'); // no position left
  });

  it('priceRequests asks a trailing stop for closes since the purchase', () => {
    const requests = priceRequests(
      holding(),
      [],
      [riskRule({kind: 'trailingStop', percent: 8})],
      '2026-11-05',
    );
    expect(requests.AAPL).toBe('2026-10-26');
    // A stop-loss only needs the closes it hasn't checked yet, but the held
    // lot asks for split events from the day after it was priced.
    expect(priceRequests(holding(), [], [riskRule()], '2026-11-05').AAPL).toBe(
      '2026-10-27',
    );
  });
});
