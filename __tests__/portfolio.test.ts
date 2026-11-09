import {
  applySplit,
  cleanSharesInput,
  createPortfolio,
  executeOrder,
  maxAffordableShares,
  migratePortfolio,
  OrderError,
  Portfolio,
  PORTFOLIO_VERSION,
  portfolioHistory,
  realizedPnLSeries,
  sharesToInput,
  summarize,
  tradingStats,
} from '../services/portfolio';
import type {Quote} from '../services/marketData';

const quote = (
  symbol: string,
  price: number,
  previousClose = price,
): Quote => ({
  symbol,
  name: symbol,
  type: 'EQUITY',
  currency: 'USD',
  exchange: 'NasdaqGS',
  price,
  previousClose,
  change: price - previousClose,
  changePercent: ((price - previousClose) / previousClose) * 100,
  marketOpen: true,
  updatedAt: 0,
  spark: [],
});

const buy = (
  p: Portfolio,
  symbol: string,
  shares: number,
  price: number,
  date = 1,
) =>
  executeOrder(p, {side: 'BUY', symbol, name: symbol, shares, price, date})
    .portfolio;
const sell = (
  p: Portfolio,
  symbol: string,
  shares: number,
  price: number,
  date = 2,
) =>
  executeOrder(p, {side: 'SELL', symbol, name: symbol, shares, price, date})
    .portfolio;

// Noon in New York (16:00 UTC in summer) on a given date.
const utcNoon = (date: string) => Date.parse(`${date}T16:00:00Z`);

describe('executeOrder', () => {
  it('buys shares with cash and averages the cost', () => {
    let p = createPortfolio(10000, 0);
    p = buy(p, 'AAPL', 10, 100);
    p = buy(p, 'AAPL', 10, 200);
    expect(p.cash).toBe(7000);
    expect(p.positions.AAPL.shares).toBe(20);
    expect(p.positions.AAPL.avgCost).toBe(150);
    expect(p.transactions).toHaveLength(2);
    expect(p.transactions[0].price).toBe(200); // newest first
  });

  it('records realized P&L on sells and closes empty positions', () => {
    let p = buy(createPortfolio(10000, 0), 'AAPL', 10, 100);
    p = sell(p, 'AAPL', 4, 130);
    expect(p.cash).toBe(9520);
    expect(p.positions.AAPL.shares).toBe(6);
    expect(p.transactions[0].realizedPnL).toBe(120);
    p = sell(p, 'AAPL', 6, 90);
    expect(p.positions.AAPL).toBeUndefined();
    expect(p.transactions[0].realizedPnL).toBe(-60);
    expect(p.cash).toBe(10060);
  });

  it('rejects orders it cannot fill', () => {
    const p = createPortfolio(1000, 0);
    const attempt = (order: Partial<Parameters<typeof executeOrder>[1]>) => {
      try {
        executeOrder(p, {
          side: 'BUY',
          symbol: 'X',
          name: 'X',
          shares: 1,
          price: 10,
          ...order,
        });
      } catch (error) {
        return (error as OrderError).code;
      }
    };
    expect(attempt({shares: 0})).toBe('INVALID_QUANTITY');
    expect(attempt({shares: NaN})).toBe('INVALID_QUANTITY');
    // Less than a millionth of a share rounds to zero.
    expect(attempt({shares: 0.0000004})).toBe('INVALID_QUANTITY');
    expect(attempt({shares: 1.5})).toBeUndefined(); // fractional is fine
    expect(attempt({price: 0})).toBe('INVALID_PRICE');
    expect(attempt({shares: 101})).toBe('INSUFFICIENT_CASH');
    expect(attempt({side: 'SELL'})).toBe('INSUFFICIENT_SHARES');
  });

  it('does not mutate the original portfolio', () => {
    const p = createPortfolio(1000, 0);
    buy(p, 'AAPL', 1, 100);
    expect(p.cash).toBe(1000);
    expect(p.positions).toEqual({});
  });
});

