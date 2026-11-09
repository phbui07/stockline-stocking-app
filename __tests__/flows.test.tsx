/**
 * End-to-end flows through the real screens, against a fake Yahoo Finance.
 */
import React from 'react';
import {Alert, AlertButton} from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Notifications} from 'react-native-notifications';
import App from '../App';
import {refreshQuotes, resetQuoteStore} from '../services/quoteStore';
import {clearMarketDataCache} from '../services/marketData';
import {getPriceProvider, setPriceProvider} from '../services/data';
import {MockPriceProvider} from '../services/data/mockProvider';
import {
  addDays,
  dayOfWeek,
  lastCompletedMarketDate,
} from '../services/engine/dates';

// Charts start Animated timers on mount that outlive the test file; the
// flows don't exercise charts, so render them as nothing.
jest.mock('react-native-gifted-charts', () => ({
  LineChart: () => null,
  BarChart: () => null,
}));
jest.mock('react-native-gifted-charts/dist/BarChart', () => ({
  BarChart: () => null,
}));

let profileAvailable = true;
// Year-ago closes for the growth rankings (defaults to 100).
const yearBase: Record<string, number> = {};

const DEMO = {email: 'a1@gmail.com', pass: '123456', name: 'Nguyễn Văn A'};
const prices: Record<string, number> = {};

const meta = (symbol: string) => ({
  symbol,
  currency: 'USD',
  instrumentType: symbol.startsWith('^') ? 'INDEX' : 'EQUITY',
  longName: `${symbol} Corp`,
  regularMarketPrice: prices[symbol] ?? 100,
  previousClose: 100,
  regularMarketTime: Date.now() / 1000,
  currentTradingPeriod: {regular: {start: 0, end: 0}},
});

const respond = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
  } as Response);

const geminiBodies: string[] = [];

const fakeYahoo = (url: string, init?: RequestInit) => {
  if (url.includes('generativelanguage.googleapis.com')) {
    if (url.includes(':generateContent')) {
      geminiBodies.push(String(init?.body));
      const explanation = {
        summary: 'Apple bán iPhone và dịch vụ.',
        priceAction: 'Giá tăng trong năm qua.',
        valuation: 'Không có dữ liệu P/E.',
        news: 'Tin tức nói về sản phẩm mới.',
        positives: ['Thương hiệu mạnh'],
        risks: ['Phụ thuộc vào iPhone'],
        questions: ['Doanh thu dịch vụ chiếm bao nhiêu?'],
        terms: [{term: 'P/E', meaning: 'Giá chia cho lợi nhuận mỗi cổ phiếu.'}],
      };
      return respond({
        candidates: [{content: {parts: [{text: JSON.stringify(explanation)}]}}],
      });
    }
    return respond({models: []}); // key check
  }
  if (url.includes('range=5y&interval=1d')) {
    const start = Math.floor(Date.now() / 1000) - 400 * 86400;
    return respond({
      chart: {
        result: [
          {
            meta: meta('X'),
            timestamp: Array.from({length: 400}, (_, i) => start + i * 86400),
            indicators: {
              quote: [{close: Array.from({length: 400}, (_, i) => 100 + i)}],
            },
          },
        ],
      },
    });
  }
  if (url.includes('/v7/finance/spark')) {
    const symbols = decodeURIComponent(
      url.split('symbols=')[1].split('&')[0],
    ).split(',');
    const year = url.includes('range=1y');
    return respond({
      spark: {
        result: symbols.map(symbol => ({
          symbol,
          response: [
            {
              meta: {
                ...meta(symbol),
                ...(year ? {chartPreviousClose: yearBase[symbol] ?? 100} : {}),
              },
              indicators: {quote: [{close: [100, 101]}]},
            },
          ],
        })),
      },
    });
  }
  if (url.includes('/v8/finance/chart/')) {
    const symbol = decodeURIComponent(url.split('/chart/')[1].split('?')[0]);
    const now = Math.floor(Date.now() / 1000);
    return respond({
      chart: {
        result: [
          {
            meta: meta(symbol),
            timestamp: [now - 120, now - 60],
            indicators: {quote: [{close: [99, 100]}]},
          },
        ],
      },
    });
  }
  if (url.includes('/v1/finance/search')) {
    return respond(
      url.includes('newsCount=0')
        ? {
            quotes: [
              {
                symbol: 'TSLA',
                longname: 'Tesla, Inc.',
                exchDisp: 'NASDAQ',
                quoteType: 'EQUITY',
              },
            ],
          }
        : {news: []},
    );
  }
  if (url.includes('getcrumb')) {
    return respond('crumb');
  }
  if (url.includes('quoteSummary')) {
    if (!profileAvailable) {
      return respond('Too Many Requests', 429);
    }
    return respond({
      quoteSummary: {
        result: [{assetProfile: {longBusinessSummary: 'Makes things.'}}],
      },
    });
  }
  return respond('', 404);
};

