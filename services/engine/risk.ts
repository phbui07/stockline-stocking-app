import {addDays, MarketDate, nextOpenMarketDate} from './dates';

// Automatic risk rules attached to a position. Each one draws a price line
// and sells the whole position when a daily close crosses it:
// - stop-loss: X% below your average cost (limits a loss)
// - take-profit: X% above your average cost (locks in a gain)
// - trailing stop: X% below the highest close since you bought. The line
//   only moves up, so it follows a rising price and sells after a fall.
//
// Rules only look at closing prices, once a day. If a stock drops a lot in
// one day, the sale happens at that close, which can be well past the line.

export type RiskKind = 'stopLoss' | 'takeProfit' | 'trailingStop';

// Also the order in which same-day triggers are reported.
export const RISK_KINDS: RiskKind[] = [
  'stopLoss',
  'trailingStop',
  'takeProfit',
];

export type RiskStatus = 'active' | 'triggered' | 'ended';

export interface RiskRule {
  id: string;
  symbol: string;
  kind: RiskKind;
  percent: number; // 8 means 8%
  createdAt: number;
  // The first close the rule checks: the first one that wasn't known when
  // it was created. Rules never act on prices from before they existed.
  startDate: MarketDate;
  checkedThrough?: MarketDate; // the last close already checked
  status: RiskStatus;
  endedOn?: MarketDate; // when it triggered, or ended because the position closed
  tradeId?: string; // the sale it made
}

// Percent limits per kind. A loss can't be 100% or more of what you paid,
// but a gain can be.
export const RISK_LIMITS: Record<RiskKind, {min: number; max: number}> = {
  stopLoss: {min: 0.5, max: 90},
  trailingStop: {min: 0.5, max: 90},
  takeProfit: {min: 0.5, max: 1000},
};

export const isValidRiskPercent = (kind: RiskKind, percent: number) =>
  percent >= RISK_LIMITS[kind].min && percent <= RISK_LIMITS[kind].max;

export const createRiskRule = (
  symbol: string,
  kind: RiskKind,
  percent: number,
  now = Date.now(),
  id = `risk-${now}-${Math.random().toString(36).slice(2, 8)}`,
): RiskRule => ({
  id,
  symbol,
  kind,
  percent,
  createdAt: now,
  startDate: nextOpenMarketDate(now),
  status: 'active',
});

// The next close this rule still has to check.
export const firstUnchecked = (rule: RiskRule): MarketDate =>
  rule.checkedThrough ? addDays(rule.checkedThrough, 1) : rule.startDate;

// The price a rule measures from: your average cost for stop-loss and
// take-profit, the highest close since you bought for a trailing stop.
export const riskReference = (
  kind: RiskKind,
  avgCost: number,
  highestClose: number,
) => (kind === 'trailingStop' ? highestClose : avgCost);

// Where the line sits. Written as reference × (100 − X) / 100 rather than
// reference × (1 − X/100) because 0.92 isn't exact in floating point, but
// 92 / 100 of a whole number of cents usually is.
// Example: average cost $100, 8% stop-loss → $92.
export const riskLine = (kind: RiskKind, percent: number, reference: number) =>
  kind === 'takeProfit'
    ? (reference * (100 + percent)) / 100
    : (reference * (100 - percent)) / 100;

// Whether a close crosses the line. Touching it counts.
export const crossesLine = (kind: RiskKind, close: number, line: number) =>
  kind === 'takeProfit' ? close >= line : close <= line;
