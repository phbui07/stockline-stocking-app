import {
  addDays,
  addMonths,
  dayOfWeek,
  makeMarketDate,
  MarketDate,
  nextOpenMarketDate,
} from './dates';

// Recurring investments, also called dollar-cost averaging (DCA): buy a
// fixed dollar amount of one stock on a schedule, whatever its price. When
// the price is low that amount buys more shares, and when it's high it buys
// fewer, so you never put everything in at a single price.

export type Frequency = 'weekly' | 'biweekly' | 'monthly';
export const FREQUENCIES: Frequency[] = ['weekly', 'biweekly', 'monthly'];

export interface Schedule {
  frequency: Frequency;
  weekday: number; // 1 = Monday … 5 = Friday, for weekly and biweekly
  dayOfMonth: number; // 1–28, for monthly
}

export interface RecurringRule extends Schedule {
  id: string;
  symbol: string;
  name: string;
  amount: number; // dollars per purchase
  paused: boolean;
  // The next scheduled date. The purchase happens at the close of the first
  // trading day on or after it, so a Saturday date buys on Monday.
  nextDate: MarketDate;
  createdAt: number;
}

export interface RecurringInput extends Schedule {
  symbol: string;
  name: string;
  amount: number;
  // Where the schedule starts. Normally the first day whose close isn't
  // known yet; development builds can pick a past date to test catching up.
  startFrom?: MarketDate;
}

export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 1000000;
// Stopping at the 28th means every month, February included, has the day.
export const MAX_DAY_OF_MONTH = 28;

export type RecurringError = 'symbol' | 'amount' | 'weekday' | 'dayOfMonth';

export const validateRecurring = (input: RecurringInput): RecurringError[] => {
  const errors: RecurringError[] = [];
  if (!input.symbol) {
    errors.push('symbol');
  }
  if (!(input.amount >= MIN_AMOUNT && input.amount <= MAX_AMOUNT)) {
    errors.push('amount');
  }
  if (
    !Number.isInteger(input.weekday) ||
    input.weekday < 1 ||
    input.weekday > 5
  ) {
    errors.push('weekday');
  }
  if (
    !Number.isInteger(input.dayOfMonth) ||
    input.dayOfMonth < 1 ||
    input.dayOfMonth > MAX_DAY_OF_MONTH
  ) {
    errors.push('dayOfMonth');
  }
  return errors;
};

// The first scheduled date on or after `from`.
export const firstOccurrence = (
  schedule: Schedule,
  from: MarketDate,
): MarketDate => {
  if (schedule.frequency === 'monthly') {
    const [year, month] = from.split('-').map(Number);
    const thisMonth = makeMarketDate(year, month, schedule.dayOfMonth);
    return thisMonth >= from ? thisMonth : addMonths(thisMonth, 1);
  }
  // Days until the chosen weekday: from a Wednesday (3) to a Monday (1) is
  // (1 - 3 + 7) % 7 = 5 days.
  const daysAhead = (schedule.weekday - dayOfWeek(from) + 7) % 7;
  return addDays(from, daysAhead);
};

// The scheduled date after `date`.
export const nextOccurrence = (
  schedule: Schedule,
  date: MarketDate,
): MarketDate => {
  switch (schedule.frequency) {
    case 'weekly':
      return addDays(date, 7);
    case 'biweekly':
      return addDays(date, 14);
    case 'monthly':
      return addMonths(date, 1);
  }
};

export const createRecurringRule = (
  input: RecurringInput,
  now = Date.now(),
  id = `rec-${now}-${Math.random().toString(36).slice(2, 8)}`,
): RecurringRule => ({
  id,
  symbol: input.symbol,
  name: input.name,
  amount: input.amount,
  frequency: input.frequency,
  weekday: input.weekday,
  dayOfMonth: input.dayOfMonth,
  paused: false,
  nextDate: firstOccurrence(input, input.startFrom ?? nextOpenMarketDate(now)),
  createdAt: now,
});

// Changing the schedule restarts it from today. Changing only the amount
// keeps the next date.
export const editRecurringRule = (
  rule: RecurringRule,
  input: RecurringInput,
  now = Date.now(),
): RecurringRule => {
  const scheduleChanged =
    input.frequency !== rule.frequency ||
    input.weekday !== rule.weekday ||
    input.dayOfMonth !== rule.dayOfMonth ||
    input.startFrom !== undefined;
  return {
    ...rule,
    amount: input.amount,
    frequency: input.frequency,
    weekday: input.weekday,
    dayOfMonth: input.dayOfMonth,
    nextDate: scheduleChanged
      ? firstOccurrence(input, input.startFrom ?? nextOpenMarketDate(now))
      : rule.nextDate,
  };
};

// Resuming continues from today: purchases that fell while the rule was
// paused are skipped, not bought all at once.
export const setRulePaused = (
  rule: RecurringRule,
  paused: boolean,
  now = Date.now(),
): RecurringRule =>
  paused
    ? {...rule, paused: true}
    : {
        ...rule,
        paused: false,
        nextDate: firstOccurrence(rule, nextOpenMarketDate(now)),
      };
