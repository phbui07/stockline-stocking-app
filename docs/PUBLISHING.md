# Before publishing Stockline

Research notes from October 2026 on the legal limits that apply to Stockline's AI explainer, indicator statistics and market data. **This is research, not legal advice.** Get a Vietnamese securities lawyer's opinion before a Vietnam launch, and US counsel before a US launch. Items marked *[unverified]* couldn't be confirmed from primary sources.

## What the app does today to stay inside the limits

- **No recommendations.** The AI is told never to say buy, sell, hold, accumulate or avoid, and never to give ratings, price targets, forecasts, allocations or "should". `findAdvice()` in `services/aiExplainer.ts` checks every answer in both languages; the app retries once, then removes any sentences that still match.
- **AI labels.** Every explanation is labeled "AI-generated, for education only; not investment advice", with the model name and time. An AI notice appears at the start of each session.
- **No personal data to the AI.** Only public market data is sent to Google. Portfolio facts ("this stock is 12% of your portfolio") are calculated on the phone and never sent.
- **Neutral indicator statistics.** Each indicator shows its sample size, date range and the base rate for all days, with a hypothetical-results caveat and a warning when there are fewer than 50 cases. The indicator statistics never call anything a "signal", and nothing sends alerts based on indicators.
- **Automations are rules you set yourself.** Recurring investments, risk rules and strategy bots only do what you configure, with virtual money. The app suggests no stocks and no settings: the inputs are empty, or use textbook defaults such as 20/50-day averages.
- **Tax figures are estimates at a rate the user sets.** The Costs screen says they're for learning only and not tax advice, and the app never suggests what anyone's rate is. The 24% default is a common US bracket, labeled as an example.
- **Strategy bot signals are historical.** The bot setup screen marks where *your* rule would have bought and sold over the past year. For the latest close it states facts ("the 20-day average was 3.8% below the 50-day") and never says "buy now". There are no alerts or notifications for signals. Every automation screen shows "Simulated with virtual money. For education only, not investment advice."
- **Virtual money only.** There are no real orders and no brokerage connection.

## Key rules

