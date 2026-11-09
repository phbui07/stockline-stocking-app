/* eslint-disable react-native/no-inline-styles */
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useState} from 'react';
import {container, vh, vw} from '../../services/styleSheet';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  addIcon,
  nextIcon,
  notiIcon,
  stocklineIcon,
  viewIcon,
} from '../../assets/svgXML';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MarketIndices, PopularStocks} from '../../services/renderData';
import {useQuotes} from '../../services/quoteStore';
import {useUserData} from '../../services/userData';
import {summarize} from '../../services/portfolio';
import {useI18n} from '../../services/i18n';
import {changeColor, formatMoney, formatPercent} from '../../services/format';
import type {Quote} from '../../services/marketData';
import StockLogo from '../../components/StockLogo';
import Sparkline from '../../components/Sparkline';
import StockRow from '../../components/StockRow';

type Nav = NativeStackNavigationProp<any>;

const Home = () => {
  const navigation = useNavigation<Nav>();
  const {t} = useI18n();
  const {data} = useUserData();
  const holdingSymbols = Object.keys(data.portfolio.positions);
  const {quotes, error, refresh} = useQuotes([
    ...MarketIndices.map(index => index.symbol),
    ...data.watchlist,
    ...PopularStocks,
    ...holdingSymbols,
  ]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const openStock = (symbol: string) =>
    navigation.navigate('ChartInfor', {symbol});

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFED4B"
            colors={['#FFED4B']}
          />
        }>
        <Header onBell={() => navigation.navigate('Alerts')} />
        <InforView quotes={quotes} />
        {error ? (
          <Text style={styles.errorText}>{t('common.dataError')}</Text>
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{columnGap: vw(3), paddingVertical: vh(2)}}>
          {MarketIndices.map(index => (
            <IndexCard
              key={index.symbol}
              label={index.label}
              quote={quotes[index.symbol]}
              onPress={() => openStock(index.symbol)}
            />
          ))}
        </ScrollView>
        <TouchableOpacity
          testID="home-movers"
          style={styles.moversCard}
          onPress={() => navigation.navigate('TopMovers')}>
          <View style={styles.moversText}>
            <Text style={styles.nameText}>{t('home.movers')}</Text>
            <Text style={styles.shortNameText}>{t('home.moversDesc')}</Text>
          </View>
          {nextIcon(vw(7), vw(7), '#FFED4B')}
        </TouchableOpacity>
        <TouchableOpacity
          testID="home-automate"
          style={styles.moversCard}
          onPress={() => navigation.navigate('Automate')}>
          <View style={styles.moversText}>
            <Text style={styles.nameText}>{t('home.automate')}</Text>
            <Text style={styles.shortNameText}>{t('home.automateDesc')}</Text>
          </View>
          {nextIcon(vw(7), vw(7), '#FFED4B')}
        </TouchableOpacity>
        <FollowView
          symbols={data.watchlist}
          quotes={quotes}
          onOpen={openStock}
          onAdd={() => navigation.navigate('Watchlist')}
        />
        <View style={styles.stockViewContainer}>
          <Text style={styles.followHeaderTxT}>{t('home.popular')}</Text>
          {PopularStocks.map(symbol => (
            <StockRow
              key={symbol}
              testID={`popular-${symbol}`}
              symbol={symbol}
              quote={quotes[symbol]}
              onPress={() => openStock(symbol)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const FollowView: React.FC<{
  symbols: string[];
  quotes: Record<string, Quote | undefined>;
  onOpen: (symbol: string) => void;
  onAdd: () => void;
}> = ({symbols, quotes, onOpen, onAdd}) => {
  const {t} = useI18n();
  return (
    <View>
      <View style={styles.followHeader}>
        <Text style={styles.followHeaderTxT}>{t('home.watchlist')}</Text>
        <TouchableOpacity
          testID="home-watchlist-add"
          accessibilityRole="button"
          accessibilityLabel={t('watchlist.title')}
          onPress={onAdd}>
          {addIcon(vw(7), vw(7))}
        </TouchableOpacity>
      </View>
      {symbols.length === 0 ? (
        <TouchableOpacity style={styles.emptyCard} onPress={onAdd}>
          <Text style={styles.shortNameText}>{t('home.watchlistEmpty')}</Text>
        </TouchableOpacity>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{columnGap: vw(2)}}>
          {symbols.map(symbol => {
            const quote = quotes[symbol];
            const color = changeColor(quote?.change ?? 0);
            return (
              <TouchableOpacity
                key={symbol}
                style={styles.stockContainer}
                onPress={() => onOpen(symbol)}>
                <View style={styles.topRow}>
                  <StockLogo symbol={symbol} />
                  <View style={styles.column}>
                    <Text style={styles.nameText} numberOfLines={1}>
                      {quote?.name ?? symbol}
                    </Text>
                    <Text style={styles.shortNameText}>{symbol}</Text>
                  </View>
                </View>
                <View style={styles.bottomRow}>
                  <View>
                    <Text style={styles.priceText}>
                      {quote
                        ? formatMoney(quote.price, {currency: quote.currency})
                        : '—'}
                    </Text>
                    <Text style={[styles.valueText, {color}]}>
                      {quote ? formatPercent(quote.changePercent) : ''}
                    </Text>
                  </View>
                  <Sparkline
                    data={quote?.spark ?? []}
                    width={vw(40)}
                    height={vw(16)}
                    color={color}
                    strokeWidth={2}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const IndexCard: React.FC<{
  label: string;
  quote?: Quote;
  onPress: () => void;
}> = ({label, quote, onPress}) => {
  const color = changeColor(quote?.change ?? 0);
  return (
    <TouchableOpacity style={styles.stockContainer1} onPress={onPress}>
      <View style={styles.row}>
        <StockLogo symbol={label} />
        <View style={styles.column}>
          <Text style={styles.nameText}>{label}</Text>
          <Text style={styles.shortNameText}>
            {quote
              ? quote.price.toLocaleString('en-US', {maximumFractionDigits: 2})
              : '—'}
          </Text>
        </View>
        <Text style={[styles.valueText, {color}]}>
          {quote ? formatPercent(quote.changePercent) : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const InforView: React.FC<{quotes: Record<string, Quote | undefined>}> = ({
  quotes,
}) => {
  const {t} = useI18n();
  const {data} = useUserData();
  const [isVisible, setIsVisible] = useState(false);
  const summary = summarize(data.portfolio, quotes);
  const intraday = intradayValues(summary.holdings, summary.cash);

  return (
    <View style={styles.inforContainer}>
      <View style={{rowGap: vh(1)}}>
        <Text style={styles.inforLabel}>{t('home.portfolioTotal')}</Text>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Text testID="home-total" style={styles.inforTxT}>
            {isVisible ? formatMoney(summary.totalValue) : '$*******'}{' '}
          </Text>
          <TouchableOpacity
            testID="home-toggle-total"
            onPress={() => {
              setIsVisible(!isVisible);
            }}>
            {viewIcon(vw(4), vw(4))}
          </TouchableOpacity>
        </View>
        <Text style={{color: changeColor(summary.dayChange), fontSize: 12}}>
          {isVisible
            ? `${formatMoney(summary.dayChange, {
                signed: true,
              })} (${formatPercent(summary.dayChangePercent)}) ${t(
                'common.today',
              )}`
            : `${formatPercent(summary.dayChangePercent)} ${t('common.today')}`}
        </Text>
      </View>
      <Sparkline
        data={intraday}
        width={vw(30)}
        height={vw(12)}
        color={changeColor(summary.dayChange)}
        strokeWidth={2}
      />
    </View>
  );
};

// Today's portfolio value: cash plus each holding's intraday prices.
const intradayValues = (
  holdings: ReturnType<typeof summarize>['holdings'],
  cash: number,
) => {
  const series = holdings.filter(h => (h.quote?.spark.length ?? 0) > 1);
  if (!series.length) {
    return [];
  }
  const length = Math.min(...series.map(h => h.quote!.spark.length));
  return Array.from({length}, (_, i) =>
    series.reduce(
      (total, h) => total + h.quote!.spark[i] * h.position.shares,
      cash,
    ),
  );
};

const Header: React.FC<{onBell: () => void}> = ({onBell}) => {
  const {t} = useI18n();
  return (
    <View style={styles.headerContainer}>
      <View
        style={{columnGap: vw(2), flexDirection: 'row', alignItems: 'center'}}>
        {stocklineIcon(vw(7), vw(7))}
        <Text style={styles.headerTxT}>Stockline</Text>
      </View>
      <TouchableOpacity
        testID="home-alerts"
        accessibilityRole="button"
        accessibilityLabel={t('alerts.title')}
        onPress={onBell}>
        {notiIcon(vw(7), vw(7))}
      </TouchableOpacity>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: container,
  scrollContainer: {flexGrow: 1, paddingHorizontal: vw(5)},
  headerContainer: {
    paddingVertical: vh(2),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTxT: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inforContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inforTxT: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inforLabel: {
    color: '#76787E',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: vh(1),
  },
  stockContainer1: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#FFED4B',
    borderRadius: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  column: {
    flexDirection: 'column',
    marginLeft: 10,
    flexShrink: 1,
  },
  nameText: {
    color: '#FFFFFF',
  },
  shortNameText: {
    color: '#76787E',
  },
  priceText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  valueText: {
    color: '#FFFFFF',
    marginLeft: 10,
  },
  followHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: vh(1),
  },
  followHeaderTxT: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: 10,
    padding: vw(5),
    alignItems: 'center',
  },
  stockContainer: {
    width: vw(80),
    padding: 10,
    backgroundColor: '#2C2C2C',
    borderRadius: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  moversCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: vw(3),
    backgroundColor: '#2C2C2C',
    borderRadius: 10,
    padding: vw(4),
    marginBottom: vh(1),
  },
  moversText: {
    flexShrink: 1,
    rowGap: 2,
  },
  stockViewContainer: {
    paddingVertical: vh(2),
  },
});
