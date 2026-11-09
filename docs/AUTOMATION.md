# Automation: design notes

Stockline is adding automations that let you test investing and trading strategies with virtual money, and compare them honestly against simply holding an index fund. Everything is simulated. Nothing here places real trades.

## Phases

Each phase ends with the tests, type check and lint passing, plus a run on the iOS simulator.

| Phase | Feature | Status |
|---|---|---|
| 0 | Foundations: price-data interface, market dates, fractional shares, lots, trade sources and reasons | Done |
| 1 | Recurring investments (dollar-cost averaging) | Done |
| 2 | Automatic risk rules: stop-loss, take-profit, trailing stop | Done |
| 3 | Strategy engine and moving-average crossover bot | Done |
| 4 | Backtester | Done |
| 5 | Realistic costs: slippage and short-term tax | |
| 6 | Trade log with explanations | |
| 7 | Forward testing | |
| 8 | Automatic rebalancing | |

## Where the code lives

- `services/engine/`: the engine. Pure TypeScript with no React and no network, so every rule can be unit tested with small, hand-calculated price series.
  - `dates.ts`: market dates.
  - `recurring.ts`: recurring-investment schedules.
  - `risk.ts`: stop-loss, take-profit and trailing-stop lines.
  - `strategy.ts`: the `Strategy` interface every strategy follows.
  - `strategies/`: the strategies, plus a registry (`strategies/index.ts`). To add RSI, write `strategies/rsi.ts` and register it there.
  - `indicators.ts`: moving averages.
  - `signals.ts`: replays a strategy day by day to find its past buy and sell signals.
  - `sizing.ts`: position sizing.
  - `bots.ts`: a bot's saved settings.
  - `backtest.ts`: the backtester.
  - `metrics.ts`: total and yearly return, and worst drop.
  - `runner.ts`: replays missed days in order. Each day it checks risk rules first, then makes recurring purchases. Later phases add their steps to the same loop.
- `services/automation.tsx`: saves each user's automations (`stockline.automation.<email>`), downloads prices and calls the runner. It runs when the app opens, when it returns from the background, every 15 minutes while it's open, after a rule changes, and on "Check now".
- `services/reasons.ts`: turns stored reasons and schedules into sentences in the current language.
- `views/automation/`: the Automate screens.
- `services/data/`: daily prices.
  - `types.ts`: the `DailyPriceProvider` interface.
  - `yahooProvider.ts`: the real prices.
  - `mockProvider.ts` and `sampleData.ts`: offline prices.
  - `cachedProvider.ts`: keeps downloads on the device.
  - `index.ts`: the one function the app calls, `getDailyHistory`.
- `services/portfolio.ts`: the simulated portfolio: orders, lots, splits.

## Decisions

- **Market data:** Yahoo Finance for now, behind the provider interface. It's unofficial and not licensed for a published app, so it must be replaced before publishing (see [PUBLISHING.md](PUBLISHING.md)). Only `data/yahooProvider.ts` would change.
- **Daily closes only:** automations never use live prices.
- **Position sizing is risk-based:** a trade is sized so that hitting its stop-loss loses at most X% of the account. With no stop set, it invests at most X% of the account.
- **Bot money:** a forward-testing bot trades from a pot of cash moved out of the main portfolio. That lets rebalancing move money between the index fund and the bots.
- **Missed days:** the app can't run while it's closed. When it opens, it replays each finished trading day it missed, in order, at that day's closing price. The backtester uses the same code, so live results and backtests follow the same rules.

## Assumptions

These keep the simulation simple. Each one is a known gap from real trading.

- **Market dates** are `'YYYY-MM-DD'` strings on the New York calendar (`engine/dates.ts`). A day counts as finished from 4:30 pm New York time, which gives providers time to publish the final close. Holidays need no calendar, because they simply have no price data.
- **Prices:**
  - `close` is adjusted for splits: every past price is converted to today's shares.
  - `adjClose` is also adjusted for dividends, as if each dividend were reinvested.

  Trades use `close`. Comparing returns uses `adjClose`, so the strategy, buy-and-hold and SPY are measured the same way.
