import type {Strategy} from '../strategy';
import {MaCrossSettings, maCrossover} from './maCrossover';

// Every strategy the app knows. To add one, import it here, add its id to
// StrategyId and its settings type to StrategySettings.

export type StrategyId = 'maCross';
export type StrategySettings = MaCrossSettings;

export const STRATEGIES: Record<StrategyId, Strategy<any>> = {
  maCross: maCrossover,
};

export const getStrategy = (id: StrategyId): Strategy<StrategySettings> =>
  STRATEGIES[id];
