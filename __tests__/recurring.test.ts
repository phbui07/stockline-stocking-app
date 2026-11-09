import {addMonths, isMarketDate} from '../services/engine/dates';
import {
  createRecurringRule,
  editRecurringRule,
  firstOccurrence,
  nextOccurrence,
  RecurringInput,
  Schedule,
  setRulePaused,
  validateRecurring,
} from '../services/engine/recurring';

// November 2026 starts on a Sunday, so Monday the 9th, Wednesday the 11th
// and Saturday the 14th are handy reference days.
const utc = (iso: string) => Date.parse(`${iso}Z`);
const weekly = (weekday: number): Schedule => ({
  frequency: 'weekly',
  weekday,
  dayOfMonth: 1,
});
const monthly = (dayOfMonth: number): Schedule => ({
  frequency: 'monthly',
  weekday: 1,
  dayOfMonth,
});
const input = (overrides: Partial<RecurringInput> = {}): RecurringInput => ({
  symbol: 'SPY',
  name: 'SPDR S&P 500',
  amount: 50,
  ...weekly(1),
  ...overrides,
});

describe('firstOccurrence', () => {
  it('finds the next chosen weekday', () => {
    // From Wednesday (3) to Monday (1): (1 - 3 + 7) % 7 = 5 days.
    expect(firstOccurrence(weekly(1), '2026-11-11')).toBe('2026-11-16');
    expect(firstOccurrence(weekly(3), '2026-11-11')).toBe('2026-11-11'); // same day
    expect(
      firstOccurrence({...weekly(5), frequency: 'biweekly'}, '2026-11-14'),
    ).toBe('2026-11-20'); // Saturday → Friday
  });

  it('finds the next chosen day of the month', () => {
    expect(firstOccurrence(monthly(15), '2026-11-11')).toBe('2026-11-15');
    expect(firstOccurrence(monthly(10), '2026-11-11')).toBe('2026-12-10');
    expect(firstOccurrence(monthly(5), '2026-12-20')).toBe('2027-01-05');
  });
});

it('nextOccurrence steps a week, two weeks or a month', () => {
  expect(nextOccurrence(weekly(1), '2026-11-16')).toBe('2026-11-23');
  expect(
    nextOccurrence({...weekly(1), frequency: 'biweekly'}, '2026-11-16'),
  ).toBe('2026-11-30');
  expect(nextOccurrence(monthly(28), '2026-12-28')).toBe('2027-01-28');
});

it('addMonths keeps the day, or uses the month’s last day', () => {
  expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
  expect(addMonths('2028-01-31', 1)).toBe('2028-02-29'); // leap year
  expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
  expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
});

it('isMarketDate only accepts real YYYY-MM-DD dates', () => {
  expect(isMarketDate('2024-02-29')).toBe(true);
  expect(isMarketDate('2026-02-29')).toBe(false);
  expect(isMarketDate('2026-02-30')).toBe(false);
  expect(isMarketDate('2026-2-3')).toBe(false);
  expect(isMarketDate('')).toBe(false);
});

describe('createRecurringRule', () => {
  it('starts with the first close that isn’t known yet', () => {
    // Monday 9 Nov, 10 am in New York: Monday's close is still to come, so
    // a Monday rule buys today.
    const morning = createRecurringRule(input(), utc('2026-11-09T15:00'));
    expect(morning.nextDate).toBe('2026-11-09');
    // At 5 pm Monday's close is already known, so it starts next Monday.
    const evening = createRecurringRule(input(), utc('2026-11-09T22:00'));
    expect(evening.nextDate).toBe('2026-11-16');
  });

  it('uses a start date from the past when given one (testing)', () => {
    // 1 Oct 2026 is a Thursday; the first Monday after it is 5 Oct.
    const rule = createRecurringRule(
      input({startFrom: '2026-10-01'}),
      utc('2026-11-09T15:00'),
    );
    expect(rule.nextDate).toBe('2026-10-05');
  });

  it('monthly rules skip to next month if the day has passed', () => {
    const rule = createRecurringRule(
      input(monthly(1)),
      utc('2026-11-09T15:00'),
    );
    expect(rule.nextDate).toBe('2026-12-01');
  });
});

describe('editing and pausing', () => {
  const now = utc('2026-11-09T15:00');
  const rule = createRecurringRule(input(), now, 'r1');

  it('keeps the next date when only the amount changes', () => {
    const edited = editRecurringRule(
      {...rule, nextDate: '2026-11-23'},
      input({amount: 75}),
      now,
    );
    expect(edited).toMatchObject({amount: 75, nextDate: '2026-11-23'});
  });

  it('restarts the schedule when it changes', () => {
    const edited = editRecurringRule(rule, input(monthly(15)), now);
    expect(edited).toMatchObject({
      frequency: 'monthly',
      nextDate: '2026-11-15',
    });
  });

  it('skips purchases missed while paused', () => {
    const paused = setRulePaused({...rule, nextDate: '2026-11-02'}, true, now);
    expect(paused.paused).toBe(true);
    // Resumed Wednesday 11 Nov after the close: next Monday, not the
    // missed 2 and 9 Nov.
    const resumed = setRulePaused(paused, false, utc('2026-11-11T23:00'));
    expect(resumed).toMatchObject({paused: false, nextDate: '2026-11-16'});
  });
});

it('validateRecurring explains what is wrong', () => {
  expect(validateRecurring(input())).toEqual([]);
  expect(validateRecurring(input({amount: 0.5}))).toEqual(['amount']);
  expect(validateRecurring(input({amount: NaN}))).toEqual(['amount']);
  expect(validateRecurring(input({symbol: ''}))).toEqual(['symbol']);
  expect(validateRecurring(input({weekday: 6}))).toEqual(['weekday']);
  expect(validateRecurring(input({dayOfMonth: 29}))).toEqual(['dayOfMonth']);
});
