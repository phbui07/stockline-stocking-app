// Market dates for the automation engine.
//
// A market date is a plain 'YYYY-MM-DD' string on the New York calendar, the
// exchange's own clock. Strings sort and compare correctly ('2026-01-09' <
// '2026-01-12'), and they avoid time-zone surprises: Friday's 4 pm close in
// New York is already Saturday morning in Vietnam, but its date is Friday.

export type MarketDate = string;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Regular trading ends at 4:00 pm New York time. Data providers publish the
// final closing price a few minutes later, so a day only counts as finished
// from 4:30 pm.
export const CLOSE_SETTLED_MINUTES = 16 * 60 + 30;

// Day of the month of the nth Sunday (n = 1 for the first) of a UTC month.
const nthSunday = (year: number, month: number, n: number) => {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0 = Sunday
  return 1 + ((7 - firstWeekday) % 7) + (n - 1) * 7;
};

// New York is UTC-4 during daylight saving time and UTC-5 otherwise. US rules
// since 2007: DST starts at 2:00 am on the second Sunday of March and ends at
// 2:00 am on the first Sunday of November. Computing it ourselves keeps the
// result identical on every phone, whatever its own time zone.
export const newYorkOffsetHours = (ms: number) => {
  const year = new Date(ms).getUTCFullYear();
  const dstStart = Date.UTC(year, 2, nthSunday(year, 2, 2), 7); // 2 am EST = 7 am UTC
  const dstEnd = Date.UTC(year, 10, nthSunday(year, 10, 1), 6); // 2 am EDT = 6 am UTC
  return ms >= dstStart && ms < dstEnd ? -4 : -5;
};

// A Date whose UTC fields read as the wall-clock time in New York.
const newYorkClock = (ms: number) =>
  new Date(ms + newYorkOffsetHours(ms) * HOUR_MS);

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

// Midnight UTC of a market date, used only for date arithmetic.
const dayStart = (date: MarketDate) => {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

export const toMarketDate = (ms: number): MarketDate =>
  isoDay(newYorkClock(ms));

export const addDays = (date: MarketDate, days: number): MarketDate =>
  isoDay(new Date(dayStart(date) + days * DAY_MS));

export const daysBetween = (from: MarketDate, to: MarketDate) =>
  Math.round((dayStart(to) - dayStart(from)) / DAY_MS);

export const dayOfWeek = (date: MarketDate) =>
  new Date(dayStart(date)).getUTCDay(); // 0 = Sunday, 6 = Saturday

export const isWeekday = (date: MarketDate) => {
  const day = dayOfWeek(date);
  return day !== 0 && day !== 6;
};

// The timestamp of 4:00 pm New York time on a market date, for recording
// trades that fill at that day's close.
export const marketCloseTime = (date: MarketDate) => {
  // DST switches at 2 am, so the offset at 8 pm UTC is the one in force all
  // afternoon in New York.
  const offset = newYorkOffsetHours(dayStart(date) + 20 * HOUR_MS);
  return dayStart(date) + (16 - offset) * HOUR_MS;
};

// The most recent weekday whose closing price is final. Before 4:30 pm New
// York time that's the previous weekday. Holidays aren't listed here: a
// holiday simply has no price data, so code that walks through the data
// skips it naturally.
export const lastCompletedMarketDate = (now = Date.now()): MarketDate => {
  const clock = newYorkClock(now);
  let date = isoDay(clock);
  const minutes = clock.getUTCHours() * 60 + clock.getUTCMinutes();
  if (minutes < CLOSE_SETTLED_MINUTES) {
    date = addDays(date, -1);
  }
  while (!isWeekday(date)) {
    date = addDays(date, -1);
  }
  return date;
};

// The first day whose close isn't known yet. Automations created now start
// here, so they never buy at a price that's already known.
export const nextOpenMarketDate = (now = Date.now()): MarketDate =>
  addDays(lastCompletedMarketDate(now), 1);

const pad = (value: number) => String(value).padStart(2, '0');

export const makeMarketDate = (year: number, month: number, day: number) =>
  `${year}-${pad(month)}-${pad(day)}`;

// The same day of the month, `months` later. Days that don't exist in the
// target month move to its last day (31 Jan + 1 month = 28 or 29 Feb).
export const addMonths = (date: MarketDate, months: number): MarketDate => {
  const [year, month, day] = date.split('-').map(Number);
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return makeMarketDate(targetYear, targetMonth, Math.min(day, lastDay));
};

// Accepts only real dates written as YYYY-MM-DD. "2026-02-30" fails the
// round trip because JavaScript rolls it over to 2 March.
export const isMarketDate = (text: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }
  const parsed = new Date(`${text}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && isoDay(parsed) === text
  );
};

export const minDate = (a: MarketDate, b: MarketDate) => (a < b ? a : b);
export const maxDate = (a: MarketDate, b: MarketDate) => (a > b ? a : b);
