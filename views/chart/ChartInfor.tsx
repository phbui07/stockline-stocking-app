/* eslint-disable react-native/no-inline-styles */
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useEffect, useState} from 'react';
import {container, vh, vw} from '../../services/styleSheet';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {addIcon, nextIcon, notiIcon} from '../../assets/svgXML';
import {BarChart} from 'react-native-gifted-charts/dist/BarChart';
import {useQuote} from '../../services/quoteStore';
import {useUserData} from '../../services/userData';
import {toHolding} from '../../services/portfolio';
import {
  ChartData,
  ChartRange,
  CompanyInfo,
  getChart,
  getCompanyInfo,
  getNews,
  isTradable,
  NewsItem,
  Quote,
} from '../../services/marketData';
import {useI18n} from '../../services/i18n';
import {
  changeColor,
  formatCompact,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPoints,
  formatShares,
  formatTime,
} from '../../services/format';
import {COMPANY_ABOUT, CompanyAbout} from '../../locales/companies';
import ScreenHeader from '../../components/ScreenHeader';
import StockLogo from '../../components/StockLogo';
import PriceChart from '../../components/PriceChart';
import {formatQuotePrice} from '../../components/StockRow';

const RANGES: ChartRange[] = ['1D', '1W', '1M', '6M', '1Y', '5Y'];
type Tab = 'about' | 'details' | 'news';
type Nav = NativeStackNavigationProp<any>;

