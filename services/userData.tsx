import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {readJSON, writeJSON} from './storage';
import {useSession} from './session';
import {
  createPortfolio,
  DEFAULT_STARTING_CASH,
  executeOrder,
  migratePortfolio,
  OrderInput,
  Portfolio,
  Transaction,
} from './portfolio';
import {createAlert, findTriggered, PriceAlert} from './alerts';
import {onQuotesUpdated, useQuotes} from './quoteStore';
import {showNotification} from './notifications';
import {translateNow} from './i18n';
import {formatMoney} from './format';

// Per-user paper-trading data: portfolio, watchlist, alerts and settings.

export interface UserSettings {
  biometricForTrades: boolean;
  startingCash: number;
}

export interface UserData {
  portfolio: Portfolio;
  watchlist: string[];
  alerts: PriceAlert[];
  settings: UserSettings;
}

export const DEFAULT_WATCHLIST = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA'];

export const createUserData = (now = Date.now()): UserData => ({
  portfolio: createPortfolio(DEFAULT_STARTING_CASH, now),
  watchlist: DEFAULT_WATCHLIST,
  alerts: [],
  settings: {biometricForTrades: false, startingCash: DEFAULT_STARTING_CASH},
});

// Fills in fields added since the data was saved, and upgrades an old
// portfolio format to the current one.
export const migrateUserData = (saved: Partial<UserData>): UserData => {
  const defaults = createUserData();
  return {
    ...defaults,
    ...saved,
    portfolio: saved.portfolio
      ? migratePortfolio(saved.portfolio)
      : defaults.portfolio,
  };
};

const userKey = (email: string) => `stockline.user.${email}`;

interface UserDataValue {
  data: UserData;
  loaded: boolean;
  placeOrder: (order: OrderInput) => Transaction;
  isWatched: (symbol: string) => boolean;
  toggleWatch: (symbol: string) => void;
  addAlert: (
    symbol: string,
    name: string,
    target: number,
    currentPrice: number,
  ) => PriceAlert;
  removeAlert: (id: string) => void;
  rearmAlert: (id: string, currentPrice: number) => void;
  updateSettings: (patch: Partial<UserSettings>) => void;
  resetPortfolio: () => void;
}

const UserDataContext = createContext<UserDataValue | null>(null);

export const UserDataProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const {user} = useSession();
  const email = user?.email ?? null;
  const [data, setData] = useState<UserData>(() => createUserData());
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  // Orders need the latest state synchronously (two quick taps must not
  // both spend the same cash), so mirror it in a ref.
  const dataRef = useRef(data);

  useEffect(() => {
    let cancelled = false;
    setLoadedFor(null);
    if (!email) {
      return;
    }
    readJSON<UserData | null>(userKey(email), null).then(saved => {
      if (cancelled) {
        return;
      }
      const next = saved ? migrateUserData(saved) : createUserData();
      dataRef.current = next;
      setData(next);
      setLoadedFor(email);
    });
    return () => {
      cancelled = true;
    };
  }, [email]);

  const update = useCallback(
    (change: (current: UserData) => UserData) => {
      const next = change(dataRef.current);
      dataRef.current = next;
      setData(next);
      if (email) {
        writeJSON(userKey(email), next);
      }
      return next;
    },
    [email],
  );

  // Keep alert symbols live even when no screen shows them, and fire
  // notifications when a target is crossed.
  const activeAlerts = data.alerts.filter(alert => !alert.triggeredAt);
  useQuotes(activeAlerts.map(alert => alert.symbol));

  useEffect(
    () =>
      onQuotesUpdated(latest => {
        const triggered = findTriggered(dataRef.current.alerts, latest);
        if (!triggered.length) {
          return;
        }
        const now = Date.now();
        triggered.forEach(alert => {
          const price = latest.get(alert.symbol)?.price ?? alert.target;
          showNotification(
            translateNow('alerts.notifTitle', {
              symbol: alert.symbol,
              price: formatMoney(price),
            }),
            translateNow(
              alert.direction === 'above'
                ? 'alerts.notifBodyAbove'
                : 'alerts.notifBodyBelow',
              {
                name: alert.name,
                price: formatMoney(price),
                target: formatMoney(alert.target),
              },
            ),
          );
        });
        const ids = new Set(triggered.map(alert => alert.id));
        update(current => ({
          ...current,
          alerts: current.alerts.map(alert =>
            ids.has(alert.id)
              ? {
                  ...alert,
                  triggeredAt: now,
                  triggeredPrice: latest.get(alert.symbol)?.price,
                }
              : alert,
          ),
        }));
      }),
    [update],
  );

  const value = useMemo<UserDataValue>(
    () => ({
      data,
      loaded: !!email && loadedFor === email,
      placeOrder: order => {
        const result = executeOrder(dataRef.current.portfolio, order);
        update(current => ({...current, portfolio: result.portfolio}));
        return result.transaction;
      },
      isWatched: symbol => data.watchlist.includes(symbol),
      toggleWatch: symbol =>
        update(current => ({
          ...current,
          watchlist: current.watchlist.includes(symbol)
            ? current.watchlist.filter(s => s !== symbol)
            : [...current.watchlist, symbol],
        })),
      addAlert: (symbol, name, target, currentPrice) => {
        const alert = createAlert(symbol, name, target, currentPrice);
        update(current => ({...current, alerts: [alert, ...current.alerts]}));
        return alert;
      },
      removeAlert: id =>
        update(current => ({
          ...current,
          alerts: current.alerts.filter(alert => alert.id !== id),
        })),
      rearmAlert: (id, currentPrice) =>
        update(current => ({
          ...current,
          alerts: current.alerts.map(alert =>
            alert.id === id
              ? {
                  ...createAlert(
                    alert.symbol,
                    alert.name,
                    alert.target,
                    currentPrice,
                  ),
                  id: alert.id,
                }
              : alert,
          ),
        })),
      updateSettings: patch =>
        update(current => ({
          ...current,
          settings: {...current.settings, ...patch},
        })),
      resetPortfolio: () =>
        update(current => ({
          ...current,
          portfolio: createPortfolio(current.settings.startingCash),
        })),
    }),
    [data, email, loadedFor, update],
  );

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
};

export const useUserData = () => {
  const value = useContext(UserDataContext);
  if (!value) {
    throw new Error('useUserData must be used inside UserDataProvider');
  }
  return value;
};