it('maxAffordableShares rounds down to a millionth of a share', () => {
  expect(maxAffordableShares(1000, 100)).toBe(10);
  expect(maxAffordableShares(0.3, 0.1)).toBe(3); // not 2.999999
  expect(maxAffordableShares(99.99, 100)).toBe(0.9999);
  expect(maxAffordableShares(100, 3)).toBe(33.333333);
  expect(maxAffordableShares(100, 0)).toBe(0);
});

describe('fractional shares and lots', () => {
  it('buys fractional shares, rounded to 6 decimals', () => {
    let p = buy(createPortfolio(10000, 0), 'AAPL', 2.5, 100);
    expect(p.cash).toBe(9750);
    // 0.1234567 rounds to 0.123457; 0.123457 × 200 = $24.6914 → $24.69.
    p = buy(p, 'AAPL', 0.1234567, 200);
    expect(p.positions.AAPL.shares).toBe(2.623457);
    expect(p.cash).toBe(9725.31);
  });

  it('sells the oldest lots first (FIFO)', () => {
    let p = buy(createPortfolio(10000, 0), 'AAPL', 10, 100, 1);
    p = buy(p, 'AAPL', 10, 200, 2);
    p = sell(p, 'AAPL', 15, 300, 3);
    // Sold all 10 from the first lot and 5 from the second:
    // 15 × 300 − (10 × 100 + 5 × 200) = 4500 − 2000 = 2500.
    expect(p.transactions[0].realizedPnL).toBe(2500);
    expect(p.positions.AAPL.lots).toEqual([
      {shares: 5, price: 200, date: 2, unitsAsOf: '1969-12-31'},
    ]);
    expect(p.positions.AAPL.avgCost).toBe(200);
  });

  it('closes a position sold in fractional pieces without leftover dust', () => {
    let p = buy(createPortfolio(1000, 0), 'AAPL', 0.1, 100);
    p = buy(p, 'AAPL', 0.2, 100);
    p = sell(p, 'AAPL', 0.3, 100); // 0.1 + 0.2 is 0.30000000000000004 in floats
    expect(p.positions.AAPL).toBeUndefined();
    expect(p.cash).toBe(1000);
  });

  it('counts buying fees in the cost and charges selling fees and tax', () => {
    let p = executeOrder(createPortfolio(10000, 0), {
      side: 'BUY',
      symbol: 'AAPL',
      name: 'AAPL',
      shares: 10,
      price: 100,
      fees: 5,
    }).portfolio;
    expect(p.cash).toBe(8995);
    expect(p.positions.AAPL.avgCost).toBe(100.5); // $1,005 for 10 shares
    const {portfolio, transaction} = executeOrder(p, {
      side: 'SELL',
      symbol: 'AAPL',
      name: 'AAPL',
      shares: 10,
      price: 110,
      fees: 5,
      tax: 20,
    });
    // 1100 − 1005 − 5 − 20 = 70
    expect(transaction).toMatchObject({realizedPnL: 70, fees: 5, tax: 20});
    expect(portfolio.cash).toBe(10070);
  });

  it('keeps the history newest first when an older trade is added', () => {
    // A manual trade today, then an automation fills last week's close.
    let p = buy(createPortfolio(10000, 0), 'AAPL', 1, 100, 500);
    p = buy(p, 'SPY', 1, 100, 300);
    p = buy(p, 'MSFT', 1, 100, 100);
    p = buy(p, 'NVDA', 1, 100, 600);
    expect(p.transactions.map(t => t.date)).toEqual([600, 500, 300, 100]);
  });

  it('records who placed a trade and why', () => {
    const {transaction} = executeOrder(createPortfolio(1000, 0), {
      side: 'BUY',
      symbol: 'SPY',
      name: 'SPY',
      shares: 0.1,
      price: 500,
      source: 'recurring',
      reason: {code: 'recurring', params: {amount: 50}},
      automationId: 'rule-1',
    });
    expect(transaction).toMatchObject({
      source: 'recurring',
      reason: {code: 'recurring', params: {amount: 50}},
      automationId: 'rule-1',
    });
    const manual = buy(createPortfolio(1000, 0), 'SPY', 1, 500);
    expect(manual.transactions[0].source).toBe('manual');
    expect(manual.transactions[0]).not.toHaveProperty('reason');
  });
});

