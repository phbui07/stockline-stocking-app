# StockingApp

Stockline is a stock-tracking and practice-trading app built with React Native 0.88 (New Architecture), React 19 and React Navigation 7. Prices are live; trades use virtual cash, so no real money is involved.

## Features

- **Live market data:** quotes, intraday sparklines, 1D–5Y charts, symbol search and news from Yahoo Finance. Prices refresh every 20 seconds while the app is in the foreground.
- **Practice trading:** every account starts with $100,000 in virtual cash. Buy and sell orders fill instantly at the latest price. Holdings, average cost, unrealized and realized P&L, trade history and a portfolio performance chart are computed from your trades.
- **Recurring investments** (Home or Trade → Automate): buy a fixed dollar amount of a stock or ETF every week, every 2 weeks or every month, in fractional shares. Purchases fill at each day's closing price, and missed days are caught up when the app opens. See [docs/AUTOMATION.md](docs/AUTOMATION.md).
- **Risk rules** (stock page → Your position → Risk rules): stop-loss, take-profit and trailing stop. Each one sells the whole position when a daily close crosses its line.
- **Strategy bots** (Automate → Strategy bots): set up a moving-average crossover, choosing price vs average or two averages, the lengths, an optional buffer, an optional trend filter, exits and risk-based position sizing. A chart shows where its buy and sell signals fell over the past year. Bots don't trade yet.
- **Growth rankings** (Home → Growth rankings): about 100 large US companies ranked by price change over the latest day, week, month or year, showing either the top gainers or the top losers.
- **Watchlist** you can search and sort, and **price alerts** that send a notification when a target is crossed while the app is open.
- **On-device accounts:** sign up, log in, or continue as a guest without an account. You stay logged in, and can log out, change your name and password, verify a phone number, and reset a forgotten password with a 5-digit code delivered as a local notification.
- **Learn about a stock** (stock page → "Learn about this stock"):
  - **AI explainer:** plain-language explanations from Google's Gemini (free tier). It never gives buy/sell recommendations.
  - **Indicator history:** how often the price rose after simple indicators over the past few years, compared with the base rate.
- **Vietnamese and English**, switchable in Profile → Language.
- Optional Face ID or fingerprint confirmation for trades (Profile → Security).

Demo account: `a1@gmail.com` / `123456`.

## Prerequisites

- **Node.js 22.11 or newer**
- **npm.** The project uses `package-lock.json`, so there's no Yarn lockfile.
- **Watchman** (recommended): `brew install watchman`

For iOS (macOS only):

- **Xcode** (tested with Xcode 27.1) with an iOS Simulator runtime installed
- Make Xcode the active developer directory (the default is Command Line Tools, which can't build iOS apps):
  ```sh
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
  ```
- **CocoaPods**: `brew install cocoapods`

For Android:

- **Android Studio**, which bundles a JDK. Use its SDK Manager to install Android SDK Platform 37, Build-Tools 37.0.0, and NDK 27.1.12297006.
- Point your shell at the SDK and tools (for example in `~/.zshrc`):
  ```sh
  export ANDROID_HOME="$HOME/Library/Android/sdk"
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"
  ```
- An emulator (create one in Android Studio's Device Manager) or a device with USB debugging enabled.

## Setup

```sh
npm install
npm run pods   # iOS only: installs CocoaPods dependencies (rerun after adding native libraries)
```

## Running

Start Metro (the JS bundler) and leave it running in its own terminal:

```sh
npm start
```

In a second terminal, build and launch the app:

```sh
npm run ios       # iOS Simulator
npm run android   # Android emulator or connected device
```

To pick a specific simulator, use `npm run ios -- --simulator "iPhone 17"`. You can also open `ios/StockingApp.xcworkspace` in Xcode (the workspace, not the `.xcodeproj`), or the `android/` folder in Android Studio, and run from there.

When the app is running, press <kbd>R</kbd> in the Metro terminal to reload. Press <kbd>D</kbd> to open the developer menu.

## Checks

```sh
npm test            # Jest: unit tests plus end-to-end flows against a fake Yahoo
npm run lint        # ESLint
npm run typecheck   # TypeScript
```

## AI explainer setup

The AI explainer uses your own free Gemini API key:

1. Create a key at [Google AI Studio](https://aistudio.google.com/apikey). It's free and needs no billing.
2. In the app, open a stock's "Learn about this stock" page, or Profile → Settings, and paste the key. The app checks it with Google, then saves it on the device.

The app uses `gemini-3.8-flash`. When that model's free daily quota runs out, it falls back to `gemini-3.5-flash-lite`. Each explanation is cached per stock and language for the day.

Only public market data is sent to Google, never your account or portfolio. On the free tier, Google may use what's sent to improve its products.

See [docs/PUBLISHING.md](docs/PUBLISHING.md) for the legal limits this feature is designed around, and what to change before publishing.

## How it's organized

- `services/marketData.ts` talks to Yahoo Finance for the live screens (quotes, charts, search, news). Daily closes for automations go through the provider interface in `services/data/`, which has a Yahoo version and an offline sample version. To switch data providers, rewrite `marketData.ts` and `data/yahooProvider.ts` and keep their exported types.
- `services/engine/` holds the automation engine: pure functions with no screens and no network. See [docs/AUTOMATION.md](docs/AUTOMATION.md).
- `services/quoteStore.ts` shares live quotes between screens and handles polling.
- `services/portfolio.ts` and `services/alerts.ts` hold the trading and alert rules as pure, unit-tested functions.
- `services/aiExplainer.ts` builds the AI prompt from public data, calls Gemini, filters out advice and caches results. `services/indicators.ts` computes the indicator history.
- `services/session.tsx` (accounts) and `services/userData.tsx` (portfolio, watchlist, alerts, settings per user) persist to AsyncStorage.
- `locales/vi.ts` and `locales/en.ts` hold every UI string. TypeScript fails the build if a key is missing from either.

## Configuration notes

- **Market data** comes from Yahoo Finance's public endpoints. They're unofficial, can change without notice, and Yahoo's terms allow personal use only. The company profile and yearly financials (stock detail → About and Details) use an endpoint Yahoo rate-limits. When it refuses, those sections show a Retry button, and everything else keeps working.
- **Google Sign-In on iOS** needs an iOS OAuth client ID. Until one is set, the Google button explains that it isn't set up. Set `googleIosClientId` in `services/useGoogleSignIn.ts` and add the reversed client ID as a URL scheme in `ios/StockingApp/Info.plist`. See the [Google Sign-In setup guide](https://react-native-google-signin.github.io/docs/setting-up/ios). Android uses `android/app/google-services.json`.
- **Verification codes and price alerts** are local notifications. If notifications are turned off, the code is shown in a dialog instead.
- Accounts, including passwords, are stored unencrypted on the device with AsyncStorage. There's no backend, so this is only suitable for a practice app.
