// Market data from Yahoo Finance's public (unofficial) endpoints, for the
// live screens: quotes, charts, search, news and company info. Daily closes
// for the automation engine come through data/yahooProvider.ts instead, which
// reuses getJSON. Switching providers means rewriting these two files and
// keeping their exported types.

import {readJSON, removeKey, writeJSON} from './storage';

const QUERY1 = 'https://query1.finance.yahoo.com';
const QUERY2 = 'https://query2.finance.yahoo.com';
const TIMEOUT_MS = 10000;
const SPARK_BATCH_SIZE = 20; // Yahoo's limit per spark request

export interface Quote {
  symbol: string;
  name: string;
  type: string; // EQUITY, ETF, INDEX...
  currency: string;
  exchange: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketOpen: boolean;
  updatedAt: number;
  spark: number[]; // today's intraday prices
}

export type ChartRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y';

export interface ChartPoint {
  t: number;
  value: number;
}

export interface ChartData {
  symbol: string;
  range: ChartRange;
  points: ChartPoint[];
  // Price the range's change is measured from.
  baseline: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface NewsItem {
  id: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: number;
  thumbnail?: string;
}

export interface CompanyInfo {
  description?: string;
  website?: string;
  employees?: number;
  headquarters?: string;
  sector?: string;
  leader?: string;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  open?: number;
  volume?: number;
  averageVolume?: number;
  financials: {year: number; revenue: number; earnings: number}[];
}

const RANGE_PARAMS: Record<ChartRange, {range: string; interval: string}> = {
  '1D': {range: '1d', interval: '5m'},
  '1W': {range: '5d', interval: '30m'},
  '1M': {range: '1mo', interval: '1d'},
  '3M': {range: '3mo', interval: '1d'},
  '6M': {range: '6mo', interval: '1d'},
  '1Y': {range: '1y', interval: '1d'},
  '5Y': {range: '5y', interval: '1wk'},
};

const SEARCHABLE_TYPES = ['EQUITY', 'ETF', 'INDEX', 'MUTUALFUND'];

export class MarketDataError extends Error {}

const request = async (url: string, init?: RequestInit) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {...init, signal: controller.signal});
  } finally {
    clearTimeout(timer);
  }
};

export const getJSON = async (url: string) => {
  const res = await request(url);
  if (!res.ok) {
    throw new MarketDataError(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
};

// Short-lived cache so screens that mount together share one request.
const cache = new Map<string, {expires: number; value: Promise<unknown>}>();

const cached = <T>(key: string, ttlMs: number, load: () => Promise<T>) => {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) {
    return hit.value as Promise<T>;
  }
  const value = load();
  cache.set(key, {expires: Date.now() + ttlMs, value});
  value.catch(() => cache.delete(key));
  return value;
};

export const clearMarketDataCache = () => {
  cache.clear();
  crumbRequest = null;
};

const finiteValues = (values: unknown[] = []) =>
  values.filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value),
  );

const isMarketOpen = (meta: any, now: number) => {
  const regular = meta?.currentTradingPeriod?.regular;
  if (!regular) {
    return false;
  }
  const seconds = now / 1000;
  return seconds >= regular.start && seconds < regular.end;
};

export const parseQuote = (
  meta: any,
  closes: unknown[] = [],
  now = Date.now(),
): Quote => {
  const price: number = meta.regularMarketPrice;
  const previousClose: number =
    meta.previousClose ?? meta.chartPreviousClose ?? price;
  const change = price - previousClose;
  return {
    symbol: meta.symbol,
    name: meta.longName || meta.shortName || meta.symbol,
    type: meta.instrumentType ?? 'EQUITY',
    currency: meta.currency ?? 'USD',
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? '',
    price,
    previousClose,
    change,
    changePercent: previousClose ? (change / previousClose) * 100 : 0,
    dayHigh: meta.regularMarketDayHigh,
    dayLow: meta.regularMarketDayLow,
    volume: meta.regularMarketVolume,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    marketOpen: isMarketOpen(meta, now),
    updatedAt: (meta.regularMarketTime ?? now / 1000) * 1000,
    spark: finiteValues(closes),
  };
};

// Batched price series for many symbols; symbols Yahoo doesn't know are
// left out.
const fetchSpark = async (
  symbols: string[],
  range: string,
  interval: string,
) => {
  const unique = [...new Set(symbols)];
  const batches: string[][] = [];
  for (let i = 0; i < unique.length; i += SPARK_BATCH_SIZE) {
    batches.push(unique.slice(i, i + SPARK_BATCH_SIZE));
  }
  const responses = await Promise.all(
    batches.map(batch =>
      getJSON(
        `${QUERY1}/v7/finance/spark?symbols=${batch
          .map(encodeURIComponent)
          .join(',')}&range=${range}&interval=${interval}`,
      ),
    ),
  );
  const series: {symbol: string; meta: any; closes: unknown[]}[] = [];
  for (const data of responses) {
    for (const item of data?.spark?.result ?? []) {
      const response = item?.response?.[0];
      if (typeof response?.meta?.regularMarketPrice === 'number') {
        series.push({
          symbol: item.symbol,
          meta: response.meta,
          closes: response.indicators?.quote?.[0]?.close ?? [],
        });
      }
    }
  }
  return series;
};

