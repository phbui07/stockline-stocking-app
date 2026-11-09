import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useState} from 'react';
import {container, vh, vw} from '../../services/styleSheet';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  addIcon,
  arrowDownIcon,
  arrowUpIcon,
  viewIcon,
} from '../../assets/svgXML';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuotes} from '../../services/quoteStore';
import {useUserData} from '../../services/userData';
import {Holding, summarize} from '../../services/portfolio';
import {TKey, useI18n} from '../../services/i18n';
import {
  changeColor,
  formatMoney,
  formatPercent,
  formatShares,
} from '../../services/format';
import StockLogo from '../../components/StockLogo';

type Filter = 'all' | 'gainers' | 'losers';
type Nav = NativeStackNavigationProp<any>;

const FILTERS: {key: Filter; label: TKey}[] = [
  {key: 'all', label: 'holdings.all'},
  {key: 'gainers', label: 'holdings.gainers'},
  {key: 'losers', label: 'holdings.losers'},
];

const Stock = () => {
  const navigation = useNavigation<Nav>();
  const {t} = useI18n();
  const {data} = useUserData();
  const {quotes, refresh} = useQuotes(Object.keys(data.portfolio.positions));
  const summary = summarize(data.portfolio, quotes);
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const query = searchText.trim().toLowerCase();
  const filtered = summary.holdings.filter(holding => {
    const {symbol, name} = holding.position;
    const matches =
      !query ||
      symbol.toLowerCase().includes(query) ||
      name.toLowerCase().includes(query);
    if (selectedFilter === 'gainers') {
      return matches && holding.pnl > 0;
    }
    if (selectedFilter === 'losers') {
      return matches && holding.pnl < 0;
    }
    return matches;
  });

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
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>{t('holdings.title')}</Text>
          <TouchableOpacity
            testID="holdings-add"
            accessibilityRole="button"
            accessibilityLabel={t('search.titleView')}
            style={styles.addButton}
            onPress={() => navigation.navigate('Search', {mode: 'buy'})}>
            {addIcon(vw(6), vw(6), '#1A1A1A')}
          </TouchableOpacity>
        </View>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>{t('holdings.totalValue')}</Text>
          <Text testID="holdings-value" style={styles.summaryValue}>
            {formatMoney(summary.holdingsValue)}
          </Text>
          <View style={styles.gainLossContainer}>
            <View
              style={[
                styles.changeIndicator,
                {backgroundColor: changeColor(summary.unrealizedPnL)},
              ]}>
              {summary.unrealizedPnL >= 0
                ? arrowUpIcon(vw(4), vw(4), '#FFFFFF')
                : arrowDownIcon(vw(4), vw(4), '#FFFFFF')}
            </View>
            <Text
              style={[
                styles.gainLossText,
                {color: changeColor(summary.unrealizedPnL)},
              ]}>
              {formatMoney(summary.unrealizedPnL, {signed: true})} (
              {formatPercent(summary.unrealizedPercent)})
            </Text>
          </View>
          <Text style={styles.cashText}>
            {t('holdings.cashAvailable', {amount: formatMoney(summary.cash)})}
          </Text>
        </View>
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchBox}>
            {viewIcon(vw(5), vw(5))}
            <TextInput
              style={styles.searchInput}
              placeholder={t('holdings.search')}
              placeholderTextColor="#76787E"
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.filterContainer}>
            {FILTERS.map(filter => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterButton,
                  selectedFilter === filter.key && styles.activeFilter,
                ]}
                onPress={() => setSelectedFilter(filter.key)}>
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === filter.key && styles.activeFilterText,
                  ]}>
                  {t(filter.label)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.stocksListContainer}>
          <Text style={styles.sectionTitle}>
            {t('holdings.count', {count: filtered.length})}
          </Text>
          {summary.holdings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('holdings.empty')}</Text>
              <Text style={styles.emptySubText}>{t('holdings.emptyDesc')}</Text>
              <TouchableOpacity
                style={styles.cta}
                onPress={() => navigation.navigate('Search', {mode: 'buy'})}>
                <Text style={styles.ctaText}>{t('portfolio.findStocks')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered.map(holding => (
              <StockCard
                key={holding.position.symbol}
                holding={holding}
                onPress={() =>
                  navigation.navigate('ChartInfor', {
                    symbol: holding.position.symbol,
                  })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const StockCard: React.FC<{holding: Holding; onPress: () => void}> = ({
  holding,
  onPress,
}) => {
  const {t} = useI18n();
  const {position} = holding;
  const color = changeColor(holding.pnl);
  return (
    <TouchableOpacity
      testID={`holding-${position.symbol}`}
      style={styles.stockCard}
      onPress={onPress}>
      <View style={styles.stockCardLeft}>
        <StockLogo symbol={position.symbol} size={vw(12)} />
        <View style={styles.stockInfo}>
          <Text style={styles.stockName}>{position.symbol}</Text>
          <Text style={styles.stockFullName} numberOfLines={1}>
            {position.name}
          </Text>
          <Text style={styles.stockQuantity}>
            {t('common.shares', {count: formatShares(position.shares)})} ·{' '}
            {t('holdings.avgCost', {price: formatMoney(position.avgCost)})}
          </Text>
        </View>
      </View>
      <View style={styles.stockCardRight}>
        <Text style={styles.stockValue}>{formatMoney(holding.value)}</Text>
        <Text style={styles.stockPrice}>{formatMoney(holding.price)}</Text>
        <Text style={[styles.stockChange, {color}]}>
          {formatMoney(holding.pnl, {signed: true})} (
          {formatPercent(holding.pnlPercent)})
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default Stock;

const styles = StyleSheet.create({
  container: container,
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: vw(5),
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: vh(2),
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#FFED4B',
    borderRadius: vw(6),
    padding: vw(2),
  },
  summaryContainer: {
    backgroundColor: '#2C2C2C',
    borderRadius: vw(3),
    padding: vw(4),
    marginVertical: vh(1),
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#76787E',
    fontSize: 14,
    marginBottom: vh(1),
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
    marginBottom: vh(1),
  },
  gainLossContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: vw(2),
  },
  changeIndicator: {
    borderRadius: vw(3),
    padding: vw(1),
  },
  gainLossText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cashText: {
    color: '#76787E',
    fontSize: 12,
    marginTop: vh(1),
  },
  searchFilterContainer: {
    marginVertical: vh(2),
    rowGap: vh(1),
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    borderRadius: vw(3),
    paddingHorizontal: vw(4),
    paddingVertical: vh(1.5),
    columnGap: vw(2),
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    columnGap: vw(2),
  },
  filterButton: {
    backgroundColor: '#2C2C2C',
    borderRadius: vw(5),
    paddingHorizontal: vw(4),
    paddingVertical: vh(1),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeFilter: {
    backgroundColor: '#FFED4B',
    borderColor: '#FFED4B',
  },
  filterText: {
    color: '#76787E',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#1A1A1A',
  },
  stocksListContainer: {
    marginVertical: vh(2),
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: vh(2),
  },
  emptyContainer: {
    backgroundColor: '#2C2C2C',
    borderRadius: vw(3),
    padding: vw(6),
    alignItems: 'center',
    rowGap: vh(1),
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubText: {
    color: '#76787E',
    fontSize: 14,
    textAlign: 'center',
  },
  cta: {
    backgroundColor: '#FFED4B',
    borderRadius: 16,
    paddingVertical: vh(1.5),
    paddingHorizontal: vw(8),
    marginTop: vh(1),
  },
  ctaText: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  stockCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: vw(3),
    padding: vw(4),
    marginBottom: vh(1.5),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    columnGap: vw(3),
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stockFullName: {
    color: '#76787E',
    fontSize: 12,
  },
  stockQuantity: {
    color: '#76787E',
    fontSize: 11,
    marginTop: vh(0.5),
  },
  stockCardRight: {
    alignItems: 'flex-end',
  },
  stockValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stockPrice: {
    color: '#76787E',
    fontSize: 14,
  },
  stockChange: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: vh(0.5),
  },
});
