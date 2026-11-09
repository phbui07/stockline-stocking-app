import {daysBetween, MarketDate} from './dates';

// Measures of how an account did, from its value at each day's close.

export interface Drawdown {
  percent: number; // e.g. -40 for a 40% drop; 0 if it never fell
  peakIndex: number;
  troughIndex: number;
}

// The largest drop from a high point to a later low point.
// Example: 1000 → 1250 → 750 → 1125 falls 40% (from 1250 to 750), even
// though it ends above where it started.
export const maxDrawdown = (values: number[]): Drawdown => {
  let worst: Drawdown = {percent: 0, peakIndex: 0, troughIndex: 0};
  let peakIndex = 0;
  values.forEach((value, i) => {
    if (value > values[peakIndex]) {
      peakIndex = i;
    }
    const drop = (value / values[peakIndex] - 1) * 100;
    if (drop < worst.percent) {
      worst = {percent: drop, peakIndex, troughIndex: i};
    }
  });
  return worst;
};

export const totalReturn = (start: number, end: number) =>
  (end / start - 1) * 100;

// The steady yearly growth that would give the same total return, so tests
// over different lengths can be compared. 21% over two years is 10% a year,
// because 1.1 × 1.1 = 1.21. Undefined for less than a year, where it would
// exaggerate.
export const annualReturn = (
  start: number,
  end: number,
  from: MarketDate,
  to: MarketDate,
) => {
  const years = daysBetween(from, to) / 365.25;
  return years >= 1 ? ((end / start) ** (1 / years) - 1) * 100 : undefined;
};