export const getQuotes = async (
  symbols: string[],
): Promise<Record<string, Quote>> => {
  const quotes: Record<string, Quote> = {};
  for (const {symbol, meta, closes} of await fetchSpark(symbols, '1d', '5m')) {
    quotes[symbol] = parseQuote(meta, closes);
  }
  return quotes;
};

export type GrowthPeriod = 'day' | 'week' | 'month' | 'year';

export interface Performance {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  changePercent: number; // over the period
  spark: number[]; // prices across the period
}

const PERIOD_PARAMS: Record<GrowthPeriod, {range: string; interval: string}> = {
  day: {range: '1d', interval: '15m'},
  week: {range: '5d', interval: '30m'},
  month: {range: '1mo', interval: '1d'},
  year: {range: '1y', interval: '1wk'},
};

// Price change over a period for many symbols, measured from the close just
// before the period started (the previous close, for a day).
export const getPerformance = (
  symbols: string[],
  period: GrowthPeriod,
  {fresh = false}: {fresh?: boolean} = {},
) => {
  const {range, interval} = PERIOD_PARAMS[period];
  const key = `performance:${period}:${symbols.join(',')}`;
  if (fresh) {
    cache.delete(key);
  }
  return cached(
    key,
    period === 'day' ? 60 * 1000 : 15 * 60 * 1000,
    async (): Promise<Performance[]> =>
      (await fetchSpark(symbols, range, interval))
        .map(({symbol, meta, closes}) => {
          const spark = finiteValues(closes);
          const base: number | undefined =
            (period === 'day' ? meta.previousClose : undefined) ??
            meta.chartPreviousClose ??
            spark[0];
          return {
            symbol,
            name: meta.longName || meta.shortName || symbol,
            currency: meta.currency ?? 'USD',
            price: meta.regularMarketPrice,
            changePercent: base
              ? (meta.regularMarketPrice / base - 1) * 100
              : 0,
            spark,
          };
        })
        .filter(item => Number.isFinite(item.changePercent)),
  );
};

const fetchSeries = async (symbol: string, range: string, interval: string) => {
  const data = await getJSON(
    `${QUERY1}/v8/finance/chart/${encodeURIComponent(
      symbol,
    )}?range=${range}&interval=${interval}`,
  );
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new MarketDataError(`No chart data for ${symbol}`);
  }
  const timestamps: number[] = result.timestamp ?? [];
  const closes: unknown[] = result.indicators?.quote?.[0]?.close ?? [];
  const points = timestamps
    .map((ts, i) => ({t: ts * 1000, value: closes[i] as number}))
    .filter(point => Number.isFinite(point.value));
  return {points, meta: result.meta ?? {}};
};

export const getChart = (symbol: string, range: ChartRange) => {
  const params = RANGE_PARAMS[range];
  const ttl = range === '1D' || range === '1W' ? 60 * 1000 : 10 * 60 * 1000;
  return cached(
    `chart:${symbol}:${range}`,
    ttl,
    async (): Promise<ChartData> => {
      const {points, meta} = await fetchSeries(
        symbol,
        params.range,
        params.interval,
      );
      const baseline =
        range === '1D'
          ? meta.previousClose ?? meta.chartPreviousClose
          : meta.chartPreviousClose;
      return {
        symbol,
        range,
        points,
        baseline: baseline ?? points[0]?.value ?? 0,
      };
    },
  );
};

// Five years of daily closes, for indicator statistics.
export const getDailyHistory = (symbol: string) =>
  cached(
    `daily:${symbol}`,
    6 * 60 * 60 * 1000,
    async (): Promise<ChartPoint[]> =>
      (await fetchSeries(symbol, '5y', '1d')).points,
  );

export const searchSymbols = (query: string) => {
  const q = query.trim();
  if (!q) {
    return Promise.resolve([]);
  }
  return cached(
    `search:${q.toLowerCase()}`,
    5 * 60 * 1000,
    async (): Promise<SearchResult[]> => {
      const data = await getJSON(
        `${QUERY2}/v1/finance/search?q=${encodeURIComponent(
          q,
        )}&quotesCount=12&newsCount=0&listsCount=0`,
      );
      return (data?.quotes ?? [])
        .filter(
          (item: any) =>
            item.symbol && SEARCHABLE_TYPES.includes(item.quoteType),
        )
        .map((item: any) => ({
          symbol: item.symbol,
          name: item.longname || item.shortname || item.symbol,
          exchange: item.exchDisp || item.exchange || '',
          type: item.quoteType,
        }));
    },
  );
};

const pickThumbnail = (thumbnail: any): string | undefined => {
  const resolutions: any[] = thumbnail?.resolutions ?? [];
  const small =
    resolutions.find(r => r.tag === '140x140') ??
    resolutions[resolutions.length - 1];
  return small?.url;
};