describe('applySplit', () => {
  const split = {symbol: 'NVDA', date: '2024-06-10', ratio: 10};
  const before = () => {
    let p = executeOrder(createPortfolio(5000, 0), {
      side: 'BUY',
      symbol: 'NVDA',
      name: 'NVDA',
      shares: 1,
      price: 1000,
      date: 10,
      unitsAsOf: '2024-06-05', // bought before the split, at the old price
    }).portfolio;
    p = executeOrder(p, {
      side: 'BUY',
      symbol: 'NVDA',
      name: 'NVDA',
      shares: 2,
      price: 120,
      date: 20,
      unitsAsOf: '2024-06-12', // bought after it, at the new price
    }).portfolio;
    return p;
  };

  it('converts only the lots bought before the split', () => {
    const p = applySplit(before(), split);
    expect(p.positions.NVDA.lots.map(l => [l.shares, l.price])).toEqual([
      [10, 100],
      [2, 120],
    ]);
    expect(p.positions.NVDA.shares).toBe(12);
    // The cost doesn't change: 1000 + 240 for 12 shares.
    expect(p.positions.NVDA.avgCost).toBeCloseTo(1240 / 12, 10);
  });

  it('does nothing the second time', () => {
    const once = applySplit(before(), split);
    expect(applySplit(once, split)).toBe(once);
  });

  it('lets the history chart value old trades in post-split shares', () => {
    let p = executeOrder(createPortfolio(2000, 0), {
      side: 'BUY',
      symbol: 'NVDA',
      name: 'NVDA',
      shares: 1,
      price: 1000,
      date: 10,
      unitsAsOf: '2024-06-05',
    }).portfolio;
    p = applySplit(p, split);
    // Chart prices are split-adjusted, so the 1 old share counts as 10:
    // 1000 cash + 10 × 110.
    const history = portfolioHistory(p, {NVDA: [{t: 15, value: 110}]}, [20]);
    expect(history[0].value).toBe(2100);
  });
});

describe('migratePortfolio', () => {
  // The format saved before lots existed.
  const v1 = {
    startingCash: 10000,
    cash: 8500,
    positions: {
      AAPL: {symbol: 'AAPL', name: 'Apple', shares: 10, avgCost: 150},
    },
    transactions: [
      {
        id: 'b',
        side: 'BUY',
        symbol: 'AAPL',
        name: 'Apple',
        shares: 5,
        price: 200,
        total: 1000,
        date: utcNoon('2026-10-20'),
      },
      {
        id: 'a',
        side: 'BUY',
        symbol: 'AAPL',
        name: 'Apple',
        shares: 5,
        price: 100,
        total: 500,
        date: utcNoon('2026-10-15'),
      },
    ],
    createdAt: 0,
  };

  it('turns each old position into one lot dated at the first purchase', () => {
    const p = migratePortfolio(v1);
    expect(p.version).toBe(PORTFOLIO_VERSION);
    expect(p.positions.AAPL).toMatchObject({shares: 10, avgCost: 150});
    expect(p.positions.AAPL.lots).toEqual([
      {
        shares: 10,
        price: 150,
        date: utcNoon('2026-10-15'),
        unitsAsOf: '2026-10-15',
      },
    ]);
    expect(p.transactions.map(t => t.source)).toEqual(['manual', 'manual']);
    expect(p.splits).toEqual([]);
    // And it trades normally afterwards.
    expect(sell(p, 'AAPL', 10, 160).positions.AAPL).toBeUndefined();
  });

  it('leaves current portfolios alone', () => {
    const current = createPortfolio(1000, 0);
    expect(migratePortfolio(current)).toBe(current);
  });
});

