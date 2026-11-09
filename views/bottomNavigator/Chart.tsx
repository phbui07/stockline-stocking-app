/* eslint-disable react-native/no-inline-styles */
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useEffect, useState} from 'react';
import {centerAll, container, vh, vw} from '../../services/styleSheet';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  arrowDownIcon,
  arrowUpIcon,
  increasingCircleIcon,
} from '../../assets/svgXML';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuotes} from '../../services/quoteStore';
import {useUserData} from '../../services/userData';
import {
  portfolioHistory,
  summarize,
  tradedSymbols,
} from '../../services/portfolio';
import {ChartPoint, ChartRange, getChart} from '../../services/marketData';
import {useI18n} from '../../services/i18n';
import {
  changeColor,
  formatDateTime,
  formatMoney,
  formatPercent,
  formatShares,
} from '../../services/format';
import PriceChart from '../../components/PriceChart';
import StockRow from '../../components/StockRow';

const RANGES: ChartRange[] = ['1W', '1M', '3M', '1Y'];

const Chart = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const {t} = useI18n();
  const {data} = useUserData();
  const {portfolio} = data;
  const {quotes, refresh} = useQuotes(Object.keys(portfolio.positions));
  const summary = summarize(portfolio, quotes);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFED4B"
            colors={['#FFED4B']}
          />
        }>
        <View style={[centerAll, styles.headerContainer]}>
          <Text style={styles.headertxt}>{t('portfolio.title')}</Text>
        </View>
        <View style={styles.inforContainer}>
          <Text style={styles.labelText}>{t('home.portfolioTotal')}</Text>
          <View style={styles.inforAmountContainer}>
            <Text testID="portfolio-total" style={styles.inforAmounttxt1}>
              {formatMoney(summary.totalValue)}
            </Text>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text
                style={[
                  styles.inforAmounttxt2,
                  {color: changeColor(summary.totalReturn)},
                ]}>
                {formatPercent(summary.totalReturnPercent)}{' '}
              </Text>
              {summary.totalReturn >= 0
                ? increasingCircleIcon(vw(4), vw(4))
                : null}
            </View>
          </View>
          <Text style={styles.labelText}>
            {formatMoney(summary.totalReturn, {signed: true})}{' '}
            {t('portfolio.allTime')}
          </Text>
          <View style={styles.statusRow}>
            <StatusCard
              label={t('portfolio.gain')}
              amount={summary.gain}
              icon={arrowUpIcon(vw(7), vw(7))}
            />
            <StatusCard
              label={t('portfolio.loss')}
              amount={summary.loss}
              icon={arrowDownIcon(vw(7), vw(7))}
            />
          </View>
        </View>
        <PerformanceChart liveValue={summary.totalValue} />
        <View style={styles.stockViewContainer}>
          <Text style={styles.followHeaderTxT}>{t('portfolio.holdings')}</Text>
          {summary.holdings.length === 0 ? (
            <TouchableOpacity
              style={styles.cta}
              onPress={() => navigation.navigate('Search', {mode: 'buy'})}>
              <Text style={styles.ctaText}>{t('portfolio.findStocks')}</Text>
            </TouchableOpacity>
          ) : (
            summary.holdings.map(holding => (
              <StockRow
                key={holding.position.symbol}
                symbol={holding.position.symbol}
                name={holding.position.name}
                subtitle={t('common.shares', {
                  count: formatShares(holding.position.shares),
                })}
                quote={holding.quote}
                onPress={() =>
                  navigation.navigate('ChartInfor', {
                    symbol: holding.position.symbol,
                  })
                }
              />
            ))
          )}
          <View style={styles.cashRow}>
            <Text style={styles.labelText}>{t('portfolio.cash')}</Text>
            <Text style={styles.amountText}>{formatMoney(summary.cash)}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const PerformanceChart: React.FC<{liveValue: number}> = ({liveValue}) => {
  const {t, lang} = useI18n();
  const {data} = useUserData();
  const {portfolio} = data;
  const [range, setRange] = useState<ChartRange>('1M');
  const [history, setHistory] = useState<ChartPoint[] | null>(null);
  const [failed, setFailed] = useState(false);
  const hasTrades = portfolio.transactions.length > 0;

  useEffect(() => {
    if (!hasTrades) {
      return;
    }
    let cancelled = false;
    setHistory(null);
    setFailed(false);
    const symbols = tradedSymbols(portfolio);
    Promise.all(symbols.map(symbol => getChart(symbol, range)))
      .then(charts => {
        if (cancelled) {
          return;
        }
        const prices: Record<string, ChartPoint[]> = {};
        const timeline = new Set<number>();
        charts.forEach(chart => {
          prices[chart.symbol] = chart.points;
          chart.points.forEach(point => timeline.add(point.t));
        });
        const points = portfolioHistory(portfolio, prices, [...timeline]);
        setHistory(points);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [portfolio, range, hasTrades]);

  // End the line at the live value so it matches the total above.
  const points = history
    ? [...history, {t: Date.now(), value: liveValue}]
    : null;
  const change = points ? liveValue - points[0].value : 0;

  return (
    <View style={styles.chartCard}>
      <View style={styles.rangeRow}>
        {RANGES.map(item => (
          <TouchableOpacity
            key={item}
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
      {!hasTrades ? (
        <Text style={styles.chartMessage}>{t('portfolio.noTrades')}</Text>
      ) : failed ? (
        <Text style={styles.chartMessage}>{t('detail.chartError')}</Text>
      ) : !points ? (
        <ActivityIndicator color="#FFED4B" style={{height: 180}} />
      ) : (
        <PriceChart
          points={points}
          width={vw(82)}
          color={changeColor(change)}
          formatValue={value => formatMoney(value)}
          formatTime={time => formatDateTime(time, lang)}
        />
      )}
    </View>
  );
};

const StatusCard: React.FC<{
  label: string;
  amount: number;
  icon: React.ReactNode;
}> = ({amount, icon, label}) => {
  return (
    <View style={styles.inforStatusContainer}>
      <View style={styles.iconContainer}>{icon}</View>
      <View>
        <Text style={styles.labelText}>{label}</Text>
        <Text style={styles.amountText}>{formatMoney(amount)}</Text>
      </View>
    </View>
  );
};

export default Chart;

const styles = StyleSheet.create({
  container: container,
  headertxt: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerContainer: {
    paddingVertical: vh(2),
  },
  inforContainer: {
    paddingHorizontal: vw(5),
  },
  inforAmountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    columnGap: vw(2),
  },
  inforAmounttxt1: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inforAmounttxt2: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inforStatusContainer: {
    marginVertical: vh(2),
    borderWidth: 1,
    flexDirection: 'row',
    borderRadius: vw(2),
    borderColor: '#76787E',
    paddingVertical: vh(1),
    paddingHorizontal: vw(2),
    width: '47%',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: vw(20),
    borderWidth: 1,
    borderColor: 'gray',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  labelText: {
    color: '#76787E',
  },
  amountText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  chartCard: {
    marginHorizontal: vw(5),
    backgroundColor: '#2C2C2C',
    borderRadius: vw(3),
    padding: vw(4),
    rowGap: vh(2),
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
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
  chartMessage: {
    color: '#76787E',
    textAlign: 'center',
    paddingVertical: vh(6),
  },
  stockViewContainer: {
    paddingHorizontal: vw(5),
    paddingVertical: vh(2),
  },
  followHeaderTxT: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: vh(1),
  },
  cta: {
    backgroundColor: '#FFED4B',
    borderRadius: 16,
    paddingVertical: vh(1.5),
    alignItems: 'center',
    marginVertical: vh(1),
  },
  ctaText: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  cashRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: vh(1.5),
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
    marginTop: vh(1),
  },
});