const ChartInfor = () => {
  const route = useRoute();
  const {symbol} = route.params as {symbol: string};
  const navigation = useNavigation<Nav>();
  const {t} = useI18n();
  const {quote} = useQuote(symbol);
  const {data} = useUserData();
  const position = data.portfolio.positions[symbol];
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [infoFailed, setInfoFailed] = useState(false);
  const [infoAttempt, setInfoAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setInfoFailed(false);
    getCompanyInfo(symbol)
      .then(result => !cancelled && setInfo(result))
      .catch(() => !cancelled && setInfoFailed(true));
    return () => {
      cancelled = true;
    };
  }, [symbol, infoAttempt]);

  const tradable = isTradable(quote);
  const order = (side: 'BUY' | 'SELL') =>
    navigation.navigate('BuyingVerify', {symbol, side});

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <ScreenHeader title={t('detail.title')} />
        <BannerView symbol={symbol} quote={quote} />
        <ChartView symbol={symbol} quote={quote} />
        {position ? (
          <PositionCard holding={toHolding(position, quote)} />
        ) : null}
        <TouchableOpacity
          testID="detail-learn"
          style={styles.learnCard}
          onPress={() => navigation.navigate('Insights', {symbol})}>
          <View style={styles.flexShrink}>
            <Text style={styles.learnTitle}>{t('detail.learnMore')}</Text>
            <Text style={styles.greyTxt}>{t('detail.learnMoreDesc')}</Text>
          </View>
          {nextIcon(vw(7), vw(7), '#FFED4B')}
        </TouchableOpacity>
        <TabView
          symbol={symbol}
          quote={quote}
          info={info}
          infoFailed={infoFailed}
          onRetryInfo={() => setInfoAttempt(attempt => attempt + 1)}
        />
        <View style={styles.actions}>
          {quote && !tradable ? (
            <Text style={styles.greyNote}>{t('detail.notTradable')}</Text>
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                testID="detail-buy"
                disabled={!quote}
                onPress={() => order('BUY')}
                style={[styles.buyBtn, !quote && styles.disabled]}>
                <Text style={styles.buyText}>{t('trade.buy')}</Text>
              </TouchableOpacity>
              {position ? (
                <TouchableOpacity
                  testID="detail-sell"
                  onPress={() => order('SELL')}
                  style={[styles.buyBtn, styles.sellBtn]}>
                  <Text style={[styles.buyText, {color: '#FFFFFF'}]}>
                    {t('trade.sell')}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const BannerView: React.FC<{symbol: string; quote?: Quote}> = ({
  symbol,
  quote,
}) => {
  const navigation = useNavigation<Nav>();
  const {t, lang} = useI18n();
  const {isWatched, toggleWatch} = useUserData();
  const watching = isWatched(symbol);
  const color = changeColor(quote?.change ?? 0);
  const isIndex = quote?.type === 'INDEX';

  return (
    <View style={styles.stockContainer}>
      <View style={styles.stock3Container}>
        <View style={styles.stockContent1}>
          <StockLogo symbol={symbol} />
          <View style={{flexShrink: 1}}>
            <Text style={styles.stock3Title}>{symbol}</Text>
            <Text style={styles.stock3Sub} numberOfLines={1}>
              {quote?.name ?? ''}
            </Text>
          </View>
        </View>
        <View style={styles.bannerActions}>
          <TouchableOpacity
            testID="detail-watch"
            accessibilityRole="button"
            accessibilityLabel={t(watching ? 'detail.unwatch' : 'detail.watch')}
            style={[styles.iconBtn, watching && styles.iconBtnActive]}
            onPress={() => toggleWatch(symbol)}>
            {addIcon(vw(5), vw(5), watching ? '#FFED4B' : '#1A1A1A')}
          </TouchableOpacity>
          {!isIndex ? (
            <TouchableOpacity
              testID="detail-alert"
              accessibilityRole="button"
              accessibilityLabel={t('detail.setAlert')}
              style={styles.iconBtn}
              onPress={() => navigation.navigate('Alerts', {symbol})}>
              {notiIcon(vw(5), vw(5), '#1A1A1A')}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View style={styles.priceRow}>
        <View>
          <Text testID="detail-price" style={styles.priceTxt}>
            {quote ? formatQuotePrice(quote) : '—'}
          </Text>
          {quote ? (
            <Text style={[styles.changeTxt, {color}]}>
              {isIndex
                ? `${quote.change >= 0 ? '+' : '-'}${formatPoints(
                    Math.abs(quote.change),
                  )}`
                : formatMoney(quote.change, {
                    signed: true,
                    currency: quote.currency,
                  })}{' '}
              ({formatPercent(quote.changePercent)}){' '}
              <Text style={styles.greyTxt}>{t('common.today')}</Text>
            </Text>
          ) : null}
        </View>
        {quote ? (
          <View style={{alignItems: 'flex-end'}}>
            <Text
              style={[
                styles.greyTxt,
                {color: quote.marketOpen ? '#5DC172' : '#76787E'},
              ]}>
              {t(
                quote.marketOpen ? 'common.marketOpen' : 'common.marketClosed',
              )}
            </Text>
            <Text style={styles.greyTxt}>
              {t('common.updatedAt', {time: formatTime(quote.updatedAt, lang)})}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const ChartView: React.FC<{symbol: string; quote?: Quote}> = ({
  symbol,
  quote,
}) => {
  const {t, lang} = useI18n();
  const [range, setRange] = useState<ChartRange>('1D');
  const [chart, setChart] = useState<ChartData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChart(null);
    setFailed(false);
    getChart(symbol, range)
      .then(result => !cancelled && setChart(result))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  const last = chart?.points[chart.points.length - 1]?.value;
  const rangeChange = chart && last !== undefined ? last - chart.baseline : 0;
  const rangePercent = chart?.baseline
    ? (rangeChange / chart.baseline) * 100
    : 0;
  const isIndex = quote?.type === 'INDEX';
  const format = (value: number) =>
    isIndex
      ? formatPoints(value)
      : formatMoney(value, {currency: quote?.currency});

  return (
    <View style={{marginVertical: vh(2), paddingHorizontal: vw(5)}}>
      <View style={{height: 180, justifyContent: 'center'}}>
        {failed ? (
          <Text style={[styles.greyNote, {textAlign: 'center'}]}>
            {t('detail.chartError')}
          </Text>
        ) : !chart ? (
          <ActivityIndicator color="#FFED4B" />
        ) : (
          <PriceChart
            points={chart.points}
            width={vw(90)}
            color={changeColor(rangeChange)}
            formatValue={format}
            formatTime={time =>
              range === '1D'
                ? formatTime(time, lang)
                : formatDateTime(time, lang)
            }
          />
        )}
      </View>
      {chart && range !== '1D' ? (
        <Text style={[styles.changeTxt, {color: changeColor(rangeChange)}]}>
          {formatPercent(rangePercent)} · {t(`range.${range}`)}
        </Text>
      ) : null}
      <View style={styles.rangeRow}>
        {RANGES.map(item => (
          <TouchableOpacity
            key={item}
            testID={`range-${item}`}
            style={[styles.rangeBtn, range === item && styles.rangeBtnActive]}
            onPress={() => setRange(item)}>
            <Text
              style={[
                styles.rangeText,
                range === item && styles.rangeTextActive,
              ]}>
              {t(`range.${item}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const PositionCard: React.FC<{holding: ReturnType<typeof toHolding>}> = ({
  holding,
}) => {
  const {t} = useI18n();
  const rows: [string, string, string?][] = [
    [t('detail.positionShares'), formatShares(holding.position.shares)],
    [t('detail.positionAvg'), formatMoney(holding.position.avgCost)],
    [t('detail.positionValue'), formatMoney(holding.value)],
    [
      t('detail.positionPnl'),
      `${formatMoney(holding.pnl, {signed: true})} (${formatPercent(
        holding.pnlPercent,
      )})`,
      changeColor(holding.pnl),
    ],
  ];
  return (
    <View testID="detail-position" style={styles.positionCard}>
      <Text style={styles.sectionTitle}>{t('detail.position')}</Text>
      {rows.map(([label, value, color]) => (
        <View key={label} style={styles.infoRow}>
          <Text style={styles.infoKey}>{label}</Text>
          <Text style={[styles.statValue, color ? {color} : null]}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
};

const TabView: React.FC<{
  symbol: string;
  quote?: Quote;
  info: CompanyInfo | null;
  infoFailed: boolean;
  onRetryInfo: () => void;
}> = ({symbol, quote, info, infoFailed, onRetryInfo}) => {
  const {t} = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('about');
  const tabs: {key: Tab; label: string}[] = [
    {key: 'about', label: t('detail.about')},
    {key: 'details', label: t('detail.details')},
    {key: 'news', label: t('detail.news')},
  ];

  return (
    <View style={styles.container1}>
      <View style={styles.tabContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            testID={`detail-tab-${tab.key}`}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}>
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && {color: 'black'},
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeTab === 'news' ? (
        <NewsView symbol={symbol} />
      ) : activeTab === 'details' ? (
        // Quote-based stats still work when the profile can't be loaded.
        <DetailView info={info} quote={quote} />
      ) : info || COMPANY_ABOUT[symbol] ? (
        <IntroduceView
          info={info}
          about={COMPANY_ABOUT[symbol]}
          quote={quote}
        />
      ) : (
        <View style={[styles.scene, {rowGap: vh(1.5)}]}>
          {infoFailed ? (
            <>
              <Text style={styles.greyNote}>{t('detail.profileError')}</Text>
              <TouchableOpacity
                testID="detail-retry-profile"
                style={styles.retryBtn}
                onPress={onRetryInfo}>
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ActivityIndicator color="#FFED4B" />
          )}
        </View>
      )}
    </View>
  );
};

// Built-in descriptions (short, in the app's language) come first; Yahoo's
// profile, when it loads, fills in what they don't cover.
const IntroduceView: React.FC<{
  info: CompanyInfo | null;
  about?: CompanyAbout;
  quote?: Quote;
}> = ({info, about, quote}) => {
  const {t, lang} = useI18n();
  const description = about?.description[lang] ?? info?.description;
  const rows: [string, string | undefined][] = [
    [t('detail.website'), info?.website ?? about?.website],
    [t('detail.since'), about ? String(about.since) : undefined],
    [
      t('detail.employees'),
      info?.employees ? formatNumber(info.employees) : undefined,
    ],
    [
      t('detail.headquarters'),
      about?.headquarters?.[lang] ?? info?.headquarters,
    ],
    [t('detail.sector'), about?.sector?.[lang] ?? info?.sector],
    [t('detail.leader'), info?.leader],
    [t('detail.exchange'), quote?.exchange],
  ];
  const visible = rows.filter(([, value]) => !!value);

  return (
    <View style={styles.scene}>
      {description ? (
        <Text testID="detail-description" style={styles.text}>
          {description}
        </Text>
      ) : (
        <Text style={styles.greyNote}>{t('detail.noProfile')}</Text>
      )}
      <View style={styles.infoContainer}>
        {visible.map(([label, value]) => (
          <TouchableOpacity
            key={label}
            style={styles.infoRow}
            disabled={label !== t('detail.website')}
            onPress={() => Linking.openURL(`https://${value}`)}>
            <Text style={styles.infoKey}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const DetailView: React.FC<{info: CompanyInfo | null; quote?: Quote}> = ({
  info,
  quote,
}) => {
  const {t} = useI18n();
  const range = (low?: number, high?: number) =>
    low !== undefined && high !== undefined
      ? `${formatPoints(low)} – ${formatPoints(high)}`
      : undefined;
  const stats: [string, string | undefined][] = [
    [
      t('detail.open'),
      info?.open !== undefined ? formatPoints(info.open) : undefined,
    ],
    [
      t('detail.prevClose'),
      quote ? formatPoints(quote.previousClose) : undefined,
    ],
    [t('detail.dayRange'), range(quote?.dayLow, quote?.dayHigh)],
    [
      t('detail.yearRange'),
      range(quote?.fiftyTwoWeekLow, quote?.fiftyTwoWeekHigh),
    ],
    [
      t('detail.volume'),
      quote?.volume ? formatCompact(quote.volume) : undefined,
    ],
    [
      t('detail.avgVolume'),
      info?.averageVolume ? formatCompact(info.averageVolume) : undefined,
    ],
    [
      t('detail.marketCap'),
      info?.marketCap ? `$${formatCompact(info.marketCap)}` : undefined,
    ],
    [t('detail.pe'), info?.peRatio ? info.peRatio.toFixed(2) : undefined],
    [
      t('detail.dividendYield'),
      info?.dividendYield !== undefined
        ? formatPercent(info.dividendYield * 100, false)
        : undefined,
    ],
  ];

  const barData = (info?.financials ?? []).flatMap(year => [
    {
      value: year.revenue / 1e9,
      raw: year.revenue,
      label: String(year.year),
      spacing: 2,
      labelWidth: 40,
      labelTextStyle: {color: 'gray'},
      frontColor: '#7DC1F1',
    },
    {value: year.earnings / 1e9, raw: year.earnings, frontColor: '#FFED4B'},
  ]);

  return (
    <View style={[styles.scene, {rowGap: vh(1)}]}>
      <Text style={styles.sectionTitle}>{t('detail.keyStats')}</Text>
      <View style={styles.infoContainer}>
        {stats
          .filter(([, value]) => !!value)
          .map(([label, value]) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoKey}>{label}</Text>
              <Text style={styles.statValue}>{value}</Text>
            </View>
          ))}
      </View>
      {barData.length ? (
        <>
          <Text style={styles.sectionTitle}>{t('detail.financials')}</Text>
          <View style={styles.financialsCard}>
            <View style={styles.legendRow}>
              <Text style={styles.legendTitle}>{t('detail.year')}</Text>
              <View style={{flexDirection: 'row', columnGap: vw(2)}}>
                <View style={styles.legendItem}>
                  <View style={styles.blueDot} />
                  <Text style={styles.greyTxt}>{t('detail.revenue')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.yellowDot} />
                  <Text style={styles.greyTxt}>{t('detail.netIncome')}</Text>
                </View>
              </View>
            </View>
            <BarChart
              isAnimated
              data={barData}
              barWidth={18}
              spacing={30}
              roundedTop
              hideYAxisText
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              noOfSections={3}
              renderTooltip={(item: {raw: number}) => (
                <View style={styles.barTooltip}>
                  <Text style={{color: '#1A1A1A', fontWeight: '600'}}>
                    ${formatCompact(item.raw)}
                  </Text>
                </View>
              )}
            />
          </View>
        </>
      ) : null}
    </View>
  );
};

const NewsView: React.FC<{symbol: string}> = ({symbol}) => {
  const {t, lang} = useI18n();
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getNews(symbol)
      .then(items => !cancelled && setNews(items))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (failed || (news && news.length === 0)) {
    return (
      <View style={styles.scene}>
        <Text style={styles.greyNote}>{t('detail.noNews')}</Text>
      </View>
    );
  }
  if (!news) {
    return (
      <View style={styles.scene}>
        <ActivityIndicator color="#FFED4B" />
      </View>
    );
  }
  return (
    <View style={{paddingVertical: vh(2), rowGap: vh(2)}}>
      {news.map(item => (
        <TouchableOpacity
          key={item.id}
          style={styles.newsRow}
          onPress={() => Linking.openURL(item.link)}>
          <View style={{flex: 1, rowGap: 4}}>
            <Text style={styles.newsTitle} numberOfLines={3}>
              {item.title}
            </Text>
            <Text style={styles.greyTxt}>
              {item.publisher} · {formatDateTime(item.publishedAt, lang)}
            </Text>
          </View>
          {item.thumbnail ? (
            <Image source={{uri: item.thumbnail}} style={styles.newsImage} />
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default ChartInfor;

const styles = StyleSheet.create({
  container: container,
  stockContainer: {
    paddingHorizontal: vw(5),
    rowGap: vh(2),
  },
  stock3Container: {
    borderRadius: 6,
    width: '100%',
    backgroundColor: '#FFED4B',
    paddingVertical: vh(1.5),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: vw(2),
  },
  stock3Title: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '600',
  },
  stock3Sub: {
    color: '#76787E',
    fontSize: 12,
    fontWeight: '400',
  },
  stockContent1: {
    flexDirection: 'row',
    columnGap: vw(2),
    alignItems: 'center',
    flexShrink: 1,
  },
  bannerActions: {
    flexDirection: 'row',
    columnGap: vw(2),
  },
  iconBtn: {
    padding: vw(1.5),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  iconBtnActive: {
    backgroundColor: '#1A1A1A',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: vw(3),
  },
  priceTxt: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  changeTxt: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  greyTxt: {
    color: '#76787E',
    fontSize: 12,
    fontWeight: '500',
  },
  greyNote: {
    color: '#76787E',
    fontSize: 14,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: vh(2),
  },
  rangeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rangeBtnActive: {
    backgroundColor: '#FFED4B',
  },
  rangeText: {
    color: '#76787E',
    fontSize: 12,
    fontWeight: '600',
  },
  rangeTextActive: {
    color: '#1A1A1A',
  },
  positionCard: {
    marginHorizontal: vw(5),
    backgroundColor: '#2C2C2C',
    borderRadius: 10,
    padding: vw(4),
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: vh(1),
    alignSelf: 'flex-start',
  },
  container1: {
    flex: 1,
    paddingHorizontal: vw(5),
    marginVertical: vh(2),
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    paddingVertical: 16,
    flex: 1,
  },
  activeTab: {
    backgroundColor: '#FFED4B',
    borderRadius: 12,
  },
  tabText: {
    color: '#76787E',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  scene: {
    paddingVertical: vh(2),
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: vw(3),
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  infoContainer: {
    width: '100%',
    marginVertical: vh(2),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoKey: {
    color: '#76787E',
    fontSize: 14,
    width: '50%',
  },
  infoValue: {
    color: '#FFED4B',
    fontSize: 14,
    width: '50%',
    textAlign: 'left',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  financialsCard: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#76787E',
    padding: vw(5),
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vh(1),
  },
  legendTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blueDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7DC1F1',
    marginRight: 5,
  },
  yellowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFED4B',
    marginRight: 5,
  },
  barTooltip: {
    marginBottom: 4,
    backgroundColor: 'white',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newsRow: {
    flexDirection: 'row',
    columnGap: vw(3),
    alignItems: 'center',
  },
  newsTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  newsImage: {
    width: vw(18),
    height: vw(18),
    borderRadius: 8,
    backgroundColor: '#2C2C2C',
  },
  actions: {
    paddingHorizontal: vw(5),
    marginBottom: vh(4),
  },
  buttonRow: {
    flexDirection: 'row',
    columnGap: vw(3),
  },
  buyBtn: {
    flex: 1,
    backgroundColor: '#FFED4B',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: vh(2),
  },
  sellBtn: {
    backgroundColor: '#FF4444',
  },
  buyText: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  disabled: {
    backgroundColor: '#CCCCCC',
  },
  learnCard: {
    marginHorizontal: vw(5),
    marginTop: vh(2),
    padding: vw(4),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFED4B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: vw(3),
  },
  learnTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  flexShrink: {
    flexShrink: 1,
  },
  retryBtn: {
    paddingHorizontal: vw(5),
    paddingVertical: vh(1),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFED4B',
  },
  retryText: {
    color: '#FFED4B',
    fontWeight: '600',
  },
});
