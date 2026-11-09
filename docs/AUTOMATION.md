# Automation: design notes

Stockline is adding automations that let you test investing and trading strategies with virtual money, and compare them honestly against simply holding an index fund. Everything is simulated. Nothing here places real trades.

## Phases

Each phase ends with the tests, type check and lint passing, plus a run on the iOS simulator.

| Phase | Feature | Status |
|---|---|---|
| 0 | Foundations: price-data interface, market dates, fractional shares, lots, trade sources and reasons | Done |
| 1 | Recurring investments (dollar-cost averaging) | Done |
| 2 | Automatic risk rules: stop-loss, take-profit, trailing stop | Done |
| 3 | Strategy engine and moving-average crossover bot | |
| 4 | Backtester | |
| 5 | Realistic costs: slippage and short-term tax | |
| 6 | Trade log with explanations | |
| 7 | Forward testing | |
| 8 | Automatic rebalancing | |

## Where the code lives

- `services/engine/`: the engine. Pure TypeScript with no React and no network, so every rule can be unit tested with small, hand-calculated price series.
  - `dates.ts`: market dates.
  - `recurring.ts`: recurring-investment schedules.
  - `risk.ts`: stop-loss, take-profit and trailing-stop lines.
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

## Saved-data versions

`Portfolio.version` is 2. Version 1, from before lots existed, stored each position as total shares plus an average cost. `migratePortfolio` turns each old position into one lot dated at its first purchase, and marks old trades as manual. The upgrade runs every time saved data is loaded, and the new format is written the next time anything changes.
