import {RISK_LIMITS} from './risk';
import {getStrategy, StrategyId, StrategySettings} from './strategies';
import {isValidRiskPercent} from './sizing';

// A bot: a strategy with its settings, the stock it trades, its exits and
// how big its positions are. In this phase bots are only set up and
// previewed. They'll be backtested in Phase 4 and run forward with virtual
// money in Phase 7.

// Exits the bot uses on top of its own sell signal, as percentages. Missing
// means off.
export interface BotExits {
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;
}

export interface BotInput {
  symbol: string;
  name: string;
  strategy: StrategyId;
  settings: StrategySettings;
  exits: BotExits;
  riskPercent: number; // position sizing: risk at most X% of the account per trade
}

export interface Bot extends BotInput {
  id: string;
  createdAt: number;
}

export const DEFAULT_RISK_PERCENT = 100;

export const createBot = (
  input: BotInput,
  now = Date.now(),
  id = `bot-${now}-${Math.random().toString(36).slice(2, 8)}`,
): Bot => ({...input, id, createdAt: now});

export const validateBot = (input: BotInput): string[] => {
  const errors = getStrategy(input.strategy).validate(input.settings);
  for (const kind of ['stopLoss', 'takeProfit', 'trailingStop'] as const) {
    const percent = input.exits[kind];
    if (
      percent !== undefined &&
      !(percent >= RISK_LIMITS[kind].min && percent <= RISK_LIMITS[kind].max)
    ) {
      errors.push(kind);
    }
  }
  if (!isValidRiskPercent(input.riskPercent)) {
    errors.push('riskPercent');
  }
  return errors;
};

// How far below the entry price the first exit would sell, for sizing.
// A trailing stop starts at the entry price, so at first it sits the same
// distance below as a stop-loss would. With both, the closer one counts.
export const stopDistance = (exits: BotExits): number | undefined => {
  const stops = [exits.stopLoss, exits.trailingStop].filter(
    (percent): percent is number => percent !== undefined,
  );
  return stops.length ? Math.min(...stops) : undefined;
};
