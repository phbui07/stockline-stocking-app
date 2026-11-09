import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useEffect, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute} from '@react-navigation/native';
import {centerAll, container, vh, vw} from '../../services/styleSheet';
import {useAutomation} from '../../services/automation';
import {useUserData} from '../../services/userData';
import {useDailyHistory} from '../../services/useDailyHistory';
import {TKey, useI18n} from '../../services/i18n';
import {
  cleanDecimalInput,
  formatMarketDate,
  formatMoney,
  formatShares,
} from '../../services/format';
import {nextWeekday, toMarketDate} from '../../services/engine/dates';
import {
  crossesLine,
  firstUnchecked,
  isValidRiskPercent,
  RISK_LIMITS,
  riskLine,
  RiskKind,
  RiskRule,
} from '../../services/engine/risk';
import {RISK_LABELS} from '../../services/reasons';
import ScreenHeader from '../../components/ScreenHeader';
import SimulatedBanner from '../../components/SimulatedBanner';
import StockLogo from '../../components/StockLogo';

const DISPLAY_ORDER: RiskKind[] = ['stopLoss', 'takeProfit', 'trailingStop'];

const EXPLAIN: Record<RiskKind, TKey> = {
  stopLoss: 'risk.stopLossExplain',
  takeProfit: 'risk.takeProfitExplain',
  trailingStop: 'risk.trailingStopExplain',
};

const LINE: Record<RiskKind, TKey> = {
  stopLoss: 'risk.lineStopLoss',
  takeProfit: 'risk.lineTakeProfit',
  trailingStop: 'risk.lineTrailingStop',
};