- **Fractional shares** are kept to 6 decimals; money to the cent.
- **Lots:**
  - Each purchase is a separate lot.
  - Sales use the oldest lots first (FIFO, the usual US default). So realized profit is measured against the lots actually sold, not the average cost.
  - Buying fees are included in a lot's cost.
- **Splits:** prices are always quoted in the shares that exist on the day you look. A lot remembers which day's shares it's counted in (`unitsAsOf`). After a split, `applySplit` converts older lots: 1 share at $1,000 becomes 10 shares at $100.
- **Dividends** are not paid into the live portfolio. Backtests include them through adjusted prices.

## Recurring investments (Phase 1)

- **Schedules:**
  - weekly or every 2 weeks on a chosen weekday;
  - monthly on day 1 to 28. Days 29–31 are left out so every month has the day.
- **When they start:** a new rule starts at the first close that isn't known yet, so it never buys at a price you've already seen. Development builds can pick a past start date to test catching up.
- **Weekends and holidays:** a purchase fills at the close of the first trading day on or after its date.
- **Each purchase** buys the amount's worth of shares, rounded down to a millionth of a share so it never costs more than the amount.
- **Not enough cash:** the purchase is skipped and logged. It isn't made up later.
- **Pausing:** purchases that fall while a rule is paused are skipped. Resuming continues from the next open day.
- **Several rules on the same day:** the oldest rule gets the cash first.
- **No double purchases:** each purchase has a fixed id (`recurring:<rule>:<date>`), so a run repeated after a crash doesn't buy twice.
- **Splits:** the runner downloads split events for held stocks and converts older lots (see Assumptions).
- **Order of trade history:** catch-up purchases are dated at their past close, so `executeOrder` inserts trades by date to keep the history newest first.

## Risk rules (Phase 2)

- **Where to set them:** on a stock you own: stock page → Your position → Risk rules. You can have one of each kind per position.
- **Lines:**
  - stop-loss: average cost × (100 − X) / 100;
  - take-profit: average cost × (100 + X) / 100;
  - trailing stop: highest close since the oldest remaining purchase × (100 − X) / 100.

  A close that touches the line counts.
- **No hindsight:** a rule only checks closes that weren't known when it was turned on (`startDate`). The runner's day loop can replay earlier days for other automations, and a test makes sure the rule ignores them.
- **Each close is checked once:** a rule remembers `checkedThrough`, so a later purchase that changes the average cost can't make it re-check an old close and sell after the fact.
- **The trailing stop counts highs from before the rule existed.** The spec says "highest close since purchase". So if the price has already fallen far from its peak, the first close checked can sell. The rule screen warns about this.
- **Selling:**
  - A triggered rule sells the whole position at that day's close. After a big one-day move, that can be well past the line.
  - The position's other rules end.
  - Selling the whole position by hand also ends its rules.
- **Same-day order:** risk rules run before recurring purchases, so a stop-loss acts on what you held coming into the day.
- **No double sales:** each sale's id is `risk:<rule>`, so one rule can't sell twice.

## Strategy engine and bots (Phase 3)

- **A strategy** gets the price history up to and including the current day, plus whether it holds the stock, and returns BUY, SELL or HOLD with a reason. Callers pass `history.slice(0, i + 1)`, so later prices can't reach it. A test checks the strategy only ever sees `i + 1` bars, and another checks that changing later prices doesn't change earlier signals.
- **Moving-average crossover:**
  - **Fast and slow lines:** the fast line is the close ("price" mode) or a short average ("cross" mode). The slow line is a longer average.
  - **State rule:** it's in the market while fast > slow. So starting mid-trend buys on the first day, rather than waiting for the next cross.
  - **Buffer of X%:** buy only above slow × (100 + X) / 100, and sell only below slow × (100 − X) / 100. In between, it keeps its position.
  - **Trend filter:** blocks buys while the close is at or below the long average. It never forces a sale.
