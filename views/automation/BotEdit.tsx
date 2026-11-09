import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useMemo, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {centerAll, container, vh, vw} from '../../services/styleSheet';
import {useAutomation} from '../../services/automation';
import {useQuote} from '../../services/quoteStore';
import {useDailyHistory} from '../../services/useDailyHistory';
import {isTradable} from '../../services/marketData';
import {TKey, useI18n} from '../../services/i18n';
import {
  cleanDecimalInput,
  cleanIntegerInput,
  formatMarketDate,
  formatMoney,
  formatPercent,
} from '../../services/format';
import {addDays, lastCompletedMarketDate} from '../../services/engine/dates';
import {
  BotExits,
  BotInput,
  DEFAULT_RISK_PERCENT,
  stopDistance,
  validateBot,
} from '../../services/engine/bots';
import {
  MaCrossSettings,
  maCrossover,
  MaMode,
} from '../../services/engine/strategies/maCrossover';
import {signalHistory} from '../../services/engine/signals';
import {positionBudget} from '../../services/engine/sizing';
import {RiskKind} from '../../services/engine/risk';
import {describeReason, RISK_LABELS} from '../../services/reasons';
import ScreenHeader from '../../components/ScreenHeader';
import SimulatedBanner from '../../components/SimulatedBanner';
import StockLogo from '../../components/StockLogo';
import MultiLineChart, {ChartSeries} from '../../components/MultiLineChart';

const EXIT_KINDS: RiskKind[] = ['stopLoss', 'takeProfit', 'trailingStop'];
const PREVIEW_DAYS = 252; // about a year of trading days
const EXAMPLE_ACCOUNT = 10000;
const LINE_COLORS: Record<string, string> = {
  fast: '#4DA3FF',
  slow: '#FFB020',
  trend: '#B072FF',
};

const ERROR_KEYS: Record<string, TKey> = {
  fastLength: 'bot.errorFast',
  slowLength: 'bot.errorSlow',
  buffer: 'bot.errorBuffer',
  trendLength: 'bot.errorTrend',
  stopLoss: 'bot.errorExit',
  takeProfit: 'bot.errorExit',
  trailingStop: 'bot.errorExit',
  riskPercent: 'bot.errorRisk',
};

const text = (value?: number) => (value === undefined ? '' : String(value));
const optional = (value: string) => (value === '' ? undefined : Number(value));

