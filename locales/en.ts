import type vi from './vi';

const en: Record<keyof typeof vi, string> = {
  // Common
  'common.ok': 'OK',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.retry': 'Retry',
  'common.loading': 'Loading...',
  'common.processing': 'Processing...',
  'common.continue': 'Continue',
  'common.back': 'Back',
  'common.orContinueWith': 'Or continue with',
  'common.email': 'Email',
  'common.password': 'Password',
  'common.invalidEmail': 'Invalid email address',
  'common.passwordTooShort': 'Password must be at least 6 characters',
  'common.passwordMismatch': "Passwords don't match",
  'common.dataError': "Couldn't load market data. Pull down to retry.",
  'common.shares': '{count} shares',
  'common.marketOpen': 'Market open',
  'common.marketClosed': 'Market closed',
  'common.updatedAt': 'Updated at {time}',
  'common.today': 'today',
  'common.simulatedNote':
    'Simulated with virtual money. For education only, not investment advice.',

  // Chart ranges
  'range.1D': '1D',
  'range.1W': '1W',
  'range.1M': '1M',
  'range.3M': '3M',
  'range.6M': '6M',
  'range.1Y': '1Y',
  'range.5Y': '5Y',

  // Onboarding
  'onboarding.skip': 'Skip',
  'onboarding.slide1Title': 'Live stock charts',
  'onboarding.slide1Desc':
    'Follow live stock prices and make smarter investing decisions.',
  'onboarding.slide2Title': 'Grow your returns',
  'onboarding.slide2Desc':
    'Practice trading with $100,000 in virtual cash, risk-free.',
  'onboarding.login': 'Log in',
  'onboarding.signup': 'Sign up',

  // Login
  'login.title': 'Hello',
  'login.subtitle': 'Welcome back, please log in:',
  'login.forgot': 'Forgot password?',
  'login.noAccount': "Don't have an account?",
  'login.signUp': 'Sign up',
  'login.wrongCredentials': 'Incorrect email or password',
  'login.googleFailed': 'Google sign-in failed',
  'login.googleUnavailable': "Google sign-in isn't set up on this device.",

  'login.guest': 'Continue as guest',

  // Sign up
  'signup.title': 'Join Stockline',
  'signup.subtitle': 'Start investing with $100,000 in virtual cash',
  'signup.name': 'Your name',
  'signup.nameRequired': 'Please enter your name',
  'signup.emailExists': 'This email is already registered',
  'signup.success': 'Account created',
  'signup.successMessage': 'You can now log in.',
  'signup.haveAccount': 'Already have an account?',
  'signup.login': 'Log in',

  // Welcome
  'welcome.hello': 'Hello {name}!',
  'welcome.title': 'Welcome to Stockline',
  'welcome.subtitle': 'You have {amount} in virtual cash to start practicing',
  'welcome.start': 'Get started',
  'welcome.friend': 'there',

  // Forgot / reset password
  'forgot.title': 'Forgot password',
  'forgot.desc':
    "Enter your registered email and we'll send a verification code to this device.",
  'forgot.send': 'Send code',
  'forgot.notFound': 'No account found with this email.',
  'forgot.googleAccount':
    'This account signs in with Google, so it has no password.',
  'reset.title': 'Set a new password',
  'reset.desc': 'Create a new password for {email}',
  'reset.newPassword': 'New password',
  'reset.confirmPassword': 'Confirm password',
  'reset.submit': 'Change password',
  'reset.success': 'Password changed. Please log in again.',

  // OTP
  'otp.title': 'Enter verification code',
  'otp.desc': "We've sent a 5-digit code as a notification on this device.",
  'otp.resend': 'Resend',
  'otp.verify': 'Verify',
  'otp.notificationTitle': 'Stockline verification code',
  'otp.notificationBody':
    'Your verification code is {code}. It expires in 5 minutes.',
  'otp.invalidTitle': 'Invalid code',
  'otp.invalid': 'Incorrect code, please try again',
  'otp.expired': 'This code has expired, please request a new one',
  'otp.fallbackTitle': 'Verification code',
  'otp.fallbackBody': 'Notifications are off, so here is your code: {code}',

  // Phone
  'phone.title': 'Enter your phone number',
  'phone.desc': "You'll get a 5-digit code to verify your phone number",
  'phone.send': 'Send code',
  'phone.invalidTitle': 'Invalid phone number',
  'phone.invalidDesc': 'Please check the number and try again',
  'phone.verified': 'Phone number verified',

  // Home
  'home.portfolioTotal': 'Total portfolio value',
  'home.watchlist': 'Watchlist',
  'home.watchlistEmpty': 'Tap + to add stocks to your watchlist',
  'home.popular': 'Popular stocks',

  // Portfolio (Chart tab)
  'portfolio.title': 'Portfolio',
  'portfolio.allTime': 'all time',
  'portfolio.gain': 'Gain',
  'portfolio.loss': 'Loss',
  'portfolio.noTrades':
    'Buy your first stock to see how your portfolio performs.',
  'portfolio.holdings': 'Holdings',
  'portfolio.cash': 'Cash',
  'portfolio.findStocks': 'Find stocks',

  // Trade tab
  'trade.title': 'Trade',
  'trade.buy': 'Buy',
  'trade.sell': 'Sell',
  'trade.overview': 'Overview',
  'trade.history': 'History',
  'trade.stats': 'Trading stats',
  'trade.totalTrades': 'Trades',
  'trade.winRate': 'Win rate',
  'trade.realizedPnL': 'Realized P&L',
  'trade.pnlChart': 'Realized P&L (7 days)',
  'trade.quickActions': 'Quick actions',
  'trade.cash': 'Cash',
  'trade.watchlist': 'Watchlist',
  'trade.watchlistCount': '{count} stocks',
  'trade.alerts': 'Price alerts',
  'trade.alertsCount': '{count} active',
  'trade.historyTitle': 'Trade history ({count})',
  'trade.noHistory': 'No trades yet',
  'trade.noHoldingsToSell': "You don't own any stocks to sell yet.",
  'trade.quantity': 'Quantity:',
  'trade.price': 'Price:',
  'trade.total': 'Total:',
  'trade.pnl': 'P&L:',
  'trade.completed': 'Completed',
  'trade.typeBuy': 'BUY',
  'trade.typeSell': 'SELL',

  // Holdings (Stock tab)
  'holdings.title': 'My holdings',
  'holdings.totalValue': 'Holdings value',
  'holdings.cashAvailable': 'Cash available: {amount}',
  'holdings.search': 'Search holdings...',
  'holdings.all': 'All',
  'holdings.gainers': 'Gainers',
  'holdings.losers': 'Losers',
  'holdings.count': 'Stocks owned ({count})',
  'holdings.avgCost': 'Avg cost {price}',
  'holdings.empty': "You don't own any stocks yet",
  'holdings.emptyDesc':
    'Find a stock and buy it with virtual cash to get started.',

  // Watchlist
  'watchlist.title': 'Watchlist',
  'watchlist.sort': 'Sort: {by}',
  'watchlist.sortDefault': 'Default',
  'watchlist.sortName': 'Name',
  'watchlist.sortChange': 'Change',
  'watchlist.sortPrice': 'Price',
  'watchlist.search': 'Search stocks...',
  'watchlist.count': 'Stocks',
  'watchlist.upDown': 'Up / Down',
  'watchlist.avgChange': 'Avg change',
  'watchlist.following': 'Watching ({count})',
  'watchlist.empty': 'Your watchlist is empty',
  'watchlist.emptyDesc': 'Search above to start watching stocks',
  'watchlist.results': 'Search results',

  // Search
  'search.titleView': 'Find stocks',
  'search.titleBuy': 'Choose a stock to buy',
  'search.titleSell': 'Choose a stock to sell',
  'search.titleAlert': 'Choose a stock for an alert',
  'search.placeholder': 'Symbol or company name...',
  'search.noResults': 'No results for "{query}"',
  'search.searching': 'Searching...',
  'search.failed': 'Search failed. Check your connection.',

  // Stock details
  'detail.title': 'Stock details',
  'detail.about': 'About',
  'detail.details': 'Details',
  'detail.news': 'News',
  'detail.website': 'WEBSITE:',
  'detail.since': 'SINCE:',
  'detail.employees': 'EMPLOYEES:',
  'detail.headquarters': 'HEADQUARTERS:',
  'detail.sector': 'SECTOR:',
  'detail.leader': 'LEADERSHIP:',
  'detail.exchange': 'EXCHANGE:',
  'detail.noProfile': 'No company profile for this symbol.',
  'detail.profileError': "Couldn't load the company profile.",
  'detail.keyStats': 'Key stats',
  'detail.open': 'Open',
  'detail.prevClose': 'Previous close',
  'detail.dayRange': 'Day range',
  'detail.yearRange': '52-week range',
  'detail.volume': 'Volume',
  'detail.avgVolume': 'Avg volume',
  'detail.marketCap': 'Market cap',
  'detail.pe': 'P/E',
  'detail.dividendYield': 'Dividend yield',
  'detail.financials': 'Financials',
  'detail.year': 'Year',
  'detail.revenue': 'Revenue',
  'detail.netIncome': 'Net income',
  'detail.noNews': 'No news yet',
  'detail.position': 'Your position',
  'detail.positionShares': 'Shares',
  'detail.positionAvg': 'Avg cost',
  'detail.positionValue': 'Market value',
  'detail.positionPnl': 'P&L',
  'detail.notTradable':
    "This symbol can't be traded in the app (only USD-listed stocks and ETFs are supported).",
  'detail.watch': 'Watch',
  'detail.unwatch': 'Unwatch',
  'detail.setAlert': 'Set price alert',
  'detail.chartError': "Couldn't load the chart",

  // Order
  'order.title': 'Confirm order',
  'order.marketPrice': 'Market price',
  'order.quantity': 'Quantity',
  'order.max': 'Max',
  'order.estimatedTotal': 'Estimated total',
  'order.cashAvailable': 'Cash available',
  'order.sharesOwned': 'Shares owned',
  'order.cashAfter': 'Cash after trade',
  'order.fundingSource': 'Funding source',
  'order.virtualAccount': 'Virtual account',
  'order.place': 'Place order',
  'order.disclaimer': 'Orders fill instantly at the latest price.',
  'order.insufficientCash': "You don't have enough cash for this order.",
  'order.insufficientShares': "You don't own enough shares to sell.",
  'order.invalidQuantity': 'Quantity must be greater than 0.',
  'order.priceUnavailable': 'Market price unavailable, please try again.',
  'order.confirmTitle': 'Confirm {side} order',
  'order.confirmMessage':
    '{side} {shares} shares of {symbol} at {price}?\nTotal: {total}',
  'order.successBuy': 'Bought {shares} shares of {symbol} at {price}.',
  'order.successSell': 'Sold {shares} shares of {symbol} at {price}.',
  'order.authPrompt': 'Authenticate to {side} {symbol}',
  'order.authFailed': 'Authentication failed. The order was not placed.',

  // Growth rankings
  'home.movers': 'Growth rankings',
  'home.moversDesc': 'Biggest gainers by day, week, month and year',
  'movers.title': 'Growth rankings',
  'movers.gainers': 'Top gainers',
  'movers.losers': 'Top losers',
  'movers.day': 'Day',
  'movers.week': 'Week',
  'movers.month': 'Month',
  'movers.year': 'Year',
  'movers.periodDay': 'the latest session',
  'movers.periodWeek': 'the past week',
  'movers.periodMonth': 'the past month',
  'movers.periodYear': 'the past year',
  'movers.intro':
    'Ranks {count} large US companies by price change over {period}.',
  'movers.caveat':
    "Past gains don't mean the price will keep rising, and the biggest movers are usually the riskiest. This is a data ranking, not a recommendation.",

  // Learn: AI explainer and indicator history
  'detail.learnMore': 'Learn about this stock',
  'detail.learnMoreDesc': 'AI explainer and indicator history',
  'insights.title': 'Learn: {symbol}',
  'insights.aiTitle': 'AI explainer',
  'insights.aiIntro':
    'The AI reads the price data, key numbers and recent news, then explains them in plain language.',
  'insights.explain': 'Explain this stock',
  'insights.regenerate': 'Regenerate',
  'insights.loading': 'The AI is reading the data...',
  'insights.summary': 'Overview',
  'insights.priceAction': 'Price moves',
  'insights.valuation': 'Key numbers',
  'insights.news': 'Recent news',
  'insights.positives': 'What supporters point to',
  'insights.risks': 'Risks critics point to',
  'insights.questions': 'Questions to explore',
  'insights.terms': 'Terms',
  'insights.label':
    'AI-generated ({model}) at {time}, for education only; not investment advice. AI can be wrong, so double-check.',
  'insights.removed': 'Hid {count} advice-like sentences.',
  'insights.noticeTitle': 'AI explainer',
  'insights.noticeBody':
    'The explanation is written by AI (Google Gemini), for education only, not investment advice. AI can be wrong.\n\nOnly public stock data is sent to Google, never your account or portfolio. On the free tier, Google may use this data to improve its products.',
  'insights.noticeContinue': 'Continue',
  'insights.needKey':
    'The AI needs a free Gemini API key. Create one in Google AI Studio and paste it here.',
  'insights.getKey': 'Get a free key',
  'insights.keyPlaceholder': 'Paste API key',
  'insights.saveKey': 'Save key',
  'insights.checkingKey': 'Checking key...',
  'insights.errorInvalidKey': "That API key isn't valid. Please check it.",
  'insights.errorQuota': "Today's free quota is used up. Try again later.",
  'insights.errorBlocked': 'The AI declined to answer this request.',
  'insights.errorNetwork':
    "Couldn't reach the AI. Check your connection and try again.",
  'insights.errorBad': 'The AI returned something unreadable. Try again.',
  'insights.positionTitle': 'In your virtual portfolio',
  'insights.positionDesc':
    "You hold {shares} shares, {percent} of your total portfolio value. This is calculated on your device and isn't sent to the AI.",
  'insights.indicatorsTitle': 'Indicators and their history',
  'insights.indicatorsIntro':
    'From {from} to {to}, on days when each of these was true, how often was the price higher {horizon} trading days (about a month) later? Compare with the base rate for all days.',
  'insights.baseRate': 'All days (base rate)',
  'insights.higherAfter':
    'Higher {rate} of the time · avg {avg} · {count} days',
  'insights.fewSamples': 'few cases, hard to draw conclusions',
  'insights.never': "Didn't happen in this period",
  'insights.now': 'Now: true',
  'insights.notNow': 'Now: false',
  'insights.caveat':
    "These results are hypothetical, based on this symbol's own past data, and the periods overlap, so they aren't independent. They don't reflect actual investment results and are not guarantees of future results.",
  'insights.notEnoughData': 'Not enough price history to calculate this.',
  'indicator.aboveSma200': 'Price above its 200-day average',
  'indicator.aboveSma200Desc':
    'The 200-day average is the mean closing price over about 10 months of trading, often used to judge the long-term trend.',
  'indicator.smaCross': '50-day average above the 200-day average',
  'indicator.smaCrossDesc':
    'When the short-term average is above the long-term one, recent prices are higher than the long-run average. The moment it crosses above is called a "golden cross".',
  'indicator.rsiBelow30': 'RSI below 30 ("oversold")',
  'indicator.rsiBelow30Desc':
    'RSI (0–100) compares gains and losses over 14 sessions. Below 30 means the price has fallen quickly.',
  'indicator.rsiAbove70': 'RSI above 70 ("overbought")',
  'indicator.rsiAbove70Desc':
    'RSI above 70 means the price has risen quickly in a short time.',
  'indicator.drawdown10': 'More than 10% below its 1-year high',
  'indicator.drawdown10Desc':
    'The price is over 10% below its highest close of the last 252 sessions.',
  'settings.ai': 'AI explainer',
  'settings.aiDesc':
    'Uses your free Gemini API key, stored on this device only.',
  'settings.aiKeySet': 'Key saved',
  'settings.aiRemoveKey': 'Remove key',
  'settings.aiKeySaved': 'API key saved',

  // Biometrics
  'bio.notAvailable': "This device doesn't support biometric authentication",
  'bio.failed': 'Authentication failed',
  'bio.error': 'Biometric authentication error',
  'bio.defaultReason': 'Authenticate to continue',

  // Price alerts
  'alerts.title': 'Price alerts',
  'alerts.add': 'Add alert',
  'alerts.currentPrice': 'Current price: {price}',
  'alerts.targetPlaceholder': 'Target price',
  'alerts.above': 'Notify when the price rises to {price}',
  'alerts.below': 'Notify when the price falls to {price}',
  'alerts.create': 'Create alert',
  'alerts.active': 'Active ({count})',
  'alerts.triggered': 'Triggered ({count})',
  'alerts.empty': 'No alerts yet',
  'alerts.emptyDesc':
    "Set a target price and get notified when it's reached (while the app is open).",
  'alerts.triggeredAt': 'Triggered {time}',
  'alerts.notifTitle': '{symbol} hit {price}',
  'alerts.notifBodyAbove': '{name} rose to {price} (target {target}).',
  'alerts.notifBodyBelow': '{name} fell to {price} (target {target}).',
  'alerts.invalidTarget':
    'Enter a valid target price that differs from the current price.',
  'alerts.permissionDenied':
    'Notifications are off. Turn them on in Settings to receive alerts.',
  'alerts.created': 'Alert created',
  'alerts.rearm': 'Re-enable',

  // Profile
  'profile.title': 'Account',
  'profile.virtualBalance': 'Virtual account',
  'profile.invite': 'Invite friends',
  'profile.inviteDesc': 'Share Stockline and practice investing together',
  'profile.inviteMessage':
    "I'm practicing stock investing with Stockline: virtual cash, real market prices. Try it with me!",
  'profile.account': 'Account',
  'profile.security': 'Security',
  'profile.transactions': 'Transactions',
  'profile.language': 'Language',
  'profile.settings': 'Settings',
  'profile.faq': 'FAQ',
  'profile.logout': 'Log out',
  'profile.logoutConfirm': 'Are you sure you want to log out?',

  // Guest mode
  'guest.name': 'Guest',
  'guest.subtitle': 'Your data is saved on this device only',
  'guest.exit': 'Exit guest mode',
  'guest.exitConfirm':
    'Your guest portfolio stays on this device. Choose "Continue as guest" to come back to it.',

  // Account details
  'account.title': 'Account details',
  'account.name': 'Display name',
  'account.phone': 'Phone number',
  'account.addPhone': 'Add phone number',
  'account.changePhone': 'Change',
  'account.saveName': 'Save name',
  'account.nameSaved': 'Display name saved',
  'account.nameRequired': "Name can't be empty",
  'account.changePassword': 'Change password',
  'account.currentPassword': 'Current password',
  'account.wrongPassword': 'Current password is incorrect',
  'account.passwordChanged': 'Password changed',
  'account.googleAccount':
    "You sign in with Google, so there's no password to change.",

  // Security
  'security.title': 'Security',
  'security.biometricTrades': 'Require biometrics for trades',
  'security.biometricDesc':
    'Ask for {type} before placing a buy or sell order.',
  'security.notAvailable':
    'This device has no Face ID or fingerprint set up. Orders will be confirmed with a dialog instead.',
  'security.faceId': 'Face ID',
  'security.touchId': 'Touch ID',
  'security.fingerprint': 'your fingerprint',
  'security.enablePrompt': 'Authenticate to turn this on',

  // Language
  'language.title': 'Language',

  // Settings
  'settings.title': 'Settings',
  'settings.notifications': 'Notifications',
  'settings.notificationsDesc': 'Used for verification codes and price alerts.',
  'settings.notificationsOn': 'On',
  'settings.enableNotifications': 'Turn on',
  'settings.virtualAccount': 'Virtual account',
  'settings.startingBalance': 'Starting balance',
  'settings.reset': 'Reset virtual account',
  'settings.resetDesc':
    'Clears all holdings and trade history and resets your balance to {amount}.',
  'settings.resetConfirm':
    "Are you sure you want to reset? This can't be undone.",
  'settings.resetDone': 'Virtual account reset',
  'settings.dataSource': 'Data source',
  'settings.dataSourceDesc':
    'Prices come from Yahoo Finance, may be delayed by a few minutes, and refresh every 20 seconds while the app is open.',

  // FAQ
  'faq.title': 'FAQ',
  'faq.q1': 'Does Stockline use real money?',
  'faq.a1':
    'No. Every trade uses virtual cash. You start with $100,000 and can reset it anytime in Settings.',
  'faq.q2': 'Where do the prices come from?',
  'faq.a2':
    'Prices come from Yahoo Finance and refresh every 20 seconds while the app is open. They can lag the exchange by a few minutes.',
  'faq.q3': 'How are orders filled?',
  'faq.a3':
    'Buy and sell orders fill instantly at the latest price, even when the market is closed. There are no fees.',
  'faq.q4': 'How is profit and loss calculated?',
  'faq.a4':
    'Unrealized P&L = (current price − average cost) × shares. Realized P&L is recorded each time you sell.',
  'faq.q5': 'How do price alerts work?',
  'faq.a5':
    "Set a target price for a stock and you'll get a notification when it's reached. Alerts are only checked while the app is open.",
  'faq.q6': 'Where is my data stored?',
  'faq.a6':
    'Your account, portfolio and trade history are stored on this device only. Uninstalling the app deletes them.',
  // Automate
  'home.automate': 'Automate',
  'home.automateDesc':
    'Recurring investments and strategy tests, with virtual money',
  'automate.title': 'Automate',
  'automate.intro':
    'Automations trade at each day’s closing price. They run while the app is open, and catch up on days you missed.',
  'automate.checking': 'Checking prices…',
  'automate.lastRun': 'Last checked {time}. Prices through {date}.',
  'automate.neverRun': 'Prices are checked whenever you open the app.',
  'automate.failed':
    "Couldn't load prices for {symbols}. Trying again next time.",
  'automate.runNow': 'Check now',

  // Recurring investments
  'recurring.title': 'Recurring investments',
  'recurring.explain':
    'Buy a fixed amount on a schedule, whatever the price. Low prices buy more shares and high prices buy fewer. This is called dollar-cost averaging.',
  'recurring.add': 'New',
  'recurring.empty': 'No recurring investments yet.',
  'recurring.newTitle': 'New recurring investment',
  'recurring.editTitle': 'Edit recurring investment',
  'recurring.amount': 'Amount per purchase',
  'recurring.amountRange': 'From {min} to {max}',
  'recurring.frequency': 'How often',
  'recurring.weekdayLabel': 'Day of the week',
  'recurring.dayLabel': 'Day of the month',
  'recurring.day': 'Day {day}',
  'recurring.dayHint': 'Days 29–31 are left out so every month has the day.',
  'recurring.startLabel': 'Start date (testing only)',
  'recurring.startHint':
    'YYYY-MM-DD. A past date buys at past closing prices. Only shown in development builds.',
  'recurring.invalidStart': 'Enter a date like 2026-01-15.',
  'recurring.firstBuy': 'Next purchase: {date}, at that day’s closing price.',
  'recurring.howItWorks':
    'Each purchase buys {amount} of {symbol}, including fractions of a share. If the day is a weekend or holiday, it buys on the next trading day. If there isn’t enough cash, that purchase is skipped.',
  'recurring.next': 'Next: {date}',
  'recurring.active': 'Active',
  'recurring.paused': 'Paused',
  'recurring.pause': 'Pause',
  'recurring.resume': 'Resume',
  'recurring.pausedNote':
    'Purchases that fall while it’s paused are skipped, not made up later.',
  'recurring.edit': 'Edit',
  'recurring.deleteTitle': 'Delete this recurring investment?',
  'recurring.deleteMessage': 'Shares it already bought stay in your portfolio.',
  'recurring.purchases': 'Purchases',
  'recurring.invested': 'Invested',
  'recurring.sharesBought': 'Shares bought',
  'recurring.avgPrice': 'Average price paid',
  'recurring.worthToday': 'Worth today',
  'recurring.statsNote':
    'For the shares this recurring investment bought, at today’s price.',
  'recurring.history': 'History',
  'recurring.noHistory': 'No purchases yet. The first is on {date}.',
  'recurring.bought': 'Bought {shares} shares at {price}',
  'recurring.notFound': 'This recurring investment no longer exists.',
  'search.titleRecurring': 'Choose a stock or ETF',

  'frequency.weekly': 'Weekly',
  'frequency.biweekly': 'Every 2 weeks',
  'frequency.monthly': 'Monthly',
  'schedule.weekly': 'Every {weekday}',
  'schedule.biweekly': 'Every other {weekday}',
  'schedule.monthly': 'Monthly on day {day}',
  'weekday.1': 'Monday',
  'weekday.2': 'Tuesday',
  'weekday.3': 'Wednesday',
  'weekday.4': 'Thursday',
  'weekday.5': 'Friday',
  'weekdayShort.1': 'Mon',
  'weekdayShort.2': 'Tue',
  'weekdayShort.3': 'Wed',
  'weekdayShort.4': 'Thu',
  'weekdayShort.5': 'Fri',

  // Why an automated trade happened
  'reason.recurringBuy': 'Recurring purchase of {amount}',
  'reason.recurringSkippedCash':
    'Skipped: needed {amount}, but only {cash} cash was available',
  // Risk rules
  'risk.title': 'Risk rules',
  'risk.stopLoss': 'Stop-loss',
  'risk.takeProfit': 'Take-profit',
  'risk.trailingStop': 'Trailing stop',
  'risk.stopLossExplain':
    'Limits a loss: sells everything if the price falls a set percentage below what you paid.',
  'risk.takeProfitExplain':
    'Locks in a gain: sells everything if the price rises a set percentage above what you paid.',
  'risk.trailingStopExplain':
    'Protects a gain as it grows: the sell line sits a set percentage below the highest close since you bought, and only moves up.',
  'risk.intro':
    'Rules sell your whole position automatically when a daily close crosses a line. Each rule only checks closes from after you turn it on.',
  'risk.boughtOn': 'Bought on',
  'risk.lastClose': 'Latest close ({date})',
  'risk.highestClose': 'Highest close since you bought ({date})',
  'risk.notHeld': "You don't own {symbol} anymore, so it has no active rules.",
  'risk.on': 'On',
  'risk.off': 'Off',
  'risk.turnOn': 'Turn on',
  'risk.update': 'Update',
  'risk.turnOff': 'Turn off',
  'risk.percentPlaceholder': 'e.g. 8',
  'risk.invalidPercent': 'Enter a percentage from {min}% to {max}%.',
  'risk.lineStopLoss':
    'Sells if a day closes at or below {line}, {percent}% under your average cost of {reference}.',
  'risk.lineTakeProfit':
    'Sells if a day closes at or above {line}, {percent}% over your average cost of {reference}.',
  'risk.lineTrailingStop':
    'Sells if a day closes at or below {line}, {percent}% under the highest close since you bought ({reference}). The line rises with new highs and never falls.',
  'risk.noCloseYet':
    "There's no closing price since you bought yet, so the line starts from the first close.",
  'risk.alreadyPast':
    'The latest close ({close}) is already past this line. If the next close is too, it sells.',
  'risk.nextCheck': 'Next check: the close on {date}.',
  'risk.gapNote':
    'Rules are checked once a day, at the closing price. If the price jumps or drops a lot in one day, the sale happens at that close, which can be past your line.',
  'risk.history': 'Past rules',
  'risk.triggeredOn': '{rule} {percent}%: sold on {date}',
  'risk.endedOn':
    '{rule} {percent}%: ended on {date} when the position was sold',
  'risk.activeCount': '{count} on',
  'risk.hubExplain':
    'Sell automatically with a stop-loss, take-profit or trailing stop. Add rules from a stock you own.',
  'risk.hubEmpty': 'No active risk rules.',
  'risk.soldSummary': 'Sold {symbol}: {rule} {percent}% on {date}',
  'reason.stopLoss':
    'Sold: stop-loss (−{percent}%) triggered. Closed at {close}, {move} from your average cost of {reference}.',
  'reason.takeProfit':
    'Sold: take-profit (+{percent}%) triggered. Closed at {close}, {move} from your average cost of {reference}.',
  'reason.trailingStop':
    'Sold: trailing stop (−{percent}%) triggered. Closed at {close}, {move} from the highest close of {reference}.',
  // Strategy bots
  'bot.title': 'Strategy bots',
  'bot.hubExplain':
    'A bot follows a trading rule on one stock. Set one up and see where its signals fell over the past year. Bots don’t trade yet: testing them on past prices comes next.',
  'bot.empty': 'No bots yet.',
  'bot.newTitle': 'New strategy bot',
  'bot.editTitle': 'Edit strategy bot',
  'bot.strategy': 'Moving-average crossover',
  'bot.maExplain':
    'Holds the stock while its trend points up. The "fast" line is the price or a short average; the "slow" line is a longer average. It buys when the fast line is above the slow one and sells when it drops below.',
  'bot.modeCross': 'Two averages',
  'bot.modePrice': 'Price vs average',
  'bot.fastLength': 'Short average (days)',
  'bot.slowLength': 'Long average (days)',
  'bot.priceLength': 'Average (days)',
  'bot.buffer': 'Buffer',
  'bot.bufferHint':
    'Only act once the fast line is this far past the slow one. Fewer false signals, but later ones.',
  'bot.bufferPercent': 'Buffer %',
  'bot.trendFilter': 'Trend filter',
  'bot.trendHint':
    'Only buy while the price is above a long-term average. It never forces a sale.',
  'bot.trendLength': 'Long-term average (days)',
  'bot.exits': 'Exits',
  'bot.exitsExplain':
    'Optional: these also sell, on top of the strategy’s own sell signal. Leave a box empty to turn it off.',
  'bot.off': 'Off',
  'bot.sizing': 'Position size',
  'bot.riskPercent': 'Risk per trade (% of account)',
  'bot.sizingExample':
    'With a {account} account, each buy invests up to {invest}.',
  'bot.sizingStop': 'If the {stop}% stop is hit, that loses about {loss}.',
  'bot.sizingNoStop':
    'With no stop-loss or trailing stop, the risk percent is the most it invests.',
  'bot.errorFast':
    'The short average needs 2 to 400 days and must be shorter than the long one.',
  'bot.errorSlow': 'The average needs 2 to 400 days.',
  'bot.errorBuffer': 'The buffer can be 0% to 20%.',
  'bot.errorTrend': 'The long-term average needs 2 to 400 days.',
  'bot.errorExit':
    'Stop-loss and trailing stop take 0.5% to 90%; take-profit takes 0.5% to 1000%.',
  'bot.errorRisk': 'Risk per trade can be 0.1% to 100%.',
  'bot.preview': 'Signals over the past year',
  'bot.signalCount': 'Buy signals: {buys}. Sell signals: {sells}.',
  'bot.previewNote':
    'This shows only where the rule would have bought and sold, at closing prices. Money, position sizes and exits come with the backtester.',
  'bot.lastSignal': 'Most recent signal ({date}): {reason}',
  'bot.notLive':
    'Bots don’t trade yet. You’ll be able to test this one on past prices, then run it with virtual money.',
  'bot.chartLabel':
    'Price chart with moving averages and past buy and sell signals',
  'bot.legendPrice': 'Price',
  'bot.legendBuy': 'Buy signal',
  'bot.legendSell': 'Sell signal',
  'bot.statePrice':
    'On {date}, the price ({close}) was {move} from its {slow}-day average.',
  'bot.stateCross':
    'On {date}, the {fast}-day average was {move} from the {slow}-day average.',
  'bot.stateTrend': 'The price was {move} from its {trend}-day average.',
  'bot.deleteTitle': 'Delete this bot?',
  'bot.deleteMessage': 'Its settings will be removed.',
  'strategy.priceVsMa': 'Price vs {slow}-day average',
  'strategy.maCross': '{fast}/{slow}-day crossover',
  'strategy.withBuffer': '{buffer}% buffer',
  'strategy.withTrend': 'buys above the {trend}-day only',
  'reason.maBuyPrice': 'Bought: price closed above its {slow}-day average',
  'reason.maBuyPriceBuffer':
    'Bought: price closed more than {buffer}% above its {slow}-day average',
  'reason.maBuyCross':
    'Bought: the {fast}-day average rose above the {slow}-day average',
  'reason.maBuyCrossBuffer':
    'Bought: the {fast}-day average rose more than {buffer}% above the {slow}-day average',
  'reason.maSellPrice': 'Sold: price closed below its {slow}-day average',
  'reason.maSellPriceBuffer':
    'Sold: price closed more than {buffer}% below its {slow}-day average',
  'reason.maSellCross':
    'Sold: the {fast}-day average fell below the {slow}-day average',
  'reason.maSellCrossBuffer':
    'Sold: the {fast}-day average fell more than {buffer}% below the {slow}-day average',
  'reason.maTrendBlocked':
    'No buy: price is below its {trend}-day average (trend filter)',
  'reason.maHold': 'No signal',
  'reason.maWarmup': 'Waiting for {days} days of prices',
  'reason.maLine': '{days}-day average',
};

export default en;
