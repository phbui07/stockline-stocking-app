import {
  hasCosts,
  isShortTerm,
  spreadFee,
  taxOnSale,
  taxYearSoFar,
  tradeCosts,
  validateCosts,
} from '../services/engine/costs';
import {marketCloseTime, MarketDate} from '../services/engine/dates';
import {
  affordableShares,
  buyCost,
  createPortfolio,
  executeOrder,
  Portfolio,
  Transaction,
} from '../services/portfolio';
import {runAutomations} from '../services/engine/runner';
import {runBacktest} from '../services/engine/backtest';
import {weekdaysFrom} from '../services/data/mockProvider';
import {maCrossover} from '../services/engine/strategies/maCrossover';
import type {DailyHistory} from '../services/data/types';

const TAX = {spreadPercent: 0, taxPercent: 24};

describe('the spread', () => {
  it('costs a percentage of each trade, to the cent', () => {
    expect(spreadFee(1000, 0.1)).toBe(1);
    expect(spreadFee(1234.56, 0.25)).toBe(3.09); // $3.0864
    expect(buyCost(10, 100, 0.1)).toBe(1001);
  });

  it('affordableShares leaves room for the spread', () => {
    // $1,001 at 0.1% buys $1,000 of shares plus $1 of spread.
    expect(affordableShares(1001, 10, 0.1)).toBe(100);
    // $51 at 1%: the first guess, 50.495049 shares, costs $50.50 + $0.51 =
    // $51.01 because both amounts round up. A cent less fits.
    expect(affordableShares(51, 1, 1)).toBe(50.485148);
    expect(buyCost(50.485148, 1, 1)).toBe(50.99);
    expect(affordableShares(100, 10)).toBe(10); // no spread
  });

  it('a buy adds the spread to the cost; a sale takes it from the proceeds', () => {
    const bought = executeOrder(createPortfolio(10000, 0), {
      side: 'BUY',
      symbol: 'X',
      name: 'X',
      shares: 10,
      price: 100,
      date: marketCloseTime('2026-01-05'),
      costs: {spreadPercent: 0.1, taxPercent: 0},
    });
    expect(bought.transaction).toMatchObject({total: 1000, fees: 1});
    expect(bought.portfolio.cash).toBe(8999);
    expect(bought.portfolio.positions.X.avgCost).toBeCloseTo(100.1, 10);
    const sold = executeOrder(bought.portfolio, {
      side: 'SELL',
      symbol: 'X',
      name: 'X',
      shares: 10,
      price: 110,
      date: marketCloseTime('2026-02-02'),
      costs: {spreadPercent: 0.1, taxPercent: 0},
    });
    // $1,100 − $1.10 spread − $1,001 cost = $97.90.
    expect(sold.transaction).toMatchObject({
      total: 1100,
      fees: 1.1,
      realizedPnL: 97.9,
      shortTermGain: 97.9,
    });
    expect(sold.transaction.tax).toBeUndefined();
    expect(sold.portfolio.cash).toBe(10097.9);
  });
});

describe('holding period', () => {
  it('a year or less is short-term', () => {
    expect(isShortTerm('2025-03-14', '2025-03-14')).toBe(true);
    expect(isShortTerm('2025-03-14', '2026-03-13')).toBe(true);
    expect(isShortTerm('2025-03-14', '2026-03-14')).toBe(true); // exactly a year
    expect(isShortTerm('2025-03-14', '2026-03-16')).toBe(false);
  });

  it('only the shares held a year or less count, oldest sold first', () => {
    let p = createPortfolio(10000, 0);
    const buy = (date: MarketDate, price: number) => {
      p = executeOrder(p, {
        side: 'BUY',
        symbol: 'X',
        name: 'X',
        shares: 5,
        price,
        date: marketCloseTime(date),
      }).portfolio;
    };
    buy('2024-01-02', 100); // long-term by the sale
    buy('2025-06-02', 120); // short-term
    const sale = executeOrder(p, {
      side: 'SELL',
      symbol: 'X',
      name: 'X',
      shares: 10,
      price: 130,
      date: marketCloseTime('2025-07-01'),
      costs: TAX,
    }).transaction;
    // Short-term: 5 × ($130 − $120) = $50, taxed at 24% = $12. The $150
    // long-term gain isn't taxed here.
    expect(sale).toMatchObject({shortTermGain: 50, tax: 12});
    expect(sale.realizedPnL).toBe(1300 - 1100 - 12);
  });
});

// A sale record, as taxYearSoFar reads them.
const sale = (date: MarketDate, gain: number, tax = 0): Transaction => ({
  id: date,
  side: 'SELL',
  symbol: 'X',
  name: 'X',
  shares: 1,
  price: 1,
  total: 1,
  date: marketCloseTime(date),
  source: 'manual',
  shortTermGain: gain,
  tax,
});

