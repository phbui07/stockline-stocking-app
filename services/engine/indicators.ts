// Indicators the strategies use.

// Simple moving average: on each day, the average of the last `length`
// values. The first `length - 1` days don't have enough data yet, so they
// are undefined.
// Example: values 1, 2, 3, 4 with length 3 → undefined, undefined, 2, 3.
export const movingAverage = (
  values: number[],
  length: number,
): (number | undefined)[] => {
  const result: (number | undefined)[] = new Array(values.length).fill(
    undefined,
  );
  // Keep a running total: add today's value, drop the one that fell out of
  // the window. That's one addition per day instead of `length`.
  let total = 0;
  values.forEach((value, i) => {
    total += value;
    if (i >= length) {
      total -= values[i - length];
    }
    if (i >= length - 1) {
      result[i] = total / length;
    }
  });
  return result;
};

// The average close of the last `length` bars, or undefined if there
// aren't that many.
export const averageOfLast = (
  bars: readonly {close: number}[],
  length: number,
): number | undefined => {
  if (bars.length < length) {
    return undefined;
  }
  let total = 0;
  for (let i = bars.length - length; i < bars.length; i++) {
    total += bars[i].close;
  }
  return total / length;
};
