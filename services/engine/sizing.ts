import {affordableShares} from '../portfolio';

// Position sizing: "risk at most X% of the account per trade".
//
// "Risk" means what you'd lose if the trade went wrong and the stop-loss
// sold it. With a $10,000 account, 1% risk and an 8% stop:
//   at risk:  1% of $10,000 = $100
//   position: $100 / 8%     = $1,250
// If the stop is hit, the $1,250 position loses 8%, which is $100.
//
// Without a stop there's no way to know the loss in advance, so the rule
// falls back to investing at most X% of the account.
// The position is never bigger than the cash available (no borrowing).

export interface SizingInput {
  equity: number; // the account's total value: cash plus positions
  cash: number;
  riskPercent: number;
  stopPercent?: number; // how far below the entry the stop sits
}

export const MIN_RISK_PERCENT = 0.1;
export const MAX_RISK_PERCENT = 100;

export const isValidRiskPercent = (percent: number) =>
  percent >= MIN_RISK_PERCENT && percent <= MAX_RISK_PERCENT;

// How many dollars to invest.
export const positionBudget = ({
  equity,
  cash,
  riskPercent,
  stopPercent,
}: SizingInput) => {
  const atRisk = (equity * riskPercent) / 100;
  const budget = stopPercent ? atRisk / (stopPercent / 100) : atRisk;
  return Math.max(0, Math.min(budget, cash));
};

// The shares the budget buys. With a spread, the budget has to cover it
// too, so the position is a little smaller.
export const positionShares = (
  input: SizingInput,
  price: number,
  spreadPercent = 0,
) => affordableShares(positionBudget(input), price, spreadPercent);