// Creates a bot (route params {symbol}, coming from Search) or edits one
// ({id}). Bots aren't run yet: this screen sets one up and shows where its
// signals fell over the past year.
const BotEdit = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const params = useRoute().params as {symbol?: string; id?: string};
  const {t, lang} = useI18n();
  const {data, addBot, editBot, removeBot} = useAutomation();
  const existing = data.bots.find(bot => bot.id === params.id);
  const symbol = existing?.symbol ?? params.symbol ?? '';
  const {quote} = useQuote(symbol);
  const start: MaCrossSettings = existing?.settings ?? maCrossover.defaults;

  const [mode, setMode] = useState<MaMode>(start.mode);
  const [fastText, setFastText] = useState(text(start.fastLength));
  const [slowText, setSlowText] = useState(text(start.slowLength));
  const [bufferOn, setBufferOn] = useState(start.bufferPercent > 0);
  const [bufferText, setBufferText] = useState(
    start.bufferPercent > 0 ? text(start.bufferPercent) : '2',
  );
  const [trendFilter, setTrendFilter] = useState(start.trendFilter);
  const [trendText, setTrendText] = useState(text(start.trendLength));
  const [exitTexts, setExitTexts] = useState<Record<RiskKind, string>>({
    stopLoss: text(existing?.exits.stopLoss),
    takeProfit: text(existing?.exits.takeProfit),
    trailingStop: text(existing?.exits.trailingStop),
  });
  const [riskText, setRiskText] = useState(
    text(existing?.riskPercent ?? DEFAULT_RISK_PERCENT),
  );

  const settings: MaCrossSettings = {
    mode,
    fastLength: Number(fastText),
    slowLength: Number(slowText),
    bufferPercent: bufferOn ? Number(bufferText) : 0,
    trendFilter,
    trendLength: Number(trendText),
  };
  const exits: BotExits = {
    stopLoss: optional(exitTexts.stopLoss),
    takeProfit: optional(exitTexts.takeProfit),
    trailingStop: optional(exitTexts.trailingStop),
  };
  const input: BotInput = {
    symbol,
    name: existing?.name ?? quote?.name ?? symbol,
    strategy: 'maCross',
    settings,
    exits,
    riskPercent: Number(riskText),
  };
  const errors = validateBot(input);
  const strategyValid = maCrossover.validate(settings).length === 0;
  const tradable = existing ? true : !!quote && isTradable(quote);

  // About two years of closes: a year to show, plus enough before it for
  // a 200-day average to exist on the first day shown.
  const [from] = useState(() => addDays(lastCompletedMarketDate(), -760));
  const {history, failed} = useDailyHistory(symbol, from);
  const settingsKey = JSON.stringify(settings);
  const preview = useMemo(() => {
    const bars = (history?.bars ?? []).map(({date, close}) => ({date, close}));
    if (!strategyValid || bars.length < 2) {
      return null;
    }
    const closes = bars.map(bar => bar.close);
    const lines = maCrossover.indicators(closes, settings);
    const signals = signalHistory(maCrossover, settings, bars);
    const first = Math.max(0, bars.length - PREVIEW_DAYS);
    const last = bars.length - 1;
    return {
      bars,
      first,
      lines,
      shown: signals.filter(signal => signal.index >= first),
      lastValue: (key: string) =>
        lines.find(line => line.key === key)?.values[last],
    };
    // settingsKey stands in for `settings`, which is a new object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, settingsKey, strategyValid]);

  const save = () => {
    if (errors.length || !tradable) {
      return;
    }
    if (existing) {
      editBot(existing.id, input);
    } else {
      addBot(input);
    }
    navigation.goBack();
  };

  const confirmDelete = () =>
    Alert.alert(t('bot.deleteTitle'), t('bot.deleteMessage'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          removeBot(existing!.id);
          navigation.goBack();
        },
      },
    ]);

  const stop = stopDistance(exits);
  const budget = positionBudget({
    equity: EXAMPLE_ACCOUNT,
    cash: EXAMPLE_ACCOUNT,
    riskPercent: Number(riskText) || 0,
    stopPercent: stop,
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t(existing ? 'bot.editTitle' : 'bot.newTitle')} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.card}>
          <View style={styles.row}>
            <StockLogo symbol={symbol} size={vw(10)} />
            <View style={styles.flex}>
              <Text style={styles.title}>{symbol}</Text>
              <Text style={styles.grey} numberOfLines={1}>
                {input.name}
              </Text>
            </View>
          </View>
          {!existing && quote && !tradable ? (
            <Text style={styles.error}>{t('detail.notTradable')}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>{t('bot.strategy')}</Text>
        <Text style={styles.explain}>{t('bot.maExplain')}</Text>
        <View style={styles.chips}>
          {(['cross', 'price'] as MaMode[]).map(item => (
            <Chip
              key={item}
              testID={`bot-mode-${item}`}
              label={t(item === 'cross' ? 'bot.modeCross' : 'bot.modePrice')}
              selected={mode === item}
              onPress={() => setMode(item)}
            />
          ))}
        </View>
        <View style={styles.inputRow}>
          {mode === 'cross' ? (
            <NumberField
              testID="bot-fast"
              label={t('bot.fastLength')}
              value={fastText}
              onChange={value => setFastText(cleanIntegerInput(value))}
            />
          ) : null}
          <NumberField
            testID="bot-slow"
            label={t(mode === 'cross' ? 'bot.slowLength' : 'bot.priceLength')}
            value={slowText}
            onChange={value => setSlowText(cleanIntegerInput(value))}
          />
        </View>

        <ToggleRow
          testID="bot-buffer"
          label={t('bot.buffer')}
          hint={t('bot.bufferHint')}
          value={bufferOn}
          onChange={setBufferOn}
        />
        {bufferOn ? (
          <NumberField
            testID="bot-buffer-percent"
            label={t('bot.bufferPercent')}
            value={bufferText}
            onChange={value => setBufferText(cleanDecimalInput(value, 1))}
            decimal
          />
        ) : null}
        <ToggleRow
          testID="bot-trend"
          label={t('bot.trendFilter')}
          hint={t('bot.trendHint')}
          value={trendFilter}
          onChange={setTrendFilter}
        />
        {trendFilter ? (
          <NumberField
            testID="bot-trend-length"
            label={t('bot.trendLength')}
            value={trendText}
            onChange={value => setTrendText(cleanIntegerInput(value))}
          />
        ) : null}

        <Text style={styles.sectionTitle}>{t('bot.exits')}</Text>
        <Text style={styles.explain}>{t('bot.exitsExplain')}</Text>
        <View style={styles.inputRow}>
          {EXIT_KINDS.map(kind => (
            <NumberField
              key={kind}
              testID={`bot-exit-${kind}`}
              label={`${t(RISK_LABELS[kind])} %`}
              value={exitTexts[kind]}
              placeholder={t('bot.off')}
              onChange={value =>
                setExitTexts(current => ({
                  ...current,
                  [kind]: cleanDecimalInput(value, 1),
                }))
              }
              decimal
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('bot.sizing')}</Text>
        <NumberField
          testID="bot-risk"
          label={t('bot.riskPercent')}
          value={riskText}
          onChange={value => setRiskText(cleanDecimalInput(value, 1))}
          decimal
        />
        <Text testID="bot-sizing-example" style={styles.explain}>
          {t('bot.sizingExample', {
            account: formatMoney(EXAMPLE_ACCOUNT),
            invest: formatMoney(budget),
          })}{' '}
          {stop !== undefined
            ? t('bot.sizingStop', {
                stop,
                loss: formatMoney((budget * stop) / 100),
              })
            : t('bot.sizingNoStop')}
        </Text>

        {errors.map(error => (
          <Text key={error} style={styles.error}>
            {t(ERROR_KEYS[error] ?? 'common.error')}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>{t('bot.preview')}</Text>
        {preview ? (
          <PreviewChart preview={preview} />
        ) : (
          <Text style={styles.grey}>
            {t(failed ? 'common.dataError' : 'common.loading')}
          </Text>
        )}
        {preview ? (
          <Text testID="bot-signal-count" style={styles.explain}>
            {t('bot.signalCount', {
              buys: preview.shown.filter(s => s.action === 'BUY').length,
              sells: preview.shown.filter(s => s.action === 'SELL').length,
            })}
          </Text>
        ) : null}
        {preview ? <LatestState preview={preview} settings={settings} /> : null}
        <Text style={styles.note}>{t('bot.previewNote')}</Text>
        {preview?.shown.length ? (
          <Text style={styles.note}>
            {t('bot.lastSignal', {
              date: formatMarketDate(
                preview.shown[preview.shown.length - 1].date,
                lang,
              ),
              reason: describeReason(
                preview.shown[preview.shown.length - 1].reason,
                t,
              ),
            })}
          </Text>
        ) : null}

        <SimulatedBanner detail={t('bot.notLive')} />

        <TouchableOpacity
          testID="bot-save"
          disabled={errors.length > 0 || !tradable}
          style={[
            styles.saveBtn,
            centerAll,
            (errors.length > 0 || !tradable) && styles.saveDisabled,
          ]}
          onPress={save}>
          <Text style={styles.saveText}>{t('common.save')}</Text>
        </TouchableOpacity>
        {existing ? (
          <TouchableOpacity
            testID="bot-delete"
            style={[styles.deleteBtn, centerAll]}
            onPress={confirmDelete}>
            <Text style={styles.deleteText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

type Preview = {
  bars: {date: string; close: number}[];
  first: number;
  lines: ReturnType<typeof maCrossover.indicators>;
  shown: ReturnType<typeof signalHistory>;
  lastValue: (key: string) => number | undefined;
};

// The last year of prices with the averages and past signals.
const PreviewChart: React.FC<{preview: Preview}> = ({preview}) => {
  const {t, lang} = useI18n();
  const {bars, first, lines, shown} = preview;
  const visible = <T,>(values: T[]) => values.slice(first);
  const series: ChartSeries[] = [
    {
      key: 'price',
      values: visible(bars.map(bar => bar.close)),
      color: '#FFFFFF',
      width: 1.2,
    },
    ...lines.map(line => ({
      key: line.key,
      values: visible(line.values),
      color: LINE_COLORS[line.key] ?? '#B0B0B0',
      width: 1.8,
      dashed: line.key === 'trend',
    })),
  ];
  return (
    <View testID="bot-preview" style={styles.chartCard}>
      <MultiLineChart
        series={series}
        markers={shown.map(signal => ({
          index: signal.index - first,
          kind: signal.action === 'BUY' ? 'buy' : 'sell',
        }))}
        width={vw(90) - vw(6)}
        height={vw(50)}
        formatValue={value => formatMoney(value)}
        startLabel={formatMarketDate(bars[first].date, lang)}
        endLabel={formatMarketDate(bars[bars.length - 1].date, lang)}
        accessibilityLabel={t('bot.chartLabel')}
      />
      <View style={styles.legend}>
        <LegendItem color="#FFFFFF" label={t('bot.legendPrice')} />
        {lines.map(line => (
          <LegendItem
            key={line.key}
            color={LINE_COLORS[line.key] ?? '#B0B0B0'}
            label={describeReason(line.label, t)}
          />
        ))}
        <LegendItem color="#5DC172" label={t('bot.legendBuy')} />
        <LegendItem color="#FF4444" label={t('bot.legendSell')} />
      </View>
    </View>
  );
};

// Facts about the latest close, worded as a description of the rule's
// inputs rather than an instruction.
const LatestState: React.FC<{preview: Preview; settings: MaCrossSettings}> = ({
  preview,
  settings,
}) => {
  const {t, lang} = useI18n();
  const last = preview.bars[preview.bars.length - 1];
  const slow = preview.lastValue('slow');
  const fast =
    settings.mode === 'price' ? last.close : preview.lastValue('fast');
  const trend = preview.lastValue('trend');
  if (slow === undefined || fast === undefined) {
    return null;
  }
  const date = formatMarketDate(last.date, lang);
  const move = formatPercent((fast / slow - 1) * 100);
  return (
    <Text testID="bot-latest" style={styles.explain}>
      {settings.mode === 'price'
        ? t('bot.statePrice', {
            date,
            close: formatMoney(last.close),
            move,
            slow: settings.slowLength,
          })
        : t('bot.stateCross', {
            date,
            move,
            fast: settings.fastLength,
            slow: settings.slowLength,
          })}
      {trend !== undefined
        ? ` ${t('bot.stateTrend', {
            move: formatPercent((last.close / trend - 1) * 100),
            trend: settings.trendLength,
          })}`
        : ''}
    </Text>
  );
};

const LegendItem: React.FC<{color: string; label: string}> = ({
  color,
  label,
}) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, {backgroundColor: color}]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const NumberField: React.FC<{
  testID: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  decimal?: boolean;
}> = ({testID, label, value, onChange, placeholder, decimal}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      testID={testID}
      style={styles.input}
      value={value}
      onChangeText={onChange}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      placeholder={placeholder}
      placeholderTextColor="#76787E"
    />
  </View>
);

const ToggleRow: React.FC<{
  testID: string;
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}> = ({testID, label, hint, value, onChange}) => (
  <View style={styles.toggleRow}>
    <View style={styles.flex}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.grey}>{hint}</Text>
    </View>
    <Switch
      testID={testID}
      value={value}
      onValueChange={onChange}
      trackColor={{true: '#FFED4B', false: '#3A3A3A'}}
      thumbColor="#FFFFFF"
    />
  </View>
);

const Chip: React.FC<{
  testID: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}> = ({testID, label, selected, onPress}) => (
  <TouchableOpacity
    testID={testID}
    accessibilityState={{selected}}
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}>
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default BotEdit;

const styles = StyleSheet.create({
  container: container,
  content: {
    paddingHorizontal: vw(5),
    paddingBottom: vh(4),
    rowGap: vh(1.2),
  },
  flex: {
    flex: 1,
  },
  card: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: vw(4),
    rowGap: 6,
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
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginTop: vh(1.5),
  },
  explain: {
    color: '#B0B0B0',
    fontSize: 13,
    lineHeight: 19,
  },
  grey: {
    color: '#76787E',
    fontSize: 12,
    lineHeight: 17,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: vw(2),
  },
  chip: {
    borderRadius: 16,
    paddingHorizontal: vw(4),
    paddingVertical: 8,
    backgroundColor: '#2C2C2C',
  },
  chipSelected: {
    backgroundColor: '#FFED4B',
  },
  chipText: {
    color: '#B0B0B0',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#1A1A1A',
  },
  inputRow: {
    flexDirection: 'row',
    columnGap: vw(3),
  },
  field: {
    flex: 1,
    rowGap: 4,
  },
  fieldLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#76787E',
    borderRadius: 10,
    height: vw(11),
    color: '#FFFFFF',
    paddingHorizontal: vw(3),
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: vw(3),
    marginTop: vh(0.5),
  },
  chartCard: {
    backgroundColor: '#232323',
    borderRadius: 12,
    padding: vw(3),
    rowGap: 8,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: vw(3),
    rowGap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#B0B0B0',
    fontSize: 11,
  },
  saveBtn: {
    backgroundColor: '#FFED4B',
    borderRadius: 16,
    paddingVertical: vh(1.8),
    marginTop: vh(1),
  },
  saveDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveText: {
    color: '#1A1A1A',
    fontWeight: '600',
    fontSize: 15,
  },
  deleteBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF4444',
    paddingVertical: vh(1.5),
  },
  deleteText: {
    color: '#FF4444',
    fontWeight: '600',
  },
});
