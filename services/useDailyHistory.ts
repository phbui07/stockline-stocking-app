import {useEffect, useState} from 'react';
import {DailyHistory, getDailyHistory} from './data';
import {lastCompletedMarketDate, MarketDate} from './engine/dates';

// Finished daily closes for one stock from `from` until the latest finished
// day, for screens that show what an automation will compare against.
export const useDailyHistory = (symbol: string, from?: MarketDate) => {
  const [history, setHistory] = useState<DailyHistory | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!symbol || !from) {
      return;
    }
    let cancelled = false;
    setFailed(false);
    getDailyHistory(symbol, from, lastCompletedMarketDate())
      .then(result => !cancelled && setHistory(result))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [symbol, from]);

  return {history, failed};
};
