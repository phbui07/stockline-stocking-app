import type {Lang} from './i18n';

const moneyFormatters = new Map<string, Intl.NumberFormat>();

const moneyFormatter = (currency: string, digits: number) => {
  const key = `${currency}:${digits}`;
  let formatter = moneyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    moneyFormatters.set(key, formatter);
  }
  return formatter;
};

// Rounds away float noise so tiny negatives don't render as "-$0.00".
const clean = (value: number) => (Math.abs(value) < 0.005 ? 0 : value);

// Prices under $1 get 4 decimals ($0.1234) so penny stocks still show
// their moves. `cents` keeps 2 for amounts that are always whole cents,
// like a fee or a tax.
export const formatMoney = (
  value: number,
  {
    signed = false,
    currency = 'USD',
    cents = false,
  }: {signed?: boolean; currency?: string; cents?: boolean} = {},
) => {
  const amount = clean(value);
  const digits =
    !cents && currency === 'USD' && Math.abs(amount) > 0 && Math.abs(amount) < 1
      ? 4
      : 2;
  const text = moneyFormatter(currency, digits).format(Math.abs(amount));
  if (amount < 0) {
    return `-${text}`;
  }
  return signed && amount > 0 ? `+${text}` : text;
};

// Short money for chart axes: $7,324.23, $45.5K, $1.25M.
export const formatMoneyShort = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e6) {
    return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  }
  if (abs >= 1e4) {
    return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  }
  return formatMoney(value);
};

// Index levels (S&P 500, Nikkei...) are points, not money.
export const formatPoints = (value: number) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatPercent = (value: number, signed = true) => {
  const amount = clean(value);
  const text = `${Math.abs(amount).toFixed(2)}%`;
  if (amount < 0) {
    return `-${text}`;
  }
  return signed && amount > 0 ? `+${text}` : text;
};

// Share counts can be fractional: up to 6 decimals, without trailing zeros
// (2.5, not 2.500000).
export const formatShares = (value: number) =>
  value.toLocaleString('en-US', {maximumFractionDigits: 6});

export const formatNumber = (value: number) =>
  Math.round(value).toLocaleString('en-US');

export const formatCompact = (value: number) => {
  const abs = Math.abs(value);
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      return `${(value / size).toFixed(2)}${suffix}`;
    }
  }
  return value.toFixed(0);
};

const locale = (lang: Lang) => (lang === 'vi' ? 'vi-VN' : 'en-US');

export const formatDate = (ms: number, lang: Lang) =>
  new Date(ms).toLocaleDateString(locale(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const formatDateTime = (ms: number, lang: Lang) =>
  new Date(ms).toLocaleString(locale(lang), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

// A market date ('2026-11-10') is a calendar day, not a moment, so it's
// formatted in UTC to show the same day in every time zone.
export const formatMarketDate = (
  date: string,
  lang: Lang,
  {weekday = false, year = true} = {},
) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString(locale(lang), {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    ...(year ? {year: 'numeric'} : {}),
    ...(weekday ? {weekday: 'short'} : {}),
  });

// Keeps what the user types to digits and one decimal point, with at most
// `decimals` decimals. Vietnamese keyboards type a comma as the decimal
// separator, so a comma counts as the point.
export const cleanDecimalInput = (text: string, decimals: number) => {
  const [whole, ...rest] = text
    .replace(/,/g, '.')
    .replace(/[^0-9.]/g, '')
    .split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, decimals)}` : whole;
};

// Keeps only digits, for whole numbers like a number of days.
export const cleanIntegerInput = (text: string) => text.replace(/[^0-9]/g, '');

export const formatTime = (ms: number, lang: Lang) =>
  new Date(ms).toLocaleTimeString(locale(lang), {
    hour: '2-digit',
    minute: '2-digit',
  });

export const changeColor = (value: number) =>
  clean(value) >= 0 ? '#5DC172' : '#FF4444';