export const getNews = (symbol: string) =>
  cached(`news:${symbol}`, 5 * 60 * 1000, async (): Promise<NewsItem[]> => {
    const data = await getJSON(
      `${QUERY2}/v1/finance/search?q=${encodeURIComponent(
        symbol,
      )}&quotesCount=0&newsCount=10&listsCount=0`,
    );
    return (data?.news ?? [])
      .filter((item: any) => item.title && item.link)
      .map((item: any) => ({
        id: item.uuid ?? item.link,
        title: item.title,
        publisher: item.publisher ?? '',
        link: item.link,
        publishedAt: (item.providerPublishTime ?? 0) * 1000,
        thumbnail: pickThumbnail(item.thumbnail),
      }));
  });

// The company profile endpoint needs a "crumb" tied to a session cookie.
// Yahoo rate-limits handing out new crumbs, so keep it across launches (the
// cookie itself is persisted by the OS).
const CRUMB_KEY = 'stockline.yahooCrumb';
let crumbRequest: Promise<string> | null = null;

const getCrumb = () => {
  if (!crumbRequest) {
    crumbRequest = (async () => {
      const saved = await readJSON<string | null>(CRUMB_KEY, null);
      if (saved) {
        return saved;
      }
      // fc.yahoo.com answers 404 but sets the cookie the crumb belongs to.
      await request('https://fc.yahoo.com', {credentials: 'include'}).catch(
        () => undefined,
      );
      const res = await request(`${QUERY1}/v1/test/getcrumb`, {
        credentials: 'include',
      });
      const crumb = (await res.text()).trim();
      if (!res.ok || !crumb || crumb.includes('<')) {
        throw new MarketDataError(
          `Could not get a Yahoo crumb (${res.status})`,
        );
      }
      await writeJSON(CRUMB_KEY, crumb);
      return crumb;
    })();
    crumbRequest.catch(() => {
      crumbRequest = null;
    });
  }
  return crumbRequest;
};

const raw = (field: any): number | undefined => {
  if (typeof field?.raw === 'number') {
    return field.raw;
  }
  return typeof field === 'number' ? field : undefined;
};

export const parseCompanyInfo = (result: any): CompanyInfo => {
  const profile = result?.assetProfile ?? {};
  const summary = result?.summaryDetail ?? {};
  const officer = profile.companyOfficers?.[0];
  const headquarters = [profile.city, profile.state, profile.country]
    .filter(Boolean)
    .join(', ');
  const sector = [profile.sector, profile.industry].filter(Boolean).join(' · ');
  return {
    description: profile.longBusinessSummary,
    website: profile.website?.replace(/^https?:\/\/(www\.)?/, ''),
    employees: profile.fullTimeEmployees,
    headquarters: headquarters || undefined,
    sector: sector || undefined,
    leader: officer?.name
      ? `${officer.name}${officer.title ? ` (${officer.title})` : ''}`
      : undefined,
    marketCap: raw(summary.marketCap),
    peRatio: raw(summary.trailingPE),
    dividendYield: raw(summary.dividendYield),
    open: raw(summary.open),
    volume: raw(summary.volume),
    averageVolume: raw(summary.averageVolume),
    financials: (result?.earnings?.financialsChart?.yearly ?? []).map(
      (year: any) => ({
        year: year.date,
        revenue: raw(year.revenue) ?? 0,
        earnings: raw(year.earnings) ?? 0,
      }),
    ),
  };
};

export const getCompanyInfo = (symbol: string) =>
  cached(
    `company:${symbol}`,
    6 * 60 * 60 * 1000,
    async (): Promise<CompanyInfo> => {
      const load = async () => {
        const crumb = await getCrumb();
        return request(
          `${QUERY2}/v10/finance/quoteSummary/${encodeURIComponent(
            symbol,
          )}?modules=assetProfile,summaryDetail,earnings&crumb=${encodeURIComponent(
            crumb,
          )}`,
          {credentials: 'include'},
        );
      };
      let res = await load();
      if (res.status === 401 || res.status === 403) {
        // The crumb expired; get a new one once.
        crumbRequest = null;
        await removeKey(CRUMB_KEY);
        res = await load();
      }
      if (!res.ok) {
        throw new MarketDataError(`HTTP ${res.status} for ${symbol} profile`);
      }
      const data = await res.json();
      return parseCompanyInfo(data?.quoteSummary?.result?.[0]);
    },
  );

// Logos for US tickers; anything else falls back to a letter avatar.
export const logoUrl = (symbol: string) =>
  /^[A-Z]{1,5}(-[A-Z])?$/.test(symbol)
    ? `https://financialmodelingprep.com/image-stock/${symbol}.png`
    : undefined;

// Only USD stocks and ETFs can be traded with the USD virtual account.
export const isTradable = (quote?: Quote) =>
  !!quote &&
  quote.currency === 'USD' &&
  (quote.type === 'EQUITY' || quote.type === 'ETF');
