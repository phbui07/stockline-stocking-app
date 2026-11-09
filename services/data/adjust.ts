import type {MarketDate} from '../engine/dates';
import type {DailyBar, DividendEvent} from './types';

// Builds dividend-adjusted closes from split-adjusted closes, using the
// standard method (the one Yahoo and CRSP use).
//
// On the ex-dividend date the price drops by roughly the dividend, even
// though shareholders lost nothing: they received the cash. To make the
// series show that, every close *before* the ex-date is multiplied by
//   1 - dividend / (close on the day before the ex-date)
// Several dividends multiply together, working backwards from today.
//
// Example: closes 100, 102, 101 with a $1 dividend going ex on the third day.
// The factor is 1 - 1/102 ≈ 0.990196, so the adjusted closes are about
// 99.02, 101.00, 101. Holding from day 1 to day 3 is now a 2% gain, which is
// what a shareholder actually earned (price plus dividend).
export const adjustForDividends = (
  bars: {date: MarketDate; close: number}[],
  dividends: DividendEvent[],
): DailyBar[] => {
  const factors = new Array(bars.length).fill(1);
  for (const dividend of dividends) {
    const exIndex = bars.findIndex(bar => bar.date >= dividend.date);
    if (exIndex <= 0) {
      continue; // no trading day before the ex-date in this data
    }
    const factor = 1 - dividend.amount / bars[exIndex - 1].close;
    for (let i = 0; i < exIndex; i++) {
      factors[i] *= factor;
    }
  }
  return bars.map((bar, i) => ({
    date: bar.date,
    close: bar.close,
    adjClose: bar.close * factors[i],
  }));
};