// Risk rules for one position (route params {symbol}).
const RiskRules = () => {
  const {symbol} = useRoute().params as {symbol: string};
  const {t, lang} = useI18n();
  const {data: userData} = useUserData();
  const {data, setRisk, removeRisk} = useAutomation();
  const position = userData.portfolio.positions[symbol];
  const boughtOn = position
    ? toMarketDate(Math.min(...position.lots.map(lot => lot.date)))
    : undefined;
  // Every close since you bought: the latest one, and the highest one
  // (which is where a trailing stop measures from).
  const {history} = useDailyHistory(symbol, boughtOn);
  const bars = history?.bars ?? [];
  const last = bars[bars.length - 1];
  const highest = bars.length
    ? bars.reduce((top, bar) => (bar.close > top.close ? bar : top))
    : undefined;

  const rules = data.risk.filter(rule => rule.symbol === symbol);
  const active = rules.filter(rule => rule.status === 'active');
  const finished = rules.filter(rule => rule.status !== 'active');

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('risk.title')} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.card}>
          <View style={styles.row}>
            <StockLogo symbol={symbol} size={vw(10)} />
            <Text style={styles.symbol}>{symbol}</Text>
          </View>
          {position ? (
            <>
              <InfoRow
                label={t('detail.positionShares')}
                value={formatShares(position.shares)}
              />
              <InfoRow
                label={t('detail.positionAvg')}
                value={formatMoney(position.avgCost)}
              />
              <InfoRow
                label={t('risk.boughtOn')}
                value={formatMarketDate(boughtOn!, lang)}
              />
              {last ? (
                <InfoRow
                  label={t('risk.lastClose', {
                    date: formatMarketDate(last.date, lang, {year: false}),
                  })}
                  value={formatMoney(last.close)}
                />
              ) : null}
              {highest ? (
                <InfoRow
                  label={t('risk.highestClose', {
                    date: formatMarketDate(highest.date, lang, {year: false}),
                  })}
                  value={formatMoney(highest.close)}
                />
              ) : null}
            </>
          ) : (
            <Text style={styles.grey}>{t('risk.notHeld', {symbol})}</Text>
          )}
        </View>

        <Text style={styles.intro}>{t('risk.intro')}</Text>

        {position
          ? DISPLAY_ORDER.map(kind => (
              <RiskCard
                key={kind}
                kind={kind}
                rule={active.find(rule => rule.kind === kind)}
                avgCost={position.avgCost}
                highest={highest?.close}
                lastClose={last?.close}
                onSave={percent => setRisk(symbol, kind, percent)}
                onRemove={removeRisk}
              />
            ))
          : null}

        {finished.length ? (
          <>
            <Text style={styles.sectionTitle}>{t('risk.history')}</Text>
            {finished.map(rule => (
              <Text key={rule.id} style={styles.grey}>
                {t(
                  rule.status === 'triggered'
                    ? 'risk.triggeredOn'
                    : 'risk.endedOn',
                  {
                    rule: t(RISK_LABELS[rule.kind]),
                    percent: rule.percent,
                    date: formatMarketDate(rule.endedOn ?? '', lang),
                  },
                )}
              </Text>
            ))}
          </>
        ) : null}

        <Text style={styles.note}>{t('risk.gapNote')}</Text>
        <SimulatedBanner />
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow: React.FC<{label: string; value: string}> = ({label, value}) => (
  <View style={styles.infoRow}>
    <Text style={styles.grey}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const RiskCard: React.FC<{
  kind: RiskKind;
  rule?: RiskRule;
  avgCost: number;
  highest?: number;
  lastClose?: number;
  onSave: (percent: number) => void;
  onRemove: (id: string) => void;
}> = ({kind, rule, avgCost, highest, lastClose, onSave, onRemove}) => {
  const {t, lang} = useI18n();
  const saved = rule?.percent;
  const [text, setText] = useState(saved !== undefined ? String(saved) : '');
  // Show the saved percent again after saving or turning the rule off. This
  // depends on the number, not the rule object, because every automation
  // run saves fresh copies of the rules, and that mustn't wipe your typing.
  useEffect(() => {
    setText(saved !== undefined ? String(saved) : '');
  }, [saved]);

  const percent = Number(text);
  const valid = text !== '' && isValidRiskPercent(kind, percent);
  const reference = kind === 'trailingStop' ? highest : avgCost;
  const line =
    valid && reference !== undefined
      ? riskLine(kind, percent, reference)
      : undefined;
  const alreadyPast =
    line !== undefined &&
    lastClose !== undefined &&
    crossesLine(kind, lastClose, line);
  const changed = !rule || rule.percent !== percent;

  return (
    <View testID={`risk-card-${kind}`} style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{t(RISK_LABELS[kind])}</Text>
        <Text
          testID={`risk-status-${kind}`}
          style={[styles.status, !rule && styles.statusOff]}>
          {t(rule ? 'risk.on' : 'risk.off')}
        </Text>
      </View>
      <Text style={styles.grey}>{t(EXPLAIN[kind])}</Text>
      <View style={styles.inputRow}>
        <TextInput
          testID={`risk-percent-${kind}`}
          style={styles.input}
          value={text}
          onChangeText={value => setText(cleanDecimalInput(value, 1))}
          keyboardType="decimal-pad"
          placeholder={t('risk.percentPlaceholder')}
          placeholderTextColor="#76787E"
        />
        <Text style={styles.percentSign}>%</Text>
      </View>
      {text !== '' && !valid ? (
        <Text style={styles.error}>
          {t('risk.invalidPercent', RISK_LIMITS[kind])}
        </Text>
      ) : null}
      {line !== undefined ? (
        <Text testID={`risk-line-${kind}`} style={styles.line}>
          {t(LINE[kind], {
            line: formatMoney(line),
            percent,
            reference: formatMoney(reference!),
          })}
        </Text>
      ) : null}
      {valid && reference === undefined ? (
        <Text style={styles.grey}>{t('risk.noCloseYet')}</Text>
      ) : null}
      {alreadyPast ? (
        <Text style={styles.warning}>
          {t('risk.alreadyPast', {close: formatMoney(lastClose!)})}
        </Text>
      ) : null}
      <View style={styles.buttons}>
        {changed ? (
          <TouchableOpacity
            testID={`risk-save-${kind}`}
            disabled={!valid}
            style={[styles.primaryBtn, centerAll, !valid && styles.disabled]}
            onPress={() => onSave(percent)}>
            <Text style={styles.primaryText}>
              {t(rule ? 'risk.update' : 'risk.turnOn')}
            </Text>
          </TouchableOpacity>
        ) : null}
        {rule ? (
          <TouchableOpacity
            testID={`risk-remove-${kind}`}
            style={[styles.secondaryBtn, centerAll]}
            onPress={() => onRemove(rule.id)}>
            <Text style={styles.secondaryText}>{t('risk.turnOff')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {rule ? (
        <Text style={styles.small}>
          {t('risk.nextCheck', {
            date: formatMarketDate(nextWeekday(firstUnchecked(rule)), lang, {
              weekday: true,
            }),
          })}
        </Text>
      ) : null}
    </View>
  );
};

export default RiskRules;

const styles = StyleSheet.create({
  container: container,
  content: {
    paddingHorizontal: vw(5),
    paddingBottom: vh(4),
    rowGap: vh(1.5),
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
  symbol: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  value: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  intro: {
    color: '#B0B0B0',
    fontSize: 13,
    lineHeight: 19,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  status: {
    color: '#5DC172',
    fontWeight: '600',
    fontSize: 12,
  },
  statusOff: {
    color: '#76787E',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: vw(2),
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#76787E',
    borderRadius: 12,
    height: vw(11),
    color: '#FFFFFF',
    paddingHorizontal: vw(4),
    fontSize: 16,
  },
  percentSign: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  line: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
  },
  buttons: {
    flexDirection: 'row',
    columnGap: vw(2),
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#FFED4B',
    borderRadius: 12,
    paddingVertical: vh(1.2),
  },
  primaryText: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#76787E',
    paddingVertical: vh(1.2),
  },
  secondaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabled: {
    backgroundColor: '#CCCCCC',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: vh(1),
  },
  grey: {
    color: '#76787E',
    fontSize: 13,
    lineHeight: 18,
  },
  small: {
    color: '#76787E',
    fontSize: 12,
  },
  note: {
    color: '#76787E',
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    color: '#FF4444',
    fontSize: 12,
  },
  warning: {
    color: '#FFB020',
    fontSize: 13,
    lineHeight: 18,
  },
});
