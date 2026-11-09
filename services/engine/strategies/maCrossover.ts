import {averageOfLast, movingAverage} from '../indicators';
import type {IndicatorLine, Strategy} from '../strategy';

// Moving-average crossover: hold the stock while its trend points up.
//
// Two ways to measure the trend:
// - 'price': compare the closing price with its N-day average.
// - 'cross': compare a short average (say 20 days) with a long one (say 50).
//
// It buys when the fast line (the price, or the short average) is above the
// slow line, and sells when it's below. That makes it a "state" rule: if it
// starts in the middle of an uptrend, it buys on the first day rather than
// waiting for the next cross.
//
// Options:
// - Buffer: only buy once the fast line is more than X% above the slow
//   line, and only sell once it's more than X% below. In between it keeps
//   doing what it was doing. This cuts the "whipsaws" of buying and selling
//   back and forth when the lines run close together.
// - Trend filter: only buy while the price is above a long average (usually
//   200 days), so it stays out during long declines. It doesn't force sells.

export type MaMode = 'price' | 'cross';

export interface MaCrossSettings {
  mode: MaMode;
  fastLength: number; // the short average, used in 'cross' mode
  slowLength: number; // the average the fast line is compared with
  bufferPercent: number; // 0 means no buffer
  trendFilter: boolean;
  trendLength: number;
}

export const MAX_MA_LENGTH = 400;
export const MAX_BUFFER = 20;

const isLength = (value: number) =>
  Number.isInteger(value) && value >= 2 && value <= MAX_MA_LENGTH;

export const maCrossover: Strategy<MaCrossSettings> = {
  id: 'maCross',

  defaults: {
    mode: 'cross',
    fastLength: 20,
    slowLength: 50,
    bufferPercent: 0,
    trendFilter: false,
    trendLength: 200,
  },

  validate: settings => {
    const errors: string[] = [];
    if (!isLength(settings.slowLength)) {
      errors.push('slowLength');
    }
    if (
      settings.mode === 'cross' &&
      (!isLength(settings.fastLength) ||
        settings.fastLength >= settings.slowLength)
    ) {
      errors.push('fastLength'); // the short average must be shorter
    }
    if (
      !(settings.bufferPercent >= 0 && settings.bufferPercent <= MAX_BUFFER)
    ) {
      errors.push('buffer');
    }
    if (settings.trendFilter && !isLength(settings.trendLength)) {
      errors.push('trendLength');
    }
    return errors;
  },

  warmupBars: settings =>
    Math.max(
      settings.slowLength,
      settings.mode === 'cross' ? settings.fastLength : 1,
      settings.trendFilter ? settings.trendLength : 1,
    ),

  decide: (history, settings, holding) => {
    const {mode, fastLength, slowLength, bufferPercent} = settings;
    const close = history[history.length - 1].close;
    const slow = averageOfLast(history, slowLength);
    const fast = mode === 'price' ? close : averageOfLast(history, fastLength);
    const trend = settings.trendFilter
      ? averageOfLast(history, settings.trendLength)
      : undefined;
    if (
      slow === undefined ||
      fast === undefined ||
      (settings.trendFilter && trend === undefined)
    ) {
      return {
        action: 'HOLD',
        reason: {
          code: 'maWarmup',
          params: {days: maCrossover.warmupBars(settings)},
        },
      };
    }

    const params = {
      mode,
      fast: fastLength,
      slow: slowLength,
      buffer: bufferPercent,
    };
    // The buffer band around the slow line: (100 ± X) / 100 of it.
    const buyAbove = (slow * (100 + bufferPercent)) / 100;
    const sellBelow = (slow * (100 - bufferPercent)) / 100;

    if (!holding && fast > buyAbove) {
      if (trend !== undefined && close <= trend) {
        return {
          action: 'HOLD',
          reason: {
            code: 'maTrendBlocked',
            params: {trend: settings.trendLength},
          },
        };
      }
      return {action: 'BUY', reason: {code: 'maBuy', params}};
    }
    if (holding && fast < sellBelow) {
      return {action: 'SELL', reason: {code: 'maSell', params}};
    }
    return {action: 'HOLD', reason: {code: 'maHold', params}};
  },

  indicators: (closes, settings) => {
    const lines: IndicatorLine[] = [];
    if (settings.mode === 'cross') {
      lines.push({
        key: 'fast',
        label: {code: 'maLine', params: {days: settings.fastLength}},
        values: movingAverage(closes, settings.fastLength),
      });
    }
    lines.push({
      key: 'slow',
      label: {code: 'maLine', params: {days: settings.slowLength}},
      values: movingAverage(closes, settings.slowLength),
    });
    if (settings.trendFilter) {
      lines.push({
        key: 'trend',
        label: {code: 'maLine', params: {days: settings.trendLength}},
        values: movingAverage(closes, settings.trendLength),
      });
    }
    return lines;
  },
};