- **Prices:** strategies use split-adjusted closes, the prices the charts show, not dividend-adjusted ones. Backtests reinvest dividends (see Phase 4).
- **Position sizing (risk-based):**
  - Formula: budget = equity × risk% ÷ stop%, capped at the cash available.
  - The stop is the closer of the bot's stop-loss and trailing stop. A trailing stop starts at the entry price, so at first it sits the same distance below.
  - With no stop, the budget is equity × risk%.
- **Bots** are saved settings only: stock, strategy, exits and sizing. Nothing trades them until forward testing (Phase 7).
- **Wording:** the setup screen describes the latest close factually. It never says "buy now" (see [PUBLISHING.md](PUBLISHING.md)).
- **Charts:** `components/MultiLineChart.tsx` is a small react-native-svg chart with several lines and ▲/▼ markers. Phase 4's equity curves will reuse it.

## Backtester (Phase 4)

**Where:** Automate → a bot → Save and backtest. It tests the saved bot over 1/3/5/10 years, Max (since 1980, or since the stock was listed), or custom dates, from a starting balance.

**Each simulated day, in order:**
1. **Dividends:** if the bot holds the stock on an ex-dividend date, the dividend buys more shares at that close.
2. **Exits:**
   - Stop-loss and take-profit are measured from the entry price.
   - The trailing stop is measured from the highest close since the entry.
   - Exits are checked from the day after the entry.
3. **Strategy:** it sees `historyUpTo(bars, i, warmup)`, meaning the last `warmupBars` days ending today.
4. **Value:** the account's value at the close is recorded.

**Assumptions:**
- **Fills:** every trade fills at that day's close.
- **No immediate rebuy:** after an exit, the bot waits until its rule would sell (the trend turns negative) before it can buy again. Otherwise a stop-loss in a still-rising trend would sell and immediately rebuy at the same price.
- **Sizing:** risk-based (see Phase 3), using the account's cash, which is its whole value while it's out of the market.
- **Benchmarks:** buy-and-hold of the same stock and SPY are measured the same way, with everything invested at the first close and dividends reinvested at each ex-date's close. When the bot trades SPY, holding SPY *is* the index comparison, so there's no separate SPY column.
- **Cash** earns 0%.
- **Not included:** fees, spreads and taxes (Phase 5).

**Warm-up:** prices are downloaded from about 1.6 × `warmupBars` calendar days before the start date, so a 200-day average exists on day one.

**Same period for all lines:** the test starts once both the stock and SPY have prices. `startedLate` is true if that is more than 5 days after the requested start; a weekend or holiday start doesn't count.

**Results:**
- total return, return per year (shown only for periods of a year or more), and worst drop for each line;
- closed and open round trips, win rate (closed trades only), and the percentage of days invested;
- an account-value chart and a price chart with ▲/▼ trades;
- the list of trades with their exit reasons.

**Tests (`__tests__/backtest.test.ts`):**
- **Hand-checked:** every number in a full run is worked out by hand.
- **Look-ahead, two tests:**
  - A spy strategy must only ever see days up to the one it decides.
  - Two price series that differ only after day 4 must give identical results through day 4.

  Both were confirmed to fail when a leak is injected: showing the strategy tomorrow's price, or the whole history.
- **Speed:** 25 years of daily prices must run in under 2 seconds.

**Checked against real data:** a 10-year SPY 20/50 backtest matches an independent script, written separately and sharing no app code, to the cent.

## Saved-data versions

`Portfolio.version` is 2. Version 1, from before lots existed, stored each position as total shares plus an average cost. `migratePortfolio` turns each old position into one lot dated at its first purchase, and marks old trades as manual. The upgrade runs every time saved data is loaded, and the new format is written the next time anything changes.
