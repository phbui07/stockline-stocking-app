import type {Transaction} from '../portfolio';
import {addMonths, MarketDate, toMarketDate} from './dates';

// Realistic costs. Real trading costs more than a simple simulation shows,
// in two ways:
//
// 1. The spread (and slippage). You buy at the ask and sell at the bid,
//    which sit a little above and below the price you see, and a market
//    order can fill a little worse still. Here that's one percentage per
//    trade: with 0.1%, a $1,000 buy costs $1,001 and a $1,000 sale pays $999.
//    It's recorded as the trade's fee, so the price stays the market price.
//
// 2. Tax on short-term gains. In the US, profit on shares held a year or
//    less is taxed like income. Here it's estimated at a rate you choose,
//    the usual way:
//    - Gains and losses from short-term sales in the same calendar year net
//      out: a $1,000 gain and a $400 loss are taxed as a $600 gain.
//    - A net loss for the year carries forward and offsets later years'
//      gains.
//    - Tax is set aside from each sale as it happens. If a later sale in the
//      same year loses money, some of it comes back. By the end of the year,
//      the total set aside is the rate × that year's net gain.
//    - Shares held more than a year aren't taxed here (the US taxes them at
//      lower long-term rates), and losses on them don't count.
//
// Not modeled: long-term rates, tax on dividends, the wash-sale rule (which
// postpones a loss if you buy the same stock back within 30 days), and the
// $3,000 of losses a year that can offset other income.

export interface CostSettings {
  spreadPercent: number; // per trade
  taxPercent: number; // on short-term gains
}

// What a user sets: the rates, and whether practice trades pay them too.
// Backtests always show results with and without them.
export interface CostPreferences extends CostSettings {
  applyToTrades: boolean;
}

// The defaults are deliberately on the cautious side, so results aren't
// better than they'd be in real life:
// - 0.1% per trade is more than a big US stock or ETF usually costs
//   (about 0.01–0.05%), and covers some slippage.
// - 24% is a middle US federal income-tax bracket. Your own rate depends on
//   your income and state.
export const DEFAULT_COST_PREFERENCES: CostPreferences = {
  spreadPercent: 0.1,
  taxPercent: 24,
  applyToTrades: false,
};

export const COST_LIMITS = {
  spreadPercent: {min: 0, max: 5},
  taxPercent: {min: 0, max: 60},
};

export type CostError = 'spread' | 'tax';

export const validateCosts = (costs: CostSettings): CostError[] => {
  const inRange = (value: number, {min, max}: {min: number; max: number}) =>
    Number.isFinite(value) && value >= min && value <= max;
  const errors: CostError[] = [];
  if (!inRange(costs.spreadPercent, COST_LIMITS.spreadPercent)) {
    errors.push('spread');
  }
  if (!inRange(costs.taxPercent, COST_LIMITS.taxPercent)) {
    errors.push('tax');
  }
  return errors;
};

export const hasCosts = (costs?: CostSettings) =>
  !!costs && (costs.spreadPercent > 0 || costs.taxPercent > 0);

// The rates practice trades should pay, or undefined if they're off.
export const tradeCosts = (
  preferences?: CostPreferences,
): CostSettings | undefined =>
  preferences?.applyToTrades && hasCosts(preferences)
    ? {
        spreadPercent: preferences.spreadPercent,
        taxPercent: preferences.taxPercent,
      }
    : undefined;

const cents = (value: number) => Math.round(value * 100) / 100;

// The spread's cost on a trade worth `total`.
export const spreadFee = (total: number, spreadPercent: number) =>
  cents((total * spreadPercent) / 100);

// "Held a year or less" (US rule): bought 2025-03-14 and sold 2026-03-14 is
// still short-term; sold 2026-03-16 is long-term.
export const isShortTerm = (bought: MarketDate, sold: MarketDate) =>
  sold <= addMonths(bought, 12);

export const taxYear = (date: MarketDate) => Number(date.slice(0, 4));

// Where a tax year stands so far.
export interface TaxYear {
  gain: number; // net short-term gain from this year's sales so far
  paid: number; // tax set aside this year so far, after refunds
  carry: number; // losses carried in from earlier years (0 or more)
}

// Works out `year`'s position from the sales already in the history, so
// nothing extra needs saving: each sale records its short-term gain and the
// tax it set aside.
export const taxYearSoFar = (
  transactions: Transaction[],
  year: number,
): TaxYear => {
  const years = new Map<number, {gain: number; paid: number}>();
  for (const t of transactions) {
    if (t.side !== 'SELL') {
      continue;
    }
    const y = taxYear(toMarketDate(t.date));
    if (y > year) {
      continue;
    }
    const totals = years.get(y) ?? {gain: 0, paid: 0};
    totals.gain += t.shortTermGain ?? 0;
    totals.paid += t.tax ?? 0;
    years.set(y, totals);
  }
  // Carry losses forward year by year: a net loss adds to the carry, a net
  // gain uses it up.
  let carry = 0;
  [...years.keys()]
    .filter(y => y < year)
    .sort((a, b) => a - b)
    .forEach(y => {
      carry = Math.max(0, carry - years.get(y)!.gain);
    });
  const current = years.get(year) ?? {gain: 0, paid: 0};
  return {
    gain: cents(current.gain),
    paid: cents(current.paid),
    carry: cents(carry),
  };
};

// The tax a sale sets aside: the rate × how much it raises the year's
// taxable gain (the net gain above any carried losses). A loss lowers the
// taxable gain, so it gives tax back, but never more than was set aside
// earlier in the year. Returns a negative number for a refund.
export const taxOnSale = (
  year: TaxYear,
  shortTermGain: number,
  taxPercent: number,
) => {
  const before = Math.max(0, year.gain - year.carry);
  const after = Math.max(0, year.gain + shortTermGain - year.carry);
  const tax = cents(((after - before) * taxPercent) / 100);
  const refundLimit = Math.max(0, year.paid);
  // `+ 0` turns -0 (from Math.max(-5, -0)) into a plain 0.
  return Math.max(tax, -refundLimit) + 0;
};
