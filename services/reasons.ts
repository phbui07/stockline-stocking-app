import type {TKey} from './i18n';
import type {TradeReason} from './portfolio';
import type {Frequency, Schedule} from './engine/recurring';
import type {RiskKind} from './engine/risk';
import type {MaCrossSettings} from './engine/strategies/maCrossover';
import {formatMoney, formatPercent} from './format';

// Turns automation data into sentences in the current language. Reasons are
// saved as a code plus numbers, not as text, so switching language
// re-translates old trades too.

type Translate = (
  key: TKey,
  params?: Record<string, string | number>,
) => string;

export const FREQUENCY_LABELS: Record<Frequency, TKey> = {
  weekly: 'frequency.weekly',
  biweekly: 'frequency.biweekly',
  monthly: 'frequency.monthly',
};

// Index 0 is Monday, matching Schedule.weekday 1.
export const WEEKDAY_NAMES: TKey[] = [
  'weekday.1',
  'weekday.2',
  'weekday.3',
  'weekday.4',
  'weekday.5',
];
export const WEEKDAY_SHORT: TKey[] = [
  'weekdayShort.1',
  'weekdayShort.2',
  'weekdayShort.3',
  'weekdayShort.4',
  'weekdayShort.5',
];

export const RISK_LABELS: Record<RiskKind, TKey> = {
  stopLoss: 'risk.stopLoss',
  takeProfit: 'risk.takeProfit',
  trailingStop: 'risk.trailingStop',
};

const RISK_REASONS: Record<RiskKind, TKey> = {
  stopLoss: 'reason.stopLoss',
  takeProfit: 'reason.takeProfit',
  trailingStop: 'reason.trailingStop',
};

export const describeSchedule = (schedule: Schedule, t: Translate) => {
  if (schedule.frequency === 'monthly') {
    return t('schedule.monthly', {day: schedule.dayOfMonth});
  }
  return t(
    schedule.frequency === 'weekly' ? 'schedule.weekly' : 'schedule.biweekly',
    {weekday: t(WEEKDAY_NAMES[schedule.weekday - 1])},
  );
};

export const describeReason = (reason: TradeReason, t: Translate) => {
  const params = reason.params ?? {};
  const money = (name: string) => formatMoney(Number(params[name] ?? 0));
  switch (reason.code) {
    case 'recurringBuy':
      return t('reason.recurringBuy', {amount: money('amount')});
    case 'recurringSkippedCash':
      return t('reason.recurringSkippedCash', {
        amount: money('amount'),
        cash: money('cash'),
      });
    case 'stopLoss':
    case 'takeProfit':
    case 'trailingStop': {
      // e.g. "Sold: trailing stop (−8%) triggered. Closed at $110.00,
      // −8.33% from the highest close of $120.00."
      const close = Number(params.close);
      const reference = Number(params.reference);
      return t(RISK_REASONS[reason.code as RiskKind], {
        percent: Number(params.percent),
        close: money('close'),
        reference: money('reference'),
        move: formatPercent((close / reference - 1) * 100),
      });
    }
    case 'maBuy':
    case 'maSell': {
      // Four sentences per side: price or two averages, with or without a
      // buffer. Separate sentences read better than gluing pieces together,
      // especially in Vietnamese, where the word order differs.
      const side = reason.code === 'maBuy' ? 'Buy' : 'Sell';
      const mode = params.mode === 'price' ? 'Price' : 'Cross';
      const buffered = Number(params.buffer) > 0 ? 'Buffer' : '';
      return t(`reason.ma${side}${mode}${buffered}` as TKey, params);
    }
    case 'maTrendBlocked':
      return t('reason.maTrendBlocked', params);
    case 'maHold':
      return t('reason.maHold');
    case 'maWarmup':
      return t('reason.maWarmup', params);
    case 'maLine':
      return t('reason.maLine', params);
    default:
      return reason.code; // a code from a newer version of the app
  }
};

// A short name for a strategy's settings, e.g. "20/50-day crossover ·
// 2% buffer".
export const describeStrategy = (settings: MaCrossSettings, t: Translate) => {
  const parts = [
    settings.mode === 'price'
      ? t('strategy.priceVsMa', {slow: settings.slowLength})
      : t('strategy.maCross', {
          fast: settings.fastLength,
          slow: settings.slowLength,
        }),
  ];
  if (settings.bufferPercent > 0) {
    parts.push(t('strategy.withBuffer', {buffer: settings.bufferPercent}));
  }
  if (settings.trendFilter) {
    parts.push(t('strategy.withTrend', {trend: settings.trendLength}));
  }
  return parts.join(' · ');
};
