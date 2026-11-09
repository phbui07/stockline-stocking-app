/* eslint-disable react-native/no-inline-styles */
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useEffect, useState} from 'react';
import {container, vh, vw} from '../../services/styleSheet';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LineChart} from 'react-native-gifted-charts';
import {arrowUpIcon, arrowDownIcon} from '../../assets/svgXML';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useUserData} from '../../services/userData';
import {
  realizedPnLSeries,
  tradingStats,
  Transaction,
} from '../../services/portfolio';
import {useI18n} from '../../services/i18n';
import {
  changeColor,
  formatDateTime,
  formatMoney,
  formatPercent,
  formatShares,
} from '../../services/format';
import StockLogo from '../../components/StockLogo';

type Tab = 'overview' | 'history';
type Nav = NativeStackNavigationProp<any>;

const Trade = () => {
  const route = useRoute();
  const requestedTab = (route.params as {tab?: Tab} | undefined)?.tab;
  const [activeTab, setActiveTab] = useState<Tab>(requestedTab ?? 'overview');
  const {data} = useUserData();

  // Profile > Transactions opens this tab on the history view.
  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Header
          hasHoldings={Object.keys(data.portfolio.positions).length > 0}
        />
        <TabSelector activeTab={activeTab} setActiveTab={setActiveTab} />
        {activeTab === 'overview' ? (
          <OverviewContent />
        ) : (
          <HistoryContent transactions={data.portfolio.transactions} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Header: React.FC<{hasHoldings: boolean}> = ({hasHoldings}) => {
  const navigation = useNavigation<Nav>();
  const {t} = useI18n();
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.headerText}>{t('trade.title')}</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity
          testID="trade-buy"
          style={styles.actionButton}
          onPress={() => navigation.navigate('Search', {mode: 'buy'})}>
          <Text style={styles.actionButtonText}>{t('trade.buy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="trade-sell"
          style={[styles.actionButton, styles.sellButton]}
          onPress={() =>
            hasHoldings
              ? navigation.navigate('Search', {mode: 'sell'})
              : Alert.alert(t('trade.sell'), t('trade.noHoldingsToSell'))
          }>
          <Text style={[styles.actionButtonText, {color: '#FFFFFF'}]}>
            {t('trade.sell')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const TabSelector: React.FC<{
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}> = ({activeTab, setActiveTab}) => {
  const {t} = useI18n();
  return (
    <View style={styles.tabContainer}>
      {(['overview', 'history'] as Tab[]).map(tab => (
        <TouchableOpacity
          key={tab}
          testID={`trade-tab-${tab}`}
          style={[styles.tab, activeTab === tab && styles.activeTab]}
          onPress={() => setActiveTab(tab)}>
          <Text
            style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {t(tab === 'overview' ? 'trade.overview' : 'trade.history')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const OverviewContent: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {t} = useI18n();
  const {data} = useUserData();
  const stats = tradingStats(data.portfolio.transactions);
  const isProfit = stats.realizedPnL >= 0;
  const activeAlerts = data.alerts.filter(alert => !alert.triggeredAt).length;

  const actions = [
    {
      title: t('trade.cash'),
      subtitle: formatMoney(data.portfolio.cash),
      icon: '💵',
      color: '#FFB800',
      onPress: () => navigation.navigate('Main', {screen: 'Stock'}),
    },
    {
      title: t('trade.watchlist'),
      subtitle: t('trade.watchlistCount', {count: data.watchlist.length}),
      icon: '⭐',
      color: '#5DC172',
      onPress: () => navigation.navigate('Watchlist'),
    },
    {
      title: t('trade.alerts'),
      subtitle: t('trade.alertsCount', {count: activeAlerts}),
      icon: '🔔',
      color: '#FF6B6B',
      onPress: () => navigation.navigate('Alerts'),
    },
  ];

  return (
    <View>
      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>{t('trade.stats')}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text testID="trade-total-trades" style={styles.statValue}>
              {stats.totalTrades}
            </Text>
            <Text style={styles.statLabel}>{t('trade.totalTrades')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatPercent(stats.winRate, false)}
            </Text>
            <Text style={styles.statLabel}>{t('trade.winRate')}</Text>
          </View>
        </View>
        <View style={styles.profitLossContainer}>
          <View
            style={[
              styles.profitLossIndicator,
              {backgroundColor: changeColor(stats.realizedPnL)},
            ]}>
            {isProfit
              ? arrowUpIcon(vw(4), vw(4), '#FFFFFF')
              : arrowDownIcon(vw(4), vw(4), '#FFFFFF')}
          </View>
          <View>
            <Text style={styles.profitLossLabel}>{t('trade.realizedPnL')}</Text>
            <Text
              style={[
                styles.profitLossValue,
                {color: changeColor(stats.realizedPnL)},
              ]}>
              {formatMoney(stats.realizedPnL, {signed: true})}
            </Text>
          </View>
        </View>
      </View>
      <ProfitLossChart transactions={data.portfolio.transactions} />
      <View style={styles.quickActionsCard}>
        <Text style={styles.cardTitle}>{t('trade.quickActions')}</Text>
        <View style={styles.actionsGrid}>
          {actions.map(action => (
            <TouchableOpacity
              key={action.title}
              style={styles.actionItem}
              onPress={action.onPress}>
              <View
                style={[styles.actionIcon, {backgroundColor: action.color}]}>
                <Text style={styles.actionIconText}>{action.icon}</Text>
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const ProfitLossChart: React.FC<{transactions: Transaction[]}> = ({
  transactions,
}) => {
  const {t} = useI18n();
  const series = realizedPnLSeries(transactions);
  const values = series.map(point => point.value);
  // gifted-charts needs room below zero when the P&L is negative.
  const lowest = Math.min(0, ...values);
  const highest = Math.max(1, ...values);
  return (
    <View style={styles.chartCard}>
      <Text style={styles.cardTitle}>{t('trade.pnlChart')}</Text>
      <View style={styles.chartContainer}>
        <LineChart
          data={series.map(point => ({value: point.value, label: point.label}))}
          width={Dimensions.get('window').width - vw(26)}
          height={160}
          spacing={(Dimensions.get('window').width - vw(40)) / 6}
          initialSpacing={vw(6)}
          color="#FFED4B"
          thickness={3}
          noOfSections={4}
          maxValue={highest * 1.1}
          mostNegativeValue={lowest < 0 ? lowest * 1.1 : undefined}
          noOfSectionsBelowXAxis={lowest < 0 ? 2 : 0}
          yAxisColor="#76787E"
          xAxisColor="#76787E"
          yAxisTextStyle={{color: '#76787E', fontSize: 10}}
          xAxisLabelTextStyle={{color: '#76787E', fontSize: 10}}
          formatYLabel={label => `$${Math.round(Number(label))}`}
          dataPointsColor="#FFED4B"
          dataPointsRadius={4}
        />
      </View>
    </View>
  );
};

const HistoryContent: React.FC<{transactions: Transaction[]}> = ({
  transactions,
}) => {
  const {t} = useI18n();
  return (
    <View style={styles.historyContainer}>
      <Text style={styles.sectionTitle}>
        {t('trade.historyTitle', {count: transactions.length})}
      </Text>
      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>{t('trade.noHistory')}</Text>
      ) : (
        transactions.map(transaction => (
          <TransactionCard key={transaction.id} transaction={transaction} />
        ))
      )}
    </View>
  );
};

const TransactionCard: React.FC<{transaction: Transaction}> = ({
  transaction,
}) => {
  const navigation = useNavigation<Nav>();
  const {t, lang} = useI18n();
  const isBuy = transaction.side === 'BUY';

  return (
    <TouchableOpacity
      testID={`transaction-${transaction.id}`}
      style={styles.transactionCard}
      onPress={() =>
        navigation.navigate('ChartInfor', {symbol: transaction.symbol})
      }>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionLeft}>
          <StockLogo symbol={transaction.symbol} size={vw(10)} />
          <View>
            <Text style={styles.transactionStock}>{transaction.symbol}</Text>
            <Text style={styles.transactionDate}>
              {formatDateTime(transaction.date, lang)}
            </Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <View
            style={[
              styles.typeIndicator,
              {backgroundColor: isBuy ? '#5DC172' : '#FF4444'},
            ]}>
            <Text style={styles.typeText}>
              {t(isBuy ? 'trade.typeBuy' : 'trade.typeSell')}
            </Text>
          </View>
          <View style={[styles.statusIndicator, {backgroundColor: '#5DC172'}]}>
            <Text style={styles.statusText}>{t('trade.completed')}</Text>
          </View>
        </View>
      </View>
      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('trade.quantity')}</Text>
          <Text style={styles.detailValue}>
            {formatShares(transaction.shares)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('trade.price')}</Text>
          <Text style={styles.detailValue}>
            {formatMoney(transaction.price)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('trade.total')}</Text>
          <Text style={styles.detailValue}>
            {formatMoney(transaction.total)}
          </Text>
        </View>
        {transaction.realizedPnL !== undefined ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('trade.pnl')}</Text>
            <Text
              style={[
                styles.detailValue,
                {color: changeColor(transaction.realizedPnL)},
              ]}>
              {formatMoney(transaction.realizedPnL, {signed: true})}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export default Trade;

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
  headerActions: {
    flexDirection: 'row',
    columnGap: vw(2),
  },
  actionButton: {
    backgroundColor: '#FFED4B',
    paddingHorizontal: vw(4),
    paddingVertical: vh(1),
    borderRadius: vw(2),
  },
  sellButton: {
    backgroundColor: '#FF4444',
  },
  actionButtonText: {
    color: '#1A1A1A',
    fontWeight: '600',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2C',
    borderRadius: vw(2),
    marginBottom: vh(2),
    padding: vw(1),
  },
  tab: {
    flex: 1,
    paddingVertical: vh(1.5),
    alignItems: 'center',
    borderRadius: vw(1.5),
  },
  activeTab: {
    backgroundColor: '#FFED4B',
  },
  tabText: {
    color: '#76787E',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1A1A1A',
  },
  statsCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: vw(3),
    padding: vw(4),
    marginBottom: vh(2),
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: vh(2),
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: vh(2),
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  statLabel: {
    color: '#76787E',
    fontSize: 14,
  },
  profitLossContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: vw(3),
  },
  profitLossIndicator: {
    borderRadius: vw(3),
    padding: vw(1.5),
  },
  profitLossLabel: {
    color: '#76787E',
    fontSize: 14,
  },
  profitLossValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: vw(3),
    padding: vw(4),
    marginBottom: vh(2),
  },
  chartContainer: {
    alignItems: 'center',
  },
  quickActionsCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: vw(3),
    padding: vw(4),
    marginBottom: vh(2),
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: vw(12),
    height: vw(12),
    borderRadius: vw(6),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vh(1),
  },
  actionIconText: {
    fontSize: 18,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionSubtitle: {
    color: '#76787E',
    fontSize: 10,
    textAlign: 'center',
  },
  historyContainer: {
    marginVertical: vh(1),
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: vh(2),
  },
  emptyText: {
    color: '#76787E',
    textAlign: 'center',
    paddingVertical: vh(4),
  },
  transactionCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: vw(3),
    padding: vw(4),
    marginBottom: vh(1.5),
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vh(1.5),
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: vw(3),
  },
  transactionStock: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  transactionDate: {
    color: '#76787E',
    fontSize: 12,
  },
  transactionRight: {
    alignItems: 'flex-end',
    rowGap: vh(0.5),
  },
  typeIndicator: {
    paddingHorizontal: vw(2),
    paddingVertical: vh(0.5),
    borderRadius: vw(1),
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  statusIndicator: {
    paddingHorizontal: vw(2),
    paddingVertical: vh(0.5),
    borderRadius: vw(1),
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  transactionDetails: {
    borderTopWidth: 1,
    borderTopColor: '#404040',
    paddingTop: vh(1.5),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: vh(0.5),
  },
  detailLabel: {
    color: '#76787E',
    fontSize: 14,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
