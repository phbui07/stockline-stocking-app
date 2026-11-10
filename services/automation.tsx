import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {AppState} from 'react-native';
import {readJSON, writeJSON} from './storage';
import {useSession} from './session';
import {useUserData} from './userData';
import {DailyHistory, getDailyHistory} from './data';
import {
  lastCompletedMarketDate,
  MarketDate,
  toMarketDate,
} from './engine/dates';
import {
  createRecurringRule,
  editRecurringRule,
  RecurringInput,
  RecurringRule,
  setRulePaused,
} from './engine/recurring';
import {createRiskRule, RiskKind, RiskRule} from './engine/risk';
import {Bot, BotInput, createBot} from './engine/bots';
import {tradeCosts} from './engine/costs';
import {
  AutomationEvent,
  priceRequests,
  runAutomations,
  RunResult,
} from './engine/runner';

// Each user's automations, saved separately from the main user record, and
// the code that keeps them up to date. A run happens when the app opens,
// when it comes back from the background, every 15 minutes while it's open,
// after a rule changes, and when you tap "Check now".

export const AUTOMATION_VERSION = 1;
export const RUN_EVERY_MS = 15 * 60 * 1000;
const MAX_EVENTS = 200;
const MAX_FINISHED_RISK_RULES = 50; // triggered or ended rules kept for history

export interface LastRun {
  at: number;
  through: MarketDate; // the last finished trading day that was checked
  failed: string[]; // symbols whose prices couldn't be downloaded
}

export interface AutomationData {
  version: number;
  recurring: RecurringRule[];
  risk: RiskRule[];
  bots: Bot[];
  events: AutomationEvent[]; // newest first
  lastRun?: LastRun;
}

export const createAutomationData = (): AutomationData => ({
  version: AUTOMATION_VERSION,
  recurring: [],
  risk: [],
  bots: [],
  events: [],
});

// Keeps every active rule, plus the most recent finished ones.
const trimRisk = (rules: RiskRule[]) => {
  const finished = rules
    .filter(rule => rule.status !== 'active')
    .sort((a, b) => ((a.endedOn ?? '') < (b.endedOn ?? '') ? 1 : -1))
    .slice(0, MAX_FINISHED_RISK_RULES);
  return rules.filter(
    rule => rule.status === 'active' || finished.includes(rule),
  );
};

const automationKey = (email: string) => `stockline.automation.${email}`;

interface AutomationValue {
  data: AutomationData;
  loaded: boolean;
  running: boolean;
  addRecurring: (input: RecurringInput) => RecurringRule;
  editRecurring: (id: string, input: RecurringInput) => void;
  setRecurringPaused: (id: string, paused: boolean) => void;
  removeRecurring: (id: string) => void;
  // Turns a risk rule on for a position, or changes its percent.
  setRisk: (symbol: string, kind: RiskKind, percent: number) => void;
  removeRisk: (id: string) => void;
  // Bots are only set up for now; nothing runs them until Phase 7.
  addBot: (input: BotInput) => Bot;
  editBot: (id: string, input: BotInput) => void;
  removeBot: (id: string) => void;
  runNow: () => Promise<void>;
}

const AutomationContext = createContext<AutomationValue | null>(null);