describe('short-term tax', () => {
  it('nets gains and losses within the year, giving tax back on a loss', () => {
    // At 24%: +$1,000 sets aside $240.
    expect(taxOnSale({gain: 0, paid: 0, carry: 0}, 1000, 24)).toBe(240);
    // Then −$400: the year's gain falls to $600, so $96 comes back.
    expect(taxOnSale({gain: 1000, paid: 240, carry: 0}, -400, 24)).toBe(-96);
    // Then −$800: the year is now a $200 loss, so the rest ($144) comes back,
    // and no more.
    expect(taxOnSale({gain: 600, paid: 144, carry: 0}, -800, 24)).toBe(-144);
  });

  it('never gives back more than was set aside this year', () => {
    // $1,000 of gains while taxes were off: nothing was set aside, so a
    // loss gives nothing back.
    expect(taxOnSale({gain: 1000, paid: 0, carry: 0}, -500, 24)).toBe(0);
  });

  it('carries a net loss forward into later years', () => {
    const history = [
      sale('2025-03-03', 500, 120),
      sale('2025-05-01', -500, -120),
      sale('2025-07-01', -200),
    ];
    // 2025 ended $200 down, so 2026 starts with $200 carried in.
    expect(taxYearSoFar(history, 2026)).toEqual({gain: 0, paid: 0, carry: 200});
    // A $500 gain in 2026 is taxed on $300: $72.
    expect(taxOnSale(taxYearSoFar(history, 2026), 500, 24)).toBe(72);
    // The carry is used up by gains: after +$500 in 2026, nothing is left
    // for 2027.
    expect(
      taxYearSoFar([...history, sale('2026-03-02', 500, 72)], 2027),
    ).toEqual({gain: 0, paid: 0, carry: 0});
    // Only this year's sales count toward this year; later ones are ignored.
    expect(taxYearSoFar(history, 2025)).toEqual({
      gain: -200,
      paid: 0,
      carry: 0,
    });
  });

  it('executeOrder works it out from the year’s earlier sales', () => {
    let p: Portfolio = createPortfolio(10000, 0);
    const trade = (
      side: 'BUY' | 'SELL',
      date: MarketDate,
      price: number,
    ): Transaction => {
      const result = executeOrder(p, {
        side,
        symbol: 'X',
        name: 'X',
        shares: 10,
        price,
        date: marketCloseTime(date),
        costs: TAX,
      });
      p = result.portfolio;
      return result.transaction;
    };
    trade('BUY', '2025-02-03', 100);
    expect(trade('SELL', '2025-03-03', 150).tax).toBe(120); // +$500
    trade('BUY', '2025-04-01', 150);
    expect(trade('SELL', '2025-05-01', 100).tax).toBe(-120); // −$500
    trade('BUY', '2025-06-02', 100);
    expect(trade('SELL', '2025-07-01', 80).tax).toBeUndefined(); // −$200
    trade('BUY', '2026-02-02', 100);
    expect(trade('SELL', '2026-03-02', 150).tax).toBe(72); // +$500 − $200
    // Gains $1,000, losses $700, tax $72: all left in cash.
    expect(p.cash).toBe(10000 + 1000 - 700 - 72);
  });
});

describe('settings', () => {
  it('validates the rates', () => {
    expect(validateCosts({spreadPercent: 0.1, taxPercent: 24})).toEqual([]);
    expect(validateCosts({spreadPercent: -1, taxPercent: 61})).toEqual([
      'spread',
      'tax',
    ]);
    expect(validateCosts({spreadPercent: NaN, taxPercent: 0})).toEqual([
      'spread',
    ]);
  });

  it('practice trades pay costs only when turned on', () => {
    const rates = {spreadPercent: 0.1, taxPercent: 24};
    expect(tradeCosts({...rates, applyToTrades: false})).toBeUndefined();
    expect(tradeCosts({...rates, applyToTrades: true})).toEqual(rates);
    expect(
      tradeCosts({spreadPercent: 0, taxPercent: 0, applyToTrades: true}),
    ).toBeUndefined();
    expect(hasCosts({spreadPercent: 0, taxPercent: 5})).toBe(true);
  });
});

describe('automations pay costs', () => {
  const history = (symbol: string, bars: [MarketDate, number][]) =>
    ({
      symbol,
      bars: bars.map(([date, close]) => ({date, close, adjClose: close})),
      splits: [],
      dividends: [],
    } as DailyHistory);
  const costs = {spreadPercent: 0.1, taxPercent: 24};

  it('a recurring buy fits the spread inside its amount', () => {
    const result = runAutomations({
      portfolio: createPortfolio(1000, 0),
      recurring: [
        {
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
        },
      ],
      risk: [],
      histories: {SPY: history('SPY', [['2026-11-02', 300]])},
      through: '2026-11-02',
      unitsAsOf: '2026-11-09',
      costs,
    });
    // $100 / 1.001 / $300 = 0.333000 shares: $99.90 + $0.10 spread.
    expect(result.trades[0]).toMatchObject({
      shares: 0.333,
      total: 99.9,
      fees: 0.1,
    });
    expect(result.portfolio.cash).toBe(900);
  });

  it('a take-profit sale pays the spread and sets aside the tax', () => {
    const owned = executeOrder(createPortfolio(1000, 0), {
      side: 'BUY',
      symbol: 'AAPL',
      name: 'Apple',
      shares: 10,
      price: 100,
      date: marketCloseTime('2026-10-26'),
    }).portfolio;
    const result = runAutomations({
      portfolio: owned,
      recurring: [],
      risk: [
        {
          id: 'k1',
          symbol: 'AAPL',
          kind: 'takeProfit',
          percent: 10,
          createdAt: 1,
          startDate: '2026-11-02',
          status: 'active',
        },
      ],
      histories: {AAPL: history('AAPL', [['2026-11-02', 115]])},
      through: '2026-11-02',
      unitsAsOf: '2026-11-09',
      costs,
    });
    // $1,150 − $1.15 spread − $1,000 cost = $148.85 short-term gain.
    // Tax: 24% × $148.85 = $35.724 → $35.72.
    expect(result.trades[0]).toMatchObject({
      total: 1150,
      fees: 1.15,
      shortTermGain: 148.85,
      tax: 35.72,
      realizedPnL: 113.13,
    });
    expect(result.portfolio.cash).toBe(1113.13);
  });
});

