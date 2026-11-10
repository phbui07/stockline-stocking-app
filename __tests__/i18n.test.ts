import vi from '../locales/vi';
import en from '../locales/en';
import {translate} from '../services/i18n';
import {formatMoney, formatPercent, formatCompact} from '../services/format';

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

it('both languages use the same placeholders for every key', () => {
  const keys = Object.keys(vi) as (keyof typeof vi)[];
  expect(Object.keys(en).sort()).toEqual([...keys].sort());
  keys.forEach(key => {
    expect([key, placeholders(en[key])]).toEqual([key, placeholders(vi[key])]);
  });
});

it('fills placeholders and leaves unknown ones alone', () => {
  expect(translate('en', 'common.shares', {count: 3})).toBe('3 shares');
  expect(translate('vi', 'common.shares', {count: 3})).toBe('3 cổ phiếu');
  expect(translate('en', 'common.shares')).toBe('{count} shares');
});

it('formats money and percentages', () => {
  expect(formatMoney(1234.5)).toBe('$1,234.50');
  expect(formatMoney(-12.3)).toBe('-$12.30');
  expect(formatMoney(5, {signed: true})).toBe('+$5.00');
  expect(formatMoney(-0.001, {signed: true})).toBe('$0.00');
  expect(formatMoney(0.1234)).toBe('$0.1234');
  expect(formatMoney(0.35, {cents: true})).toBe('$0.35'); // a fee
  expect(formatPercent(1.234)).toBe('+1.23%');
  expect(formatPercent(-0.5)).toBe('-0.50%');
  expect(formatCompact(5.07e12)).toBe('5.07T');
  expect(formatCompact(33440000)).toBe('33.44M');
});