it('cleans typed quantities', () => {
  expect(cleanSharesInput('12')).toBe('12');
  expect(cleanSharesInput('1,5')).toBe('1.5'); // Vietnamese decimal comma
  expect(cleanSharesInput('1.2345678')).toBe('1.234567');
  expect(cleanSharesInput('a1b.2c')).toBe('1.2');
  expect(cleanSharesInput('1.2.3')).toBe('1.23');
  expect(cleanSharesInput('')).toBe('');
  expect(sharesToInput(0.1 + 0.2)).toBe('0.3');
  expect(sharesToInput(-1)).toBe('0');
});

describe('summarize', () => {
  it('values holdings at live prices', () => {
    let p = buy(createPortfolio(10000, 0), 'AAPL', 10, 100);
    p = buy(p, 'MSFT', 5, 200);
    const s = summarize(p, {
      AAPL: quote('AAPL', 110, 105),
      MSFT: quote('MSFT', 180, 190),
    });
    expect(s.cash).toBe(8000);
    expect(s.holdingsValue).toBe(1100 + 900);
    expect(s.totalValue).toBe(10000);
    expect(s.gain).toBe(100);
    expect(s.loss).toBe(100);
    expect(s.unrealizedPnL).toBe(0);
    expect(s.dayChange).toBe(10 * 5 + 5 * -10);
    expect(s.totalReturn).toBe(0);
  });

  it('falls back to cost while a quote is missing', () => {
    const p = buy(createPortfolio(10000, 0), 'AAPL', 10, 100);
    const s = summarize(p, {});
    expect(s.totalValue).toBe(10000);
    expect(s.holdings[0].pnl).toBe(0);
  });
});

it('tradingStats counts wins among sells', () => {
  let p = buy(createPortfolio(10000, 0), 'AAPL', 10, 100);
  p = sell(p, 'AAPL', 2, 120);
  p = sell(p, 'AAPL', 2, 90);
  p = sell(p, 'AAPL', 2, 130);
  const stats = tradingStats(p.transactions);
  expect(stats.totalTrades).toBe(4);
  expect(stats.winRate).toBeCloseTo(66.67, 1);
  expect(stats.realizedPnL).toBe(40 - 20 + 60);
});

it('realizedPnLSeries accumulates by day', () => {
  const now = new Date(2026, 9, 27, 15).getTime();
  const day = 24 * 60 * 60 * 1000;
  let p = buy(createPortfolio(10000, 0), 'AAPL', 10, 100, now - 5 * day);
  p = sell(p, 'AAPL', 5, 110, now - 3 * day);
  p = sell(p, 'AAPL', 5, 90, now - 1000);
  const series = realizedPnLSeries(p.transactions, 7, now);
  expect(series).toHaveLength(7);
  expect(series[6].label).toBe('27/10');
  expect(series.map(s => s.value)).toEqual([0, 0, 0, 50, 50, 50, 0]);
});

it('portfolioHistory replays trades over the timeline', () => {
  let p = createPortfolio(1000, 0);
  p = buy(p, 'AAPL', 5, 100, 15); // between t=10 and t=20
  const prices = {
    AAPL: [
      {t: 10, value: 100},
      {t: 20, value: 110},
      {t: 30, value: 120},
    ],
  };
  const history = portfolioHistory(p, prices, [10, 20, 30]);
  expect(history.map(h => h.value)).toEqual([1000, 1050, 1100]);
});

it('portfolioHistory uses the trade price before any data point', () => {
  const p = buy(createPortfolio(1000, 0), 'NEW', 2, 50, 5);
  const history = portfolioHistory(p, {NEW: []}, [10]);
  expect(history[0].value).toBe(1000);
});