describe('backtests with costs', () => {
  const DATES = weekdaysFrom('2026-01-05', 10);
  const backtest = (
    closes: number[],
    startingBalance: number,
    costs: {spreadPercent: number; taxPercent: number},
  ) =>
    runBacktest({
      // All-in on price vs its 2-day average, as in backtest.test.ts.
      bot: {
        symbol: 'X',
        name: 'X',
        strategy: 'maCross',
        settings: {...maCrossover.defaults, mode: 'price', slowLength: 2},
        exits: {},
        riskPercent: 100,
      },
      history: {
        symbol: 'X',
        bars: closes.map((close, i) => ({
          date: DATES[i],
          close,
          adjClose: close,
        })),
        splits: [],
        dividends: [],
      },
      from: DATES[0],
      to: DATES[closes.length - 1],
      startingBalance,
      costs,
    })!;

  it('every trade pays the spread; buy-and-hold pays it once', () => {
    // 1% spread, $1,010:
    // day 1: 20 > 15 → $1,010 / 1.01 = $1,000 → 50 shares at $20 + $10
    // day 3: 15 < 20 → sell 50 at $15 = $750 − $7.50 = $742.50
    // day 5: 20 > 15 → $742.50 / 1.01 / $20 = 36.757425 shares
    //        = $735.15 + $7.35 spread
    // day 6: 36.757425 × $30 = $1,102.72275
    const result = backtest([10, 20, 25, 15, 10, 20, 30], 1010, {
      spreadPercent: 1,
      taxPercent: 0,
    });
    expect(result.equity).toEqual([
      1010,
      1000,
      1250,
      742.5,
      742.5,
      36.757425 * 20,
      36.757425 * 30,
    ]);
    expect(result.transactions.map(t => [t.side, t.total, t.fees])).toEqual([
      ['BUY', 1000, 10],
      ['SELL', 750, 7.5],
      ['BUY', 735.15, 7.35],
    ]);
    expect(result.trades[0]).toMatchObject({
      cost: 1010,
      proceeds: 742.5,
      fees: 17.5,
    });
    expect(result.trades[0].returnPercent).toBeCloseTo(
      (742.5 / 1010 - 1) * 100,
      10,
    );
    expect(result.stats.spreadPaid).toBe(24.85);
    // $1,010 / ($10 × 1.01) = 100 shares at the first close.
    expect(result.buyHold).toEqual([1000, 2000, 2500, 1500, 1000, 2000, 3000]);
    // Returns count from the $1,010 put in, so the first spread counts:
    // $3,000 / $1,010, not $3,000 / $1,000.
    expect(result.stats.buyHold.totalReturn).toBeCloseTo(
      (3000 / 1010 - 1) * 100,
      10,
    );
    expect(result.stats.strategy.totalReturn).toBeCloseTo(
      ((36.757425 * 30) / 1010 - 1) * 100,
      10,
    );
  });

  it('a later loss in the year gives back tax from an earlier gain', () => {
    // 20% tax, no spread, $1,000:
    // day 1: buy 50 at $20
    // day 3: 25 < 27.5 → sell at $25: +$250, tax $50 → $1,200
    // day 5: 30 > 25 → buy 40 at $30
    // day 7: 20 < 30 → sell at $20: −$400. The year is now $150 down, so
    //        the $50 comes back: $800 + $50 = $850
    const result = backtest([10, 20, 30, 25, 20, 30, 40, 20], 1000, {
      spreadPercent: 0,
      taxPercent: 20,
    });
    expect(result.equity).toEqual([
      1000, 1000, 1500, 1200, 1200, 1200, 1600, 850,
    ]);
    expect(result.trades.map(t => t.tax)).toEqual([50, -50]);
    expect(result.stats.taxPaid).toBe(0);
    expect(result.stats.spreadPaid).toBe(0);
  });

  it('without costs, nothing changes', () => {
    const closes = [10, 20, 25, 15, 10, 20, 30];
    const none = backtest(closes, 1000, {spreadPercent: 0, taxPercent: 0});
    expect(none.equity).toEqual([1000, 1000, 1250, 750, 750, 750, 1125]);
    expect(none.stats).toMatchObject({spreadPaid: 0, taxPaid: 0});
  });
});
