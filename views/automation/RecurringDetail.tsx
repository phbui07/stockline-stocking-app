import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {centerAll, container, vh, vw} from '../../services/styleSheet';
import {useAutomation} from '../../services/automation';
import {useUserData} from '../../services/userData';
import {useQuote} from '../../services/quoteStore';
import {useI18n} from '../../services/i18n';
import {
  changeColor,
  formatMarketDate,
  formatMoney,
  formatPercent,
  formatShares,
} from '../../services/format';
import {toMarketDate} from '../../services/engine/dates';
import {describeReason, describeSchedule} from '../../services/reasons';
import ScreenHeader from '../../components/ScreenHeader';
import SimulatedBanner from '../../components/SimulatedBanner';
import StockLogo from '../../components/StockLogo';

const RecurringDetail = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const {id} = useRoute().params as {id: string};
  const {t, lang} = useI18n();
  const {data, setRecurringPaused, removeRecurring} = useAutomation();
  const {data: userData} = useUserData();
  const rule = data.recurring.find(item => item.id === id);
  const {quote} = useQuote(rule?.symbol ?? '');

  if (!rule) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('recurring.title')} />
        <Text style={[styles.grey, styles.content]}>
          {t('recurring.notFound')}
        </Text>
      </SafeAreaView>
    );
  }

  // What this rule bought, from the portfolio's trade history.
  const purchases = userData.portfolio.transactions.filter(
    trade => trade.automationId === id && trade.side === 'BUY',
  );
  const invested = purchases.reduce((sum, trade) => sum + trade.total, 0);
  const shares = purchases.reduce((sum, trade) => sum + trade.shares, 0);
  const worth = quote ? shares * quote.price : undefined;

  // Purchases and skipped purchases together, newest first.
  const history = [
    ...purchases.map(trade => ({
      key: trade.id,
      date: toMarketDate(trade.date),
      text: t('recurring.bought', {
        shares: formatShares(trade.shares),
        price: formatMoney(trade.price),
      }),
      skipped: false,
    })),
    ...data.events
      .filter(event => event.automationId === id)
      .map(event => ({
        key: event.id,
        date: event.date,
        text: describeReason(event.reason, t),
        skipped: true,
      })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const confirmDelete = () =>
    Alert.alert(t('recurring.deleteTitle'), t('recurring.deleteMessage'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          removeRecurring(id);
          navigation.goBack();
        },
      },
    ]);

  const stats: [string, string, string?][] = [
    [t('recurring.purchases'), String(purchases.length)],
    [t('recurring.invested'), formatMoney(invested)],
    [t('recurring.sharesBought'), formatShares(shares)],
    [t('recurring.avgPrice'), shares ? formatMoney(invested / shares) : '—'],
  ];
  if (worth !== undefined && shares) {
    stats.push([
      t('recurring.worthToday'),
      `${formatMoney(worth)} (${formatPercent(
        ((worth - invested) / invested) * 100,
      )})`,
      changeColor(worth - invested),
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('recurring.title')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <StockLogo symbol={rule.symbol} size={vw(11)} />
            <View style={styles.flex}>
              <Text style={styles.title}>
                {rule.symbol} · {formatMoney(rule.amount)}
              </Text>
              <Text style={styles.grey}>{describeSchedule(rule, t)}</Text>
            </View>
            <Text
              testID="recurring-status"
              style={[styles.status, rule.paused && styles.statusPaused]}>
              {t(rule.paused ? 'recurring.paused' : 'recurring.active')}
            </Text>
          </View>
          <Text testID="recurring-next" style={styles.next}>
            {rule.paused
              ? t('recurring.pausedNote')
              : t('recurring.firstBuy', {
                  date: formatMarketDate(rule.nextDate, lang, {weekday: true}),
                })}
          </Text>
        </View>

        <View style={styles.actions}>
          <ActionButton
            testID="recurring-toggle"
            label={t(rule.paused ? 'recurring.resume' : 'recurring.pause')}
            onPress={() => setRecurringPaused(id, !rule.paused)}
          />
          <ActionButton
            testID="recurring-edit"
            label={t('recurring.edit')}
            onPress={() => navigation.navigate('RecurringEdit', {id})}
          />
          <ActionButton
            testID="recurring-delete"
            label={t('common.delete')}
            danger
            onPress={confirmDelete}
          />
        </View>

        <View style={styles.card}>
          {stats.map(([label, value, color]) => (
            <View key={label} style={styles.statRow}>
              <Text style={styles.grey}>{label}</Text>
              <Text style={[styles.value, color ? {color} : null]}>
                {value}
              </Text>
            </View>
          ))}
          <Text style={styles.note}>{t('recurring.statsNote')}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('recurring.history')}</Text>
        {history.length === 0 ? (
          <Text style={styles.grey}>
            {t('recurring.noHistory', {
              date: formatMarketDate(rule.nextDate, lang),
            })}
          </Text>
        ) : (
          history.map(item => (
            <View
              key={item.key}
              testID="recurring-history-row"
              style={styles.historyRow}>
              <Text style={styles.historyDate}>
                {formatMarketDate(item.date, lang)}
              </Text>
              <Text
                style={[styles.historyText, item.skipped && styles.skipped]}>
                {item.text}
              </Text>
            </View>
          ))
        )}

        <SimulatedBanner />
      </ScrollView>
    </SafeAreaView>
  );
};

const ActionButton: React.FC<{
  testID: string;
  label: string;
  danger?: boolean;
  onPress: () => void;
}> = ({testID, label, danger, onPress}) => (
  <TouchableOpacity
    testID={testID}
    style={[styles.actionBtn, centerAll, danger && styles.dangerBtn]}
    onPress={onPress}>
    <Text style={[styles.actionText, danger && styles.dangerText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default RecurringDetail;

const styles = StyleSheet.create({
  container: container,
  content: {
    paddingHorizontal: vw(5),
    paddingBottom: vh(4),
    rowGap: vh(1.5),
  },
  flex: {
    flex: 1,
  },
  card: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: vw(4),
    rowGap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: vw(3),
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  status: {
    color: '#5DC172',
    fontWeight: '600',
    fontSize: 12,
  },
  statusPaused: {
    color: '#76787E',
  },
  next: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    columnGap: vw(2),
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#76787E',
    paddingVertical: vh(1.2),
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dangerBtn: {
    borderColor: '#FF4444',
  },
  dangerText: {
    color: '#FF4444',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  value: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  note: {
    color: '#76787E',
    fontSize: 11,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: vh(1),
  },
  historyRow: {
    flexDirection: 'row',
    columnGap: vw(3),
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3A3A3A',
  },
  historyDate: {
    color: '#76787E',
    fontSize: 13,
    width: vw(24),
  },
  historyText: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 1,
  },
  skipped: {
    color: '#FFB020',
  },
  grey: {
    color: '#76787E',
    fontSize: 13,
  },
});
