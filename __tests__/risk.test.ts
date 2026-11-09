import {
  createRiskRule,
  crossesLine,
  firstUnchecked,
  isValidRiskPercent,
  riskLine,
  riskReference,
} from '../services/engine/risk';

const utc = (iso: string) => Date.parse(`${iso}Z`);

it('riskLine puts the line X% from the reference price', () => {
  expect(riskLine('stopLoss', 8, 100)).toBe(92);
  expect(riskLine('takeProfit', 20, 100)).toBe(120);
  expect(riskLine('trailingStop', 8, 120)).toBe(110.4);
  // Fractions of a percent work too: 7.5% below $40 is $37.
  expect(riskLine('stopLoss', 7.5, 40)).toBe(37);
});

it('crossesLine counts touching the line', () => {
  expect(crossesLine('stopLoss', 92, 92)).toBe(true);
  expect(crossesLine('stopLoss', 92.01, 92)).toBe(false);
  expect(crossesLine('takeProfit', 120, 120)).toBe(true);
  expect(crossesLine('takeProfit', 119.99, 120)).toBe(false);
});

it('riskReference uses average cost, or the high for a trailing stop', () => {
  expect(riskReference('stopLoss', 100, 150)).toBe(100);
  expect(riskReference('takeProfit', 100, 150)).toBe(100);
  expect(riskReference('trailingStop', 100, 150)).toBe(150);
});

it('isValidRiskPercent keeps losses under 100%', () => {
  expect(isValidRiskPercent('stopLoss', 0.5)).toBe(true);
  expect(isValidRiskPercent('stopLoss', 0.4)).toBe(false);
  expect(isValidRiskPercent('stopLoss', 90)).toBe(true);
  expect(isValidRiskPercent('trailingStop', 95)).toBe(false);
  expect(isValidRiskPercent('takeProfit', 300)).toBe(true);
  expect(isValidRiskPercent('takeProfit', NaN)).toBe(false);
});

it('a new rule starts with the first close that isn’t known yet', () => {
  // Monday 9 Nov at 10 am New York time: Monday's close is still to come.
  const morning = createRiskRule(
    'AAPL',
    'stopLoss',
    8,
    utc('2026-11-09T15:00'),
  );
  expect(morning).toMatchObject({status: 'active', startDate: '2026-11-07'});
  // That's the Saturday after the last finished day (Fri 6 Nov); the runner
  // only checks days with prices, so the first close it sees is Monday's.
  expect(firstUnchecked(morning)).toBe('2026-11-07');
  expect(firstUnchecked({...morning, checkedThrough: '2026-11-09'})).toBe(
    '2026-11-10',
  );
});