// Records Alert.alert calls so tests can tap their buttons.
const alertSpy = jest.spyOn(Alert, 'alert');
const pressAlert = async (buttonText: string) => {
  const call = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
  const buttons = (call?.[2] ?? []) as AlertButton[];
  const button = buttons.find(b => b.text === buttonText);
  if (!button) {
    throw new Error(
      `No "${buttonText}" button in alert ${JSON.stringify(call?.slice(0, 2))}`,
    );
  }
  await act(async () => {
    await button.onPress?.();
  });
};

const savedUserData = async () =>
  JSON.parse((await AsyncStorage.getItem(`stockline.user.${DEMO.email}`))!);

const startLoggedIn = async () => {
  await AsyncStorage.setItem(
    'userLoginStorage',
    JSON.stringify({
      email: DEMO.email,
      name: DEMO.name,
      givenName: DEMO.name,
      familyName: null,
      photoUrl: null,
    }),
  );
  await render(<App />);
  await screen.findByTestId('home-total');
};

const openStock = async (symbol: string) => {
  await fireEvent.press(await screen.findByTestId(`popular-${symbol}`));
  await screen.findByTestId('detail-buy');
  await waitFor(() =>
    expect(screen.getByTestId('detail-price')).toHaveTextContent(/\$/),
  );
};

const placeOrder = async (quantity: string, confirmLabel = 'Đặt lệnh') => {
  await fireEvent.changeText(
    await screen.findByTestId('order-quantity'),
    quantity,
  );
  await fireEvent.press(screen.getByTestId('order-place'));
  await pressAlert(confirmLabel); // confirmation dialog
  await pressAlert('OK'); // success dialog
};

beforeEach(async () => {
  await AsyncStorage.clear();
  resetQuoteStore();
  clearMarketDataCache();
  Object.keys(prices).forEach(key => delete prices[key]);
  profileAvailable = true;
  Object.keys(yearBase).forEach(key => delete yearBase[key]);
  alertSpy.mockClear();
  (Notifications.postLocalNotification as jest.Mock).mockClear();
  geminiBodies.length = 0;
  globalThis.fetch = jest.fn(fakeYahoo) as any;
});