### Vietnam
- **Advice is a licensed business.** Law on Securities 54/2019, Art. 4(32), defines securities investment advisory as giving clients analysis *and* recommendations to buy, sell or hold securities. Art. 12(4) bans doing it without an SSC licence, and a licence needs VND 10bn charter capital (Decree 155/2020, Art. 175). [Law text](https://pbgdpl.cantho.gov.vn/attachment/272)
- **Penalties.** Unlicensed securities business is fined VND 200–300m for organisations, and half that for individuals (Decree 156/2020, Arts. 5 and 24). [Consolidated text](https://caselaw.vn/van-ban-phap-luat/368991-nghi-dinh-so-156-2020-nd-cp-ngay-31-12-2020-cua-chinh-phu-quy-dinh-ve-xu-phat-vi-pham-hanh-chinh-trong-linh-vuc-chung-khoan-va-thi-truong-chung-khoan)
- **Enforcement.** In April 2026 the SSC fined ITP JSC VND 225m and banned it from securities activities for 2 years for publishing technical analysis with buy/sell/hold recommendations on its website. [Báo Pháp luật](https://doanhnhan.baophapluat.vn/dau-tu-itp-bi-phat-225-trieu-dong-va-cam-hoat-dong-chung-khoan-2-nam-do-tu-van-trai-phep.html)
- **AI Law 134/2025/QH15** (in force 1 March 2026). Users must be told when they're dealing with AI, and AI-generated content given to the public must be clearly labeled. Providers self-classify the system's risk. Personal, non-commercial use is excluded. [Baker McKenzie summary](https://www.bakermckenzie.com/en/insight/publications/2026/02/vietnam-artificial-intelligence-law-foundation-and-outlook)
- **Personal data.** The Personal Data Protection Law 91/2025/QH15 and Decree 356/2025 (in force 1 January 2026) require consent. Sending personal data abroad, for example to an AI API, needs a cross-border transfer dossier. Financial transaction history counts as sensitive data; *[unverified]* whether virtual trades count. [Tilleke & Gibbins](https://www.tilleke.com/insights/vietnams-new-personal-data-protection-law-a-closer-look/)
- *[unverified]* Whether commentary on US-listed stocks for Vietnamese users falls under the Securities Law. Don't rely on it falling outside.

### United States
- **Publisher's exclusion.** Under *Lowe v. SEC* (1985), impersonal, bona fide content published on a regular schedule is outside the Investment Advisers Act. Personalised advice is not. [Opinion](https://www.law.cornell.edu/supremecourt/text/472/181)
- **Backtests.** The SEC Marketing Rule treats backtests as hypothetical performance, and the SEC has fined advisers for showing it on public websites. The rule binds advisers only, but it's a good standard to follow. [Rule 206(4)-1](https://www.law.cornell.edu/cfr/text/17/275.206(4)-1), [2023 sweep](https://www.sec.gov/newsroom/press-releases/2023-173-sec-sweep-marketing-rule-violations-results-charges-against-nine-investment-advisers)
- **"AI washing."** Don't overstate what the AI can do. In March 2024 the SEC charged Delphia and Global Predictions over false AI claims. [SEC](https://www.sec.gov/newsroom/press-releases/2024-36)

### App stores
- **Apple.** Trading and investing apps should come from the financial institution providing the service (3.2.1(viii)). Apps in financial services should be submitted by a legal entity, not an individual (5.1.1(ix)). Data shared with third-party AI needs disclosure and explicit permission (5.1.2(i)). [Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **Google Play.** Apps with financial features need the Financial features declaration, and stock-trading apps need an organisation account with a D-U-N-S number. Apps that generate AI content need an in-app way to report it. [Financial Services](https://support.google.com/googleplay/android-developer/answer/9876821), [AI content](https://support.google.com/googleplay/android-developer/answer/13985936)
- *[unverified]* Whether a paper-trading app counts as "trading" for either store. Expect it to depend on the reviewer.

### Data and AI providers
- **Yahoo Finance.** Yahoo's terms bar automated collection and commercial use, so the endpoints this app uses aren't allowed in a published app. [Terms](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html)
- **Gemini API free tier.** Google's terms say:
  - the free tier is for developers, not for consumer use
  - users must be 18 or older
  - don't send personal information
  - Google may use free-tier content to improve its products
  - apps used in the EEA, Switzerland or the UK must use paid services

  Google's Generative AI policy also bans misleading claims of expertise in finance. [Gemini API terms](https://ai.google.dev/gemini-api/terms), [Prohibited use policy](https://policies.google.com/terms/generative-ai/use-policy)

## Checklist

**Fine for personal use now**
- Paper trading with virtual cash on your own devices.
- The AI explainer and indicator statistics for your own learning, with your own free Gemini key.
- Yahoo data for prototyping. This is technically outside Yahoo's terms, but the practical risk is low.

**Before publishing**
1. **Data.** Replace Yahoo with a licensed provider that allows display and redistribution, including news. Options: Massive (formerly Polygon.io), Alpaca, Finnhub, Twelve Data, Tiingo, Intrinio.
2. **AI key.** Move the Gemini key to a server and switch to the paid tier. Add per-user rate limits.
3. **Legal entity.** Publish under a company with organisation developer accounts (D-U-N-S for Google Play).
4. **Naming.** Present the app as a "simulator" and say "virtual money" in the title, screenshots and onboarding.
5. **Consent and privacy.** Add an explicit consent screen before the first AI call, a privacy policy, and an in-app button to report AI output. Check whether a cross-border transfer dossier is needed.
6. **Age.** Add an age gate (18+) to match the Gemini terms, or choose an AI provider whose terms fit your audience.
7. **AI Law.** Self-classify the AI feature's risk under Vietnam's AI Law and Decree 142/2026.
8. **Claims.** Don't monetise the analysis and don't make accuracy claims until you've had legal review.
9. **Legal review.** Get a Vietnamese securities lawyer's opinion, and consider asking the SSC in writing.
10. **Strategy signals and backtests.**
    - Ask the lawyer specifically whether showing buy/sell signals from a rule the user builds counts as a "recommendation". The ITP case above involved published technical analysis with buy/sell calls.
    - Keep signals historical, user-configured and alert-free unless the lawyer says otherwise.
    - Label backtest results as hypothetical (see the SEC Marketing Rule note).
11. **Tax estimates.** The short-term tax model follows US rules (netting within the year, losses carried forward). Vietnam taxes share sales differently: a flat percentage of each sale's value, not the gain. Before publishing there, consider a Vietnamese tax option, or label the US model clearly as US-only.
