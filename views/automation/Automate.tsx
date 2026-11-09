import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {container, vh, vw} from '../../services/styleSheet';
import {useAutomation} from '../../services/automation';
import {useI18n} from '../../services/i18n';
import {
  formatDateTime,
  formatMarketDate,
  formatMoney,
} from '../../services/format';
import {describeSchedule} from '../../services/reasons';
import type {RecurringRule} from '../../services/engine/recurring';
import ScreenHeader from '../../components/ScreenHeader';
import SimulatedBanner from '../../components/SimulatedBanner';
import StockLogo from '../../components/StockLogo';

// The hub for everything automated. Later phases add their sections here.
const Automate = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const {t, lang} = useI18n();
  const {data, running, runNow} = useAutomation();
  const {lastRun} = data;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('automate.title')} />
      <ScrollView contentContainerStyle={styles.content}>
        <SimulatedBanner detail={t('automate.intro')} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('recurring.title')}</Text>
          <TouchableOpacity
            testID="recurring-add"
            style={styles.addBtn}
            onPress={() => navigation.navigate('Search', {mode: 'recurring'})}>
            <Text style={styles.addText}>+ {t('recurring.add')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.explain}>{t('recurring.explain')}</Text>
        {data.recurring.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.grey}>{t('recurring.empty')}</Text>
          </View>
        ) : (
          data.recurring.map(rule => (
            <RecurringCard
              key={rule.id}
              rule={rule}
              onPress={() =>
                navigation.navigate('RecurringDetail', {id: rule.id})
              }
            />
          ))
        )}

        <View style={styles.statusCard}>
          <Text testID="automate-status" style={styles.grey}>
            {running
              ? t('automate.checking')
              : lastRun
              ? t('automate.lastRun', {
                  time: formatDateTime(lastRun.at, lang),
                  date: formatMarketDate(lastRun.through, lang),
                })
              : t('automate.neverRun')}
          </Text>
          {!running && lastRun?.failed.length ? (
            <Text style={styles.warning}>
              {t('automate.failed', {symbols: lastRun.failed.join(', ')})}
            </Text>
          ) : null}
          <TouchableOpacity
            testID="automate-run"
            disabled={running}
            onPress={runNow}>
            <Text style={[styles.link, running && styles.disabled]}>
              {t('automate.runNow')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const RecurringCard: React.FC<{rule: RecurringRule; onPress: () => void}> = ({
  rule,
  onPress,
}) => {
  const {t, lang} = useI18n();
  return (
    <TouchableOpacity
      testID={`recurring-${rule.symbol}`}
      style={styles.card}
      onPress={onPress}>
      <StockLogo symbol={rule.symbol} size={vw(10)} />
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>
          {rule.symbol} · {formatMoney(rule.amount)}
        </Text>
        <Text style={styles.grey}>{describeSchedule(rule, t)}</Text>
      </View>
      <Text style={[styles.status, rule.paused && styles.statusPaused]}>
        {rule.paused
          ? t('recurring.paused')
          : t('recurring.next', {
              date: formatMarketDate(rule.nextDate, lang, {year: false}),
            })}
      </Text>
    </TouchableOpacity>
  );
};

export default Automate;

const styles = StyleSheet.create({
  container: container,
  content: {
    paddingHorizontal: vw(5),
    paddingBottom: vh(4),
    rowGap: vh(1.5),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: vh(1),
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  addBtn: {
    backgroundColor: '#FFED4B',
    borderRadius: 16,
    paddingHorizontal: vw(4),
    paddingVertical: 6,
  },
  addText: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  explain: {
    color: '#B0B0B0',
    fontSize: 13,
    lineHeight: 19,
  },
  emptyCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: vw(4),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: vw(3),
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: vw(4),
  },
  cardText: {
    flex: 1,
    rowGap: 2,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  status: {
    color: '#5DC172',
    fontSize: 12,
    fontWeight: '600',
  },
  statusPaused: {
    color: '#76787E',
  },
  statusCard: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#3A3A3A',
    paddingTop: vh(1.5),
    marginTop: vh(1),
    rowGap: 6,
  },
  grey: {
    color: '#76787E',
    fontSize: 13,
  },
  warning: {
    color: '#FFB020',
    fontSize: 13,
  },
  link: {
    color: '#FFED4B',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
});