it('signs up, logs in, shows the welcome screen and a $100,000 portfolio', async () => {
  await render(<App />);
  // Onboarding shows a 3-second splash first.
  await fireEvent.press(
    await screen.findByTestId('onboarding-signup', {}, {timeout: 5000}),
  );
  await fireEvent.changeText(screen.getByTestId('signup-name'), 'Lan');
  await fireEvent.changeText(
    screen.getByTestId('signup-email'),
    'Lan@Example.com',
  );
  await fireEvent.changeText(screen.getByTestId('signup-password'), '123');
  await fireEvent.press(screen.getByTestId('signup-submit'));
  expect(screen.getByText('Mật khẩu tối thiểu 6 ký tự')).toBeOnTheScreen();

  await fireEvent.changeText(screen.getByTestId('signup-password'), 'secret1');
  await fireEvent.press(screen.getByTestId('signup-submit'));
  await pressAlert('OK');

  await fireEvent.changeText(
    await screen.findByTestId('login-email'),
    'lan@example.com',
  );
  await fireEvent.changeText(screen.getByTestId('login-password'), 'wrong');
  await fireEvent.press(screen.getByTestId('login-submit'));
  expect(alertSpy).toHaveBeenLastCalledWith('Email hoặc mật khẩu không đúng');

  await fireEvent.changeText(screen.getByTestId('login-password'), 'secret1');
  await fireEvent.press(screen.getByTestId('login-submit'));
  expect(await screen.findByText(/Xin chào Lan!/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('welcome-start'));

  await fireEvent.press(await screen.findByTestId('home-toggle-total'));
  expect(screen.getByTestId('home-total')).toHaveTextContent('$100,000.00');
}, 15000);

it('buys and sells with virtual cash and records realized P&L', async () => {
  prices.AAPL = 200;
  await startLoggedIn();
  await openStock('AAPL');

  await fireEvent.press(screen.getByTestId('detail-buy'));
  await placeOrder('3');
  await screen.findByTestId('detail-position');

  let saved = await savedUserData();
  expect(saved.portfolio.cash).toBe(100000 - 600);
  expect(saved.portfolio.positions.AAPL).toMatchObject({
    shares: 3,
    avgCost: 200,
  });

  prices.AAPL = 250;
  await act(() => refreshQuotes(['AAPL']));
  await fireEvent.press(screen.getByTestId('detail-sell'));
  await placeOrder('2');

  saved = await savedUserData();
  expect(saved.portfolio.positions.AAPL.shares).toBe(1);
  expect(saved.portfolio.cash).toBe(99400 + 500);
  expect(saved.portfolio.transactions[0]).toMatchObject({
    side: 'SELL',
    realizedPnL: 100,
  });

  // The Trade tab reflects the history.
  await fireEvent.press(screen.getByLabelText('Quay lại'));
  await fireEvent.press(await screen.findByTestId('tab-Trade'));
  await waitFor(() =>
    expect(screen.getByTestId('trade-total-trades')).toHaveTextContent('2'),
  );
});

it('blocks orders the account cannot afford', async () => {
  prices.AAPL = 200;
  await startLoggedIn();
  await openStock('AAPL');
  await fireEvent.press(screen.getByTestId('detail-buy'));
  await fireEvent.changeText(
    await screen.findByTestId('order-quantity'),
    '1000',
  );
  expect(screen.getByText('Không đủ tiền mặt cho lệnh này.')).toBeOnTheScreen();
  expect(screen.getByTestId('order-place')).toBeDisabled();

  await fireEvent.press(screen.getByTestId('order-max'));
  expect(screen.getByTestId('order-quantity')).toHaveDisplayValue('500');
});

it('upgrades a portfolio saved by the old app and buys fractional shares', async () => {
  prices.AAPL = 200;
  // How the previous version saved a position: just shares and average cost.
  await AsyncStorage.setItem(
    `stockline.user.${DEMO.email}`,
    JSON.stringify({
      portfolio: {
        startingCash: 100000,
        cash: 98500,
        positions: {
          AAPL: {symbol: 'AAPL', name: 'AAPL Corp', shares: 10, avgCost: 150},
        },
        transactions: [
          {
            id: 'old',
            side: 'BUY',
            symbol: 'AAPL',
            name: 'AAPL Corp',
            shares: 10,
            price: 150,
            total: 1500,
            date: Date.parse('2026-10-15T16:00:00Z'),
          },
        ],
        createdAt: 0,
      },
      watchlist: [],
      alerts: [],
      settings: {biometricForTrades: false, startingCash: 100000},
    }),
  );
  await startLoggedIn();
  await openStock('AAPL');
  expect(screen.getByTestId('detail-position')).toHaveTextContent(/10/);

  await fireEvent.press(screen.getByTestId('detail-buy'));
  // Vietnamese keyboards type a decimal comma.
  await placeOrder('0,5');

  const saved = await savedUserData();
  expect(saved.portfolio.version).toBe(2);
  expect(saved.portfolio.cash).toBe(98500 - 100);
  expect(saved.portfolio.positions.AAPL.shares).toBe(10.5);
  expect(saved.portfolio.positions.AAPL.lots).toHaveLength(2);
  expect(screen.getByTestId('detail-position')).toHaveTextContent(/10\.5/);
});

describe('recurring investments', () => {
  const realProvider = getPriceProvider();
  afterEach(() => setPriceProvider(realProvider));

  it('creates a rule, catches up on missed weeks, then pauses, edits and deletes it', async () => {
    // Offline daily closes on the same weekday for the last three weeks:
    // $100, then $125, then $80.
    const last = lastCompletedMarketDate();
    const days = [addDays(last, -14), addDays(last, -7), last];
    setPriceProvider(
      new MockPriceProvider({AAPL: {dates: days, closes: [100, 125, 80]}}),
    );
    prices.AAPL = 80; // the live quote the form shows

    await startLoggedIn();
    await fireEvent.press(screen.getByTestId('home-automate'));
    expect(
      await screen.findByText('Chưa có khoản đầu tư định kỳ nào.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('recurring-add'));
    await fireEvent.press(await screen.findByTestId('search-result-AAPL'));

    // Save stays disabled until the amount is valid.
    await fireEvent.changeText(
      await screen.findByTestId('recurring-amount'),
      '0,5',
    );
    expect(screen.getByTestId('recurring-save')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('recurring-amount'), '100');
    await fireEvent.press(screen.getByTestId('recurring-frequency-weekly'));
    await fireEvent.press(
      screen.getByTestId(`recurring-weekday-${dayOfWeek(last)}`),
    );
    // Development builds can start in the past to test catching up.
    await fireEvent.changeText(screen.getByTestId('recurring-start'), days[0]);
    await waitFor(() =>
      expect(screen.getByTestId('recurring-save')).toBeEnabled(),
    );
    await fireEvent.press(screen.getByTestId('recurring-save'));

    // The runner buys $100 at each week's close: 1 + 0.8 + 1.25 shares.
    await waitFor(() =>
      expect(screen.getAllByTestId('recurring-history-row')).toHaveLength(3),
    );
    expect(screen.getByText('$300.00')).toBeOnTheScreen(); // invested
    let saved = await savedUserData();
    expect(saved.portfolio.cash).toBe(100000 - 300);
    expect(saved.portfolio.positions.AAPL.shares).toBe(3.05);
    expect(saved.portfolio.transactions[0]).toMatchObject({
      source: 'recurring',
      price: 80,
    });

    await fireEvent.press(screen.getByTestId('recurring-toggle'));
    expect(screen.getByTestId('recurring-status')).toHaveTextContent(
      'Tạm dừng',
    );
    await fireEvent.press(screen.getByTestId('recurring-toggle'));
    expect(screen.getByTestId('recurring-status')).toHaveTextContent(
      'Đang chạy',
    );

    await fireEvent.press(screen.getByTestId('recurring-edit'));
    await fireEvent.changeText(
      await screen.findByTestId('recurring-amount'),
      '50',
    );
    await fireEvent.press(screen.getByTestId('recurring-save'));
    expect(await screen.findByText('AAPL · $50.00')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('recurring-delete'));
    await pressAlert('Xóa');
    expect(
      await screen.findByText('Chưa có khoản đầu tư định kỳ nào.'),
    ).toBeOnTheScreen();
    // Its purchases stay in the portfolio.
    saved = await savedUserData();
    expect(saved.portfolio.transactions).toHaveLength(3);
    const automation = JSON.parse(
      (await AsyncStorage.getItem(`stockline.automation.${DEMO.email}`))!,
    );
    expect(automation.recurring).toEqual([]);
  }, 20000);
});

describe('risk rules', () => {
  const realProvider = getPriceProvider();
  afterEach(() => setPriceProvider(realProvider));

  it('turns rules on, changes and turns them off from a stock you own', async () => {
    prices.AAPL = 200;
    setPriceProvider(new MockPriceProvider({}));
    await startLoggedIn();
    await openStock('AAPL');
    await fireEvent.press(screen.getByTestId('detail-buy'));
    await placeOrder('2');
    await fireEvent.press(await screen.findByTestId('detail-risk'));

    // Average cost $200, 10% stop-loss → line at $180.
    await fireEvent.changeText(
      await screen.findByTestId('risk-percent-stopLoss'),
      '10',
    );
    expect(screen.getByTestId('risk-line-stopLoss')).toHaveTextContent(
      /\$180\.00/,
    );
    await fireEvent.press(screen.getByTestId('risk-save-stopLoss'));
    expect(screen.getByTestId('risk-status-stopLoss')).toHaveTextContent(
      'Đang bật',
    );

    // 25% take-profit → $250. An impossible stop-loss shows an error.
    await fireEvent.changeText(
      screen.getByTestId('risk-percent-takeProfit'),
      '25',
    );
    await fireEvent.press(screen.getByTestId('risk-save-takeProfit'));
    await fireEvent.changeText(
      screen.getByTestId('risk-percent-stopLoss'),
      '95',
    );
    expect(screen.getByTestId('risk-save-stopLoss')).toBeDisabled();
    await fireEvent.changeText(
      screen.getByTestId('risk-percent-stopLoss'),
      '7,5',
    );
    await fireEvent.press(screen.getByTestId('risk-save-stopLoss'));

    let automation = JSON.parse(
      (await AsyncStorage.getItem(`stockline.automation.${DEMO.email}`))!,
    );
    expect(
      automation.risk.map((r: any) => [r.kind, r.percent, r.status]),
    ).toEqual([
      ['stopLoss', 7.5, 'active'],
      ['takeProfit', 25, 'active'],
    ]);

    await fireEvent.press(screen.getByTestId('risk-remove-takeProfit'));
    expect(screen.getByTestId('risk-status-takeProfit')).toHaveTextContent(
      'Tắt',
    );

    // Selling the whole position yourself ends the remaining rule.
    await fireEvent.press(screen.getByLabelText('Quay lại'));
    await fireEvent.press(await screen.findByTestId('detail-sell'));
    await placeOrder('2');
    await waitFor(async () => {
      automation = JSON.parse(
        (await AsyncStorage.getItem(`stockline.automation.${DEMO.email}`))!,
      );
      expect(automation.risk.map((r: any) => r.status)).toEqual(['ended']);
    });
  }, 20000);

  it('sells when a close crosses the line while the app was closed', async () => {
    // You bought 10 AAPL at $100 three weeks ago and set a 10% stop-loss a
    // week later. Since then it closed at $95, then $85.
    const last = lastCompletedMarketDate();
    const days = [addDays(last, -14), addDays(last, -7), last];
    setPriceProvider(
      new MockPriceProvider({AAPL: {dates: days, closes: [100, 95, 85]}}),
    );
    await AsyncStorage.setItem(
      `stockline.user.${DEMO.email}`,
      JSON.stringify({
        portfolio: {
          startingCash: 100000,
          cash: 99000,
          positions: {
            AAPL: {symbol: 'AAPL', name: 'AAPL Corp', shares: 10, avgCost: 100},
          },
          transactions: [
            {
              id: 'buy',
              side: 'BUY',
              symbol: 'AAPL',
              name: 'AAPL Corp',
              shares: 10,
              price: 100,
              total: 1000,
              date: Date.parse(`${days[0]}T16:00:00Z`),
            },
          ],
          createdAt: 0,
        },
        watchlist: [],
        alerts: [],
        settings: {biometricForTrades: false, startingCash: 100000},
      }),
    );
    await AsyncStorage.setItem(
      `stockline.automation.${DEMO.email}`,
      JSON.stringify({
        version: 1,
        recurring: [],
        events: [],
        risk: [
          {
            id: 'k1',
            symbol: 'AAPL',
            kind: 'stopLoss',
            percent: 10,
            createdAt: 0,
            startDate: days[1],
            status: 'active',
          },
        ],
      }),
    );

    await startLoggedIn();
    // The runner checks both missed closes as soon as the app opens.
    await waitFor(async () => {
      const saved = await savedUserData();
      expect(saved.portfolio.positions.AAPL).toBeUndefined();
    });
    const saved = await savedUserData();
    expect(saved.portfolio.cash).toBe(99000 + 850);
    expect(saved.portfolio.transactions[0]).toMatchObject({
      side: 'SELL',
      price: 85,
      source: 'risk',
    });

    await fireEvent.press(screen.getByTestId('tab-Trade'));
    await fireEvent.press(await screen.findByTestId('trade-tab-history'));
    expect(
      screen.getByText(
        'Đã bán: chạm cắt lỗ (−10%). Đóng cửa ở $85.00, -15.00% so với giá vốn trung bình $100.00.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('trade-automate'));
    expect(await screen.findByTestId('risk-recent')).toHaveTextContent(
      /Đã bán AAPL: Cắt lỗ 10%/,
    );
  }, 20000);
});

it('adds and removes stocks from the watchlist', async () => {
  await startLoggedIn();
  await fireEvent.press(screen.getByTestId('home-watchlist-add'));
  await fireEvent.changeText(
    await screen.findByTestId('watchlist-search'),
    'tesla',
  );
  // TSLA is in the default watchlist, so remove it from the search results.
  await fireEvent.press(
    await screen.findByTestId('search-toggle-TSLA', {}, {timeout: 2000}),
  );
  await waitFor(async () =>
    expect((await savedUserData()).watchlist).not.toContain('TSLA'),
  );
  expect(screen.queryByTestId('watchlist-row-TSLA')).toBeNull();
  await fireEvent.press(screen.getByTestId('search-toggle-TSLA'));
  await waitFor(async () =>
    expect((await savedUserData()).watchlist).toContain('TSLA'),
  );
  expect(screen.getByTestId('watchlist-row-TSLA')).toBeOnTheScreen();
});

it('fires a price alert notification when the target is crossed', async () => {
  prices.AAPL = 200;
  await startLoggedIn();
  await openStock('AAPL');
  await fireEvent.press(screen.getByTestId('detail-alert'));
  await fireEvent.changeText(await screen.findByTestId('alert-target'), '210');
  expect(screen.getByText('Báo khi giá tăng lên $210.00')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('alert-create'));
  await waitFor(() =>
    expect(alertSpy).toHaveBeenLastCalledWith('Đã tạo cảnh báo', undefined),
  );

  prices.AAPL = 205;
  await act(() => refreshQuotes());
  expect(Notifications.postLocalNotification).not.toHaveBeenCalled();

  prices.AAPL = 212;
  await act(() => refreshQuotes());
  expect(Notifications.postLocalNotification).toHaveBeenCalledWith(
    expect.objectContaining({title: 'AAPL đã chạm $212.00'}),
    expect.any(Number),
  );
  expect(await screen.findByText('Đã kích hoạt (1)')).toBeOnTheScreen();
});

it('resets a forgotten password with a code sent as a notification', async () => {
  await render(<App />);
  await fireEvent.press(
    await screen.findByTestId('onboarding-login', {}, {timeout: 5000}),
  );
  await fireEvent.press(screen.getByTestId('login-forgot'));
  await fireEvent.changeText(
    screen.getByTestId('forgot-email'),
    'nobody@example.com',
  );
  await fireEvent.press(screen.getByTestId('forgot-submit'));
  expect(alertSpy).toHaveBeenLastCalledWith(
    'Lỗi',
    'Không tìm thấy tài khoản với email này.',
  );

  await fireEvent.changeText(screen.getByTestId('forgot-email'), DEMO.email);
  await fireEvent.press(screen.getByTestId('forgot-submit'));
  await waitFor(() =>
    expect(Notifications.postLocalNotification).toHaveBeenCalled(),
  );
  const body: string = (Notifications.postLocalNotification as jest.Mock).mock
    .calls[0][0].body;
  const code = body.match(/\d{5}/)![0];

  for (let i = 0; i < 5; i++) {
    await fireEvent.changeText(screen.getByTestId(`otp_input_${i}`), code[i]);
  }
  await fireEvent.press(screen.getByTestId('otp-verify'));
  await fireEvent.changeText(
    await screen.findByTestId('reset-password'),
    'newpass1',
  );
  await fireEvent.changeText(screen.getByTestId('reset-confirm'), 'newpass1');
  await fireEvent.press(screen.getByTestId('forgot-submit'));
  await pressAlert('OK');

  await fireEvent.changeText(
    await screen.findByTestId('login-email'),
    DEMO.email,
  );
  await fireEvent.changeText(screen.getByTestId('login-password'), 'newpass1');
  await fireEvent.press(screen.getByTestId('login-submit'));
  expect(await screen.findByTestId('welcome-start')).toBeOnTheScreen();
}, 15000);

it('switches the language and logs out', async () => {
  await startLoggedIn();
  await fireEvent.press(screen.getByTestId('tab-Profile'));
  await fireEvent.press(await screen.findByTestId('profile-Language'));
  await fireEvent.press(await screen.findByTestId('language-en'));
  expect(await screen.findByText('Language')).toBeOnTheScreen();
  expect(await AsyncStorage.getItem('stockline.language')).toBe('"en"');

  await fireEvent.press(screen.getByLabelText('Back'));
  await fireEvent.press(await screen.findByTestId('profile-logout'));
  await pressAlert('Log out');
  expect(await screen.findByTestId('login-submit')).toBeOnTheScreen();
  expect(await AsyncStorage.getItem('userLoginStorage')).toBeNull();
});

it('skips onboarding to the login page and trades as a guest', async () => {
  prices.AAPL = 200;
  await render(<App />);
  await fireEvent.press(
    await screen.findByTestId('onboarding-skip', {}, {timeout: 5000}),
  );
  await fireEvent.press(await screen.findByTestId('login-guest'));
  await screen.findByTestId('home-total');

  await openStock('AAPL');
  await fireEvent.press(screen.getByTestId('detail-buy'));
  await placeOrder('1');
  const guest = JSON.parse(
    (await AsyncStorage.getItem('stockline.user.guest'))!,
  );
  expect(guest.portfolio.positions.AAPL.shares).toBe(1);
  expect(await AsyncStorage.getItem(`stockline.user.${DEMO.email}`)).toBeNull();

  await fireEvent.press(screen.getByLabelText('Quay lại'));
  await fireEvent.press(await screen.findByTestId('tab-Profile'));
  expect(await screen.findByTestId('profile-name')).toHaveTextContent('Khách');
  expect(screen.queryByTestId('profile-Account')).toBeNull();
  await fireEvent.press(screen.getByTestId('profile-logout'));
  await pressAlert('Thoát chế độ khách');
  expect(await screen.findByTestId('login-guest')).toBeOnTheScreen();
}, 15000);

it("shows the built-in About description when Yahoo's profile is unavailable", async () => {
  profileAvailable = false;
  await startLoggedIn();
  await openStock('NVDA');
  expect(await screen.findByTestId('detail-description')).toHaveTextContent(
    /NVIDIA thiết kế bộ xử lý đồ họa/,
  );
  expect(screen.getByText('Santa Clara, California, Hoa Kỳ')).toBeOnTheScreen();
  expect(screen.queryByTestId('detail-retry-profile')).toBeNull();
});

it('explains a stock with AI and shows indicator history', async () => {
  prices.AAPL = 200;
  await startLoggedIn();
  await openStock('AAPL');
  await fireEvent.press(screen.getByTestId('detail-learn'));

  // Indicator history from five years of daily prices.
  const row = await screen.findByTestId('indicator-aboveSma200');
  expect(row).toHaveTextContent(/Hiện tại: đúng/);
  expect(row).toHaveTextContent(/Cao hơn 100.00% số lần/);
  expect(
    screen.getByText(/không đảm bảo kết quả trong tương lai/),
  ).toBeOnTheScreen();

  // No key yet: paste one (it's checked with Google, then saved).
  await fireEvent.changeText(
    await screen.findByTestId('ai-key-input'),
    'test-key',
  );
  await fireEvent.press(screen.getByTestId('ai-key-save'));
  await waitFor(async () =>
    expect(await AsyncStorage.getItem('stockline.geminiKey')).toBe(
      '"test-key"',
    ),
  );

  await fireEvent.press(await screen.findByTestId('insights-explain'));
  await pressAlert('Tiếp tục'); // AI notice, once per session
  expect(
    await screen.findByText('Apple bán iPhone và dịch vụ.'),
  ).toBeOnTheScreen();
  expect(screen.getByTestId('insights-ai-label')).toHaveTextContent(
    /gemini-3.8-flash.*không phải tư vấn đầu tư/,
  );

  // Only public market data goes to the AI.
  expect(geminiBodies).toHaveLength(1);
  expect(geminiBodies[0]).not.toContain(DEMO.email);
  expect(geminiBodies[0]).not.toContain(DEMO.name);
  expect(geminiBodies[0]).toContain('AAPL');
});

it('ranks the biggest gainers and losers by period', async () => {
  prices.NVDA = 150; // +50% today
  prices.AAPL = 120;
  prices.INTC = 50; // -50% today
  yearBase.TSLA = 40; // +150% over the year
  await startLoggedIn();
  await fireEvent.press(screen.getByTestId('home-movers'));

  expect(await screen.findByTestId('mover-1')).toHaveTextContent(
    /NVDA.*\+50\.00%/,
  );
  expect(screen.getByTestId('mover-2')).toHaveTextContent(/AAPL/);

  await fireEvent.press(screen.getByTestId('movers-losers'));
  expect(screen.getByTestId('mover-1')).toHaveTextContent(/INTC.*-50\.00%/);

  await fireEvent.press(screen.getByTestId('movers-gainers'));
  await fireEvent.press(screen.getByTestId('movers-period-year'));
  await waitFor(() =>
    expect(screen.getByTestId('mover-1')).toHaveTextContent(/TSLA.*\+150\.00%/),
  );
  expect(screen.getByText(/không phải khuyến nghị/)).toBeOnTheScreen();
});