export const AutomationProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const {user} = useSession();
  const email = user?.email ?? null;
  const userData = useUserData();
  const [data, setData] = useState<AutomationData>(createAutomationData);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // A run downloads prices first, which takes a while, and only then
  // applies the results. These refs let it use the latest state at that
  // moment, not the state from when it started.
  const dataRef = useRef(data);
  const emailRef = useRef(email);
  emailRef.current = email;
  const userDataRef = useRef(userData);
  userDataRef.current = userData;
  const runningRef = useRef(false);
  const rerunRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoadedFor(null);
    if (!email) {
      return;
    }
    readJSON<AutomationData | null>(automationKey(email), null).then(saved => {
      if (cancelled) {
        return;
      }
      const next = {...createAutomationData(), ...saved};
      dataRef.current = next;
      setData(next);
      setLoadedFor(email);
    });
    return () => {
      cancelled = true;
    };
  }, [email]);

  const update = useCallback(
    (change: (current: AutomationData) => AutomationData) => {
      const next = change(dataRef.current);
      dataRef.current = next;
      setData(next);
      if (email) {
        writeJSON(automationKey(email), next);
      }
    },
    [email],
  );

  const runNow = useCallback(async () => {
    if (!email) {
      return;
    }
    if (runningRef.current) {
      rerunRef.current = true; // something changed mid-run; go again after
      return;
    }
    const now = Date.now();
    const through = lastCompletedMarketDate(now);
    const requests = priceRequests(
      userDataRef.current.data.portfolio,
      dataRef.current.recurring,
      dataRef.current.risk,
      through,
    );
    const symbols = Object.keys(requests);
    if (!symbols.length) {
      return; // nothing to check
    }
    runningRef.current = true;
    setRunning(true);
    try {
      const downloads = await Promise.allSettled(
        symbols.map(symbol =>
          getDailyHistory(symbol, requests[symbol], through, now),
        ),
      );
      if (emailRef.current !== email) {
        return; // the user switched accounts while prices were downloading
      }
      const histories: Record<string, DailyHistory> = {};
      const failed: string[] = [];
      downloads.forEach((download, i) => {
        if (download.status === 'fulfilled') {
          histories[symbols[i]] = download.value;
        } else {
          failed.push(symbols[i]);
        }
      });

      let result: RunResult | undefined;
      userDataRef.current.updatePortfolio(portfolio => {
        result = runAutomations({
          portfolio,
          recurring: dataRef.current.recurring,
          risk: dataRef.current.risk,
          histories,
          through,
          unitsAsOf: toMarketDate(now),
          costs: tradeCosts(userDataRef.current.data.settings.costs),
        });
        return result.portfolio;
      });
      const outcome = result!;
      update(current => {
        const known = new Set(current.events.map(event => event.id));
        const newEvents = outcome.events
          .filter(event => !known.has(event.id))
          .reverse(); // the runner lists oldest first
        return {
          ...current,
          recurring: outcome.recurring,
          risk: trimRisk(outcome.risk),
          events: [...newEvents, ...current.events].slice(0, MAX_EVENTS),
          lastRun: {at: now, through, failed},
        };
      });
    } finally {
      runningRef.current = false;
      setRunning(false);
      if (rerunRef.current) {
        rerunRef.current = false;
        runNow();
      }
    }
  }, [email, update]);

  const ready = !!email && loadedFor === email && userData.loaded;

  useEffect(() => {
    if (!ready) {
      return;
    }
    runNow();
    const timer = setInterval(runNow, RUN_EVERY_MS);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        runNow();
      }
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [ready, runNow]);

  // Selling a whole position yourself ends its risk rules right away, so
  // they don't wake up again if you buy the stock later.
  const heldKey = Object.keys(userData.data.portfolio.positions)
    .sort()
    .join(',');
  useEffect(() => {
    if (!ready) {
      return;
    }
    const held = new Set(heldKey.split(','));
    const orphaned = (rule: RiskRule) =>
      rule.status === 'active' && !held.has(rule.symbol);
    if (!dataRef.current.risk.some(orphaned)) {
      return;
    }
    const today = toMarketDate(Date.now());
    update(current => ({
      ...current,
      risk: trimRisk(
        current.risk.map(rule =>
          orphaned(rule)
            ? {...rule, status: 'ended' as const, endedOn: today}
            : rule,
        ),
      ),
    }));
  }, [ready, heldKey, update]);

  const value = useMemo<AutomationValue>(() => {
    const changeRule = (
      id: string,
      change: (rule: RecurringRule) => RecurringRule,
    ) =>
      update(current => ({
        ...current,
        recurring: current.recurring.map(rule =>
          rule.id === id ? change(rule) : rule,
        ),
      }));
    return {
      data,
      loaded: ready,
      running,
      addRecurring: input => {
        const rule = createRecurringRule(input);
        update(current => ({
          ...current,
          recurring: [...current.recurring, rule],
        }));
        runNow();
        return rule;
      },
      editRecurring: (id, input) => {
        changeRule(id, rule => editRecurringRule(rule, input));
        runNow();
      },
      setRecurringPaused: (id, paused) => {
        changeRule(id, rule => setRulePaused(rule, paused));
        runNow();
      },
      // Purchases the rule already made stay in the portfolio.
      removeRecurring: id =>
        update(current => ({
          ...current,
          recurring: current.recurring.filter(rule => rule.id !== id),
        })),
      setRisk: (symbol, kind, percent) => {
        update(current => {
          const existing = current.risk.find(
            rule =>
              rule.symbol === symbol &&
              rule.kind === kind &&
              rule.status === 'active',
          );
          return {
            ...current,
            risk: existing
              ? current.risk.map(rule =>
                  rule === existing ? {...rule, percent} : rule,
                )
              : [...current.risk, createRiskRule(symbol, kind, percent)],
          };
        });
        runNow();
      },
      removeRisk: id =>
        update(current => ({
          ...current,
          risk: current.risk.filter(rule => rule.id !== id),
        })),
      addBot: input => {
        const bot = createBot(input);
        update(current => ({...current, bots: [...current.bots, bot]}));
        return bot;
      },
      editBot: (id, input) =>
        update(current => ({
          ...current,
          bots: current.bots.map(bot =>
            bot.id === id ? {...bot, ...input} : bot,
          ),
        })),
      removeBot: id =>
        update(current => ({
          ...current,
          bots: current.bots.filter(bot => bot.id !== id),
        })),
      runNow,
    };
  }, [data, ready, running, update, runNow]);

  return (
    <AutomationContext.Provider value={value}>
      {children}
    </AutomationContext.Provider>
  );
};

export const useAutomation = () => {
  const value = useContext(AutomationContext);
  if (!value) {
    throw new Error('useAutomation must be used inside AutomationProvider');
  }
  return value;
};
