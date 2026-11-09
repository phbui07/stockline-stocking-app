import {
  addDays,
  dayOfWeek,
  daysBetween,
  isWeekday,
  lastCompletedMarketDate,
  marketCloseTime,
  newYorkOffsetHours,
  toMarketDate,
} from '../services/engine/dates';

const utc = (iso: string) => Date.parse(`${iso}Z`);

describe('newYorkOffsetHours', () => {
  // 2026: DST starts Sunday 8 March at 2 am EST (07:00 UTC) and ends
  // Sunday 1 November at 2 am EDT (06:00 UTC).
  it('switches to daylight saving time on the second Sunday of March', () => {
    expect(newYorkOffsetHours(utc('2026-03-08T06:59'))).toBe(-5);
    expect(newYorkOffsetHours(utc('2026-03-08T07:00'))).toBe(-4);
  });

  it('switches back on the first Sunday of November', () => {
    expect(newYorkOffsetHours(utc('2026-11-01T05:59'))).toBe(-4);
    expect(newYorkOffsetHours(utc('2026-11-01T06:00'))).toBe(-5);
  });
});

it('toMarketDate uses the New York calendar, not the phone’s', () => {
  // Friday's 4 pm close in New York is 21:00 UTC, which is already Saturday
  // 4 am in Vietnam. It still belongs to Friday.
  expect(toMarketDate(utc('2026-11-06T21:00'))).toBe('2026-11-06');
  // 1 am UTC on Saturday is still Friday evening in New York.
  expect(toMarketDate(utc('2026-11-07T01:00'))).toBe('2026-11-06');
});

describe('lastCompletedMarketDate', () => {
  it('waits until 4:30 pm New York time before counting today', () => {
    // Friday 6 Nov 2026, New York is UTC-5.
    expect(lastCompletedMarketDate(utc('2026-11-06T21:29'))).toBe('2026-11-05');
    expect(lastCompletedMarketDate(utc('2026-11-06T21:30'))).toBe('2026-11-06');
  });

  it('skips weekends', () => {
    expect(lastCompletedMarketDate(utc('2026-11-07T12:00'))).toBe('2026-11-06'); // Sat
    expect(lastCompletedMarketDate(utc('2026-11-09T15:00'))).toBe('2026-11-06'); // Mon 10 am
  });

  it('handles summer time', () => {
    // Wednesday 15 July 2026 at 5 pm EDT = 21:00 UTC.
    expect(lastCompletedMarketDate(utc('2026-07-15T21:00'))).toBe('2026-07-15');
  });
});

it('marketCloseTime is 4 pm in New York', () => {
  expect(marketCloseTime('2026-07-15')).toBe(utc('2026-07-15T20:00')); // EDT
  expect(marketCloseTime('2026-12-15')).toBe(utc('2026-12-15T21:00')); // EST
});

it('date arithmetic crosses months, years and leap days', () => {
  expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
  expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
  expect(daysBetween('2026-01-01', '2026-03-01')).toBe(59);
  expect(dayOfWeek('2026-11-08')).toBe(0); // Sunday
  expect(isWeekday('2026-11-08')).toBe(false);
  expect(isWeekday('2026-11-09')).toBe(true);
});
