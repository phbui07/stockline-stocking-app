import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {centerAll, container, vh, vw} from '../../services/styleSheet';
import {useAutomation} from '../../services/automation';
import {useUserData} from '../../services/userData';
import {DailyHistory, getDailyHistory} from '../../services/data';
import {TKey, useI18n} from '../../services/i18n';
import {
  changeColor,
  cleanDecimalInput,
  formatMarketDate,
  formatMoney,
  formatMoneyShort,
  formatPercent,
} from '../../services/format';
import {
  addDays,
  addMonths,
  isMarketDate,
  lastCompletedMarketDate,
  MarketDate,
} from '../../services/engine/dates';
import {
  BacktestResult,
  BacktestTrade,
  LineStats,
  MAX_BALANCE,
  MIN_BALANCE,
  runBacktest,
  validateBacktest,
} from '../../services/engine/backtest';
import {getStrategy} from '../../services/engine/strategies';
import {CostSettings, hasCosts} from '../../services/engine/costs';
import {
  describeReason,
  describeStrategy,
  RISK_LABELS,
} from '../../services/reasons';
import ScreenHeader from '../../components/ScreenHeader';
import SimulatedBanner from '../../components/SimulatedBanner';
import MultiLineChart from '../../components/MultiLineChart';

type Range = '1y' | '3y' | '5y' | '10y' | 'max' | 'custom';
const RANGES: {key: Range; label: TKey; years?: number}[] = [
  {key: '1y', label: 'backtest.range1y', years: 1},
  {key: '3y', label: 'backtest.range3y', years: 3},
  {key: '5y', label: 'backtest.range5y', years: 5},
  {key: '10y', label: 'backtest.range10y', years: 10},
  {key: 'max', label: 'backtest.rangeMax'},
  {key: 'custom', label: 'backtest.rangeCustom'},
];
// "Max" asks for everything since 1980; the data starts at the listing.
const EARLIEST = '1980-01-01';
const BENCHMARK = 'SPY';
const COLORS = {
  bot: '#FFED4B',
  botBeforeCosts: 'rgba(255, 237, 75, 0.45)',
  hold: '#4DA3FF',
  index: '#B0B0B0',
};
const LINE_COLORS: Record<string, string> = {
  fast: '#4DA3FF',
  slow: '#FFB020',
  trend: '#B072FF',
};
const TRADES_SHOWN = 10;

type Failure = 'range' | 'balance' | 'dates' | 'noData' | 'download';
const FAILURE_KEYS: Record<Failure, TKey> = {
  range: 'backtest.errorRange',
  balance: 'backtest.errorBalance',
  dates: 'backtest.errorDates',
  noData: 'backtest.noData',
  download: 'backtest.downloadError',
};

// A run's results: without costs, and with them if any are set.
interface Outcome {
  gross: BacktestResult;
  net?: BacktestResult;
  costs: CostSettings;
}

// Backtests a saved bot (route params {botId}) over a period you choose.
const Backtest = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const {botId} = useRoute().params as {botId: string};
  const {t, lang} = useI18n();
  const {data} = useAutomation();
  const bot = data.bots.find(item => item.id === botId);
  const {spreadPercent, taxPercent} = useUserData().data.settings.costs;
  const costs: CostSettings = {spreadPercent, taxPercent};

  const [range, setRange] = useState<Range>('5y');
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [balanceText, setBalanceText] = useState('10000');
  const [running, setRunning] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [result, setResult] = useState<Outcome | null>(null);
  const [hasBenchmark, setHasBenchmark] = useState(true);

  if (!bot) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('backtest.title')} />
      </SafeAreaView>
    );
  }

  const period = (): {from: MarketDate; to: MarketDate} | null => {
    const latest = lastCompletedMarketDate();
    if (range === 'custom') {
      return isMarketDate(fromText) && isMarketDate(toText)
        ? {from: fromText, to: toText}
        : null;
    }
    const years = RANGES.find(item => item.key === range)?.years;
    return {
      from: years ? addMonths(latest, -12 * years) : EARLIEST,
      to: latest,
    };
  };

  const run = async () => {
    const dates = period();
    const balance = Number(balanceText);
    if (!dates) {
      setFailure('dates');
      return;
    }
    const problem = validateBacktest(dates.from, dates.to, balance)[0];
    if (problem) {
      setFailure(problem);
      return;
    }
    setFailure(null);
    setResult(null);
    setRunning(true);
    try {
      // Start early enough that the strategy's averages exist on day one.
      // Warm-up is in trading days; ×1.6 converts to calendar days with
      // room for weekends and holidays.
      const warmup = getStrategy(bot.strategy).warmupBars(bot.settings);
      const fetchFrom = addDays(dates.from, -Math.ceil(warmup * 1.6) - 10);
      const [history, benchmark] = await Promise.all([
        getDailyHistory(bot.symbol, fetchFrom, dates.to),
        bot.symbol === BENCHMARK
          ? null
          : getDailyHistory(BENCHMARK, fetchFrom, dates.to).catch(
              () => undefined,
            ),
      ]);
      // When the bot trades SPY itself, holding SPY already is the index
      // comparison, so there's no separate benchmark line.
      const isIndex = bot.symbol === BENCHMARK;
      const index: DailyHistory | undefined = isIndex
        ? undefined
        : benchmark ?? undefined;
      // Let the "Running…" state paint before the (synchronous) replay.
      await new Promise<void>(resolve => setTimeout(() => resolve(), 30));
      const input = {
        bot,
        history,
        benchmark: index,
        from: dates.from,
        to: dates.to,
        startingBalance: balance,
      };
      // The same test twice, without and with costs, to compare them.
      const gross = runBacktest(input);
      const net = hasCosts(costs) ? runBacktest({...input, costs}) : null;
      setHasBenchmark(isIndex || !!index);
      setResult(gross ? {gross, net: net ?? undefined, costs} : null);
      setFailure(gross ? null : 'noData');
    } catch {
      setFailure('download');
    } finally {
      setRunning(false);
    }
  };

  const exits = (['stopLoss', 'takeProfit', 'trailingStop'] as const)
    .filter(kind => bot.exits[kind] !== undefined)
    .map(kind => `${t(RISK_LABELS[kind])} ${bot.exits[kind]}%`);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('backtest.title')} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.card}>
          <Text style={styles.title}>{bot.symbol}</Text>
          <Text style={styles.grey}>{describeStrategy(bot.settings, t)}</Text>
          <Text style={styles.grey}>
            {[
              ...exits,
              t('backtest.riskLine', {percent: bot.riskPercent}),
            ].join(' · ')}
          </Text>
          <TouchableOpacity
            testID="backtest-edit"
            onPress={() => navigation.navigate('BotEdit', {id: bot.id})}>
            <Text style={styles.link}>{t('backtest.editBot')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.explain}>{t('backtest.intro')}</Text>

        <Text style={styles.label}>{t('backtest.range')}</Text>
        <View style={styles.chips}>
          {RANGES.map(item => (
            <TouchableOpacity
              key={item.key}
              testID={`backtest-range-${item.key}`}
              style={[styles.chip, range === item.key && styles.chipSelected]}
              onPress={() => setRange(item.key)}>
              <Text
                style={[
                  styles.chipText,
                  range === item.key && styles.chipTextSelected,
                ]}>
                {t(item.label)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {range === 'custom' ? (
          <View style={styles.inputRow}>
            <Field
              testID="backtest-from"
              label={t('backtest.from')}
              value={fromText}
              onChange={setFromText}
              placeholder="2015-01-02"
            />
            <Field
              testID="backtest-to"
              label={t('backtest.to')}
              value={toText}
              onChange={setToText}
              placeholder="2025-12-31"
            />
          </View>
        ) : null}
        <Field
          testID="backtest-balance"
          label={t('backtest.balance')}
          value={balanceText}
          onChange={value => setBalanceText(cleanDecimalInput(value, 2))}
          decimal
        />
        <Text testID="backtest-costs" style={styles.grey}>
          {hasCosts(costs)
            ? t('backtest.costsLine', {spread: spreadPercent, tax: taxPercent})
            : t('backtest.costsNone')}
        </Text>
        <TouchableOpacity
          testID="backtest-costs-edit"
          onPress={() => navigation.navigate('Costs')}>
          <Text style={styles.link}>{t('backtest.editCosts')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="backtest-run"
          disabled={running}
          style={[styles.runBtn, centerAll, running && styles.runDisabled]}
          onPress={run}>
          {running ? (
            <ActivityIndicator color="#1A1A1A" />
          ) : (
            <Text style={styles.runText}>{t('backtest.run')}</Text>
          )}
        </TouchableOpacity>
        {failure ? (
          <Text testID="backtest-error" style={styles.error}>
            {t(FAILURE_KEYS[failure], {
              min: formatMoney(MIN_BALANCE),
              max: formatMoney(MAX_BALANCE),
            })}
          </Text>
        ) : null}

        {result ? (
          <Results
            result={result.net ?? result.gross}
            gross={result.net ? result.gross : undefined}
            symbol={bot.symbol}
            hasBenchmark={hasBenchmark}
            lang={lang}
          />
        ) : null}

        <Text style={styles.note}>{t('backtest.assumptions')}</Text>
        <SimulatedBanner />
      </ScrollView>
    </SafeAreaView>
  );
};

// `result` is what the table, charts and trades show: with costs, if any
// are set. `gross` is the same test without costs, for the comparison.
const Results: React.FC<{
  result: BacktestResult;
  gross?: BacktestResult;
  symbol: string;
  hasBenchmark: boolean;
  lang: 'vi' | 'en';
}> = ({result, gross, symbol, hasBenchmark, lang}) => {
  const {t} = useI18n();
  const [showAll, setShowAll] = useState(false);
  const {stats, dates} = result;
  const first = dates[0];
  const last = dates[dates.length - 1];
  const columns: {label: string; stats?: LineStats}[] = [
    {label: t('backtest.colBot'), stats: stats.strategy},
    {label: t('backtest.colHold', {symbol}), stats: stats.buyHold},
    {label: BENCHMARK, stats: stats.benchmark},
  ].filter(column => column.stats);
  const rows: {
    label: TKey;
    value: (line: LineStats) => string;
    color?: (line: LineStats) => string;
  }[] = [
    {
      label: 'backtest.rowReturn',
      value: line => formatPercent(line.totalReturn),
      color: line => changeColor(line.totalReturn),
    },
    {
      label: 'backtest.rowAnnual',
      value: line =>
        line.annualReturn === undefined
          ? '—'
          : formatPercent(line.annualReturn),
    },
    {
      label: 'backtest.rowDrawdown',
      value: line => formatPercent(line.maxDrawdown.percent),
    },
    {label: 'backtest.rowFinal', value: line => formatMoney(line.finalValue)},
  ];
  const trades = [...result.trades].reverse(); // newest first
  const shownTrades = showAll ? trades : trades.slice(0, TRADES_SHOWN);

  return (
    <View testID="backtest-results" style={styles.results}>
      <Text style={styles.grey}>
        {t('backtest.period', {
          from: formatMarketDate(first, lang),
          to: formatMarketDate(last, lang),
          days: dates.length,
        })}
      </Text>
      {result.startedLate ? (
        <Text testID="backtest-started-late" style={styles.grey}>
          {t(
            symbol === BENCHMARK
              ? 'backtest.startedLaterOne'
              : 'backtest.startedLater',
            {date: formatMarketDate(first, lang), symbol},
          )}
        </Text>
      ) : null}
      {!hasBenchmark ? (
        <Text style={styles.warning}>{t('backtest.noBenchmark')}</Text>
      ) : null}
      {gross ? (
        <Text style={styles.grey}>{t('backtest.afterCosts')}</Text>
      ) : null}

      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Text style={[styles.tableLabel, styles.tableHead]} />
          {columns.map(column => (
            <Text
              key={column.label}
              style={[styles.tableCell, styles.tableHead]}
              numberOfLines={1}>
              {column.label}
            </Text>
          ))}
        </View>
        {rows.map(row => (
          <View key={row.label} style={styles.tableRow}>
            <Text style={styles.tableLabel}>{t(row.label)}</Text>
            {columns.map(column => (
              <Text
                key={column.label}
                testID={`backtest-${row.label}-${column.label}`}
                style={[
                  styles.tableCell,
                  column.stats && row.color
                    ? {color: row.color(column.stats)}
                    : null,
                ]}>
                {column.stats ? row.value(column.stats) : '—'}
              </Text>
            ))}
          </View>
        ))}
      </View>
      <Text testID="backtest-trade-stats" style={styles.explain}>
        {t('backtest.tradeStats', {
          closed: stats.closedTrades,
          open: stats.openTrades,
          winRate:
            stats.winRate === undefined
              ? '—'
              : formatPercent(stats.winRate, false),
          exposure: formatPercent(stats.exposure, false),
        })}
      </Text>
      {gross ? (
        <CostsCompare gross={gross} net={result} symbol={symbol} />
      ) : null}

      <Text style={styles.sectionTitle}>{t('backtest.equityTitle')}</Text>
      <View style={styles.chartCard}>
        <MultiLineChart
          series={[
            {
              key: 'index',
              values: result.benchmark ?? [],
              color: COLORS.index,
              dashed: true,
            },
            {key: 'hold', values: result.buyHold, color: COLORS.hold},
            ...(gross
              ? [
                  {
                    key: 'botBeforeCosts',
                    values: gross.equity,
                    color: COLORS.botBeforeCosts,
                    dashed: true,
                  },
                ]
              : []),
            {key: 'bot', values: result.equity, color: COLORS.bot, width: 2},
          ]}
          width={vw(90) - vw(6)}
          height={vw(48)}
          formatValue={formatMoneyShort}
          startLabel={formatMarketDate(first, lang)}
          endLabel={formatMarketDate(last, lang)}
          accessibilityLabel={t('backtest.equityLabel')}
        />
        <View style={styles.legend}>
          <Legend color={COLORS.bot} label={t('backtest.colBot')} />
          {gross ? (
            <Legend
              color={COLORS.botBeforeCosts}
              label={t('backtest.legendBeforeCosts')}
            />
          ) : null}
          <Legend color={COLORS.hold} label={t('backtest.colHold', {symbol})} />
          {result.benchmark ? (
            <Legend color={COLORS.index} label={BENCHMARK} />
          ) : null}
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('backtest.priceTitle')}</Text>
      <View style={styles.chartCard}>
        <MultiLineChart
          series={[
            {key: 'price', values: result.closes, color: '#FFFFFF', width: 1.2},
            ...result.indicators.map(line => ({
              key: line.key,
              values: line.values,
              color: LINE_COLORS[line.key] ?? '#B0B0B0',
              width: 1.6,
              dashed: line.key === 'trend',
            })),
          ]}
          markers={result.trades.flatMap(trade => [
            {index: trade.entryIndex, kind: 'buy' as const},
            ...(trade.exitIndex !== undefined
              ? [{index: trade.exitIndex, kind: 'sell' as const}]
              : []),
          ])}
          width={vw(90) - vw(6)}
          height={vw(48)}
          formatValue={formatMoneyShort}
          startLabel={formatMarketDate(first, lang)}
          endLabel={formatMarketDate(last, lang)}
          accessibilityLabel={t('backtest.priceLabel')}
        />
        <View style={styles.legend}>
          <Legend color="#FFFFFF" label={t('bot.legendPrice')} />
          {result.indicators.map(line => (
            <Legend
              key={line.key}
              color={LINE_COLORS[line.key] ?? '#B0B0B0'}
              label={describeReason(line.label, t)}
            />
          ))}
          <Legend color="#5DC172" label={t('backtest.legendBuy')} />
          <Legend color="#FF4444" label={t('backtest.legendSell')} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('backtest.tradesTitle')}</Text>
      {trades.length === 0 ? (
        <Text style={styles.grey}>{t('backtest.noTrades')}</Text>
      ) : (
        shownTrades.map(trade => (
          <TradeRow key={trade.entryIndex} trade={trade} lang={lang} />
        ))
      )}
      {!showAll && trades.length > TRADES_SHOWN ? (
        <TouchableOpacity
          testID="backtest-show-all"
          onPress={() => setShowAll(true)}>
          <Text style={styles.link}>
            {t('backtest.showAll', {count: trades.length})}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const TradeRow: React.FC<{trade: BacktestTrade; lang: 'vi' | 'en'}> = ({
  trade,
  lang,
}) => {
  const {t} = useI18n();
  return (
    <View testID="backtest-trade" style={styles.tradeRow}>
      <View style={styles.tradeTop}>
        <Text style={styles.tradeDates}>
          {formatMarketDate(trade.entryDate, lang)} →{' '}
          {trade.exitDate
            ? formatMarketDate(trade.exitDate, lang)
            : t('backtest.tradeOpen')}
        </Text>
        <Text
          style={[
            styles.tradeReturn,
            {color: changeColor(trade.returnPercent)},
          ]}>
          {formatPercent(trade.returnPercent)}
        </Text>
      </View>
      <Text style={styles.grey}>
        {formatMoney(trade.entryPrice)} →{' '}
        {trade.exitPrice !== undefined ? formatMoney(trade.exitPrice) : '…'}
      </Text>
      {trade.exitReason ? (
        <Text style={styles.grey}>{describeReason(trade.exitReason, t)}</Text>
      ) : null}
      {trade.fees || trade.tax ? (
        <Text style={styles.grey}>
          {[
            trade.fees
              ? t('backtest.tradeSpread', {
                  amount: formatMoney(trade.fees, {cents: true}),
                })
              : null,
            trade.tax
              ? t(
                  trade.tax > 0 ? 'backtest.tradeTax' : 'backtest.tradeTaxBack',
                  {
                    amount: formatMoney(Math.abs(trade.tax), {cents: true}),
                  },
                )
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
    </View>
  );
};

// The same test without and with costs, side by side.
const CostsCompare: React.FC<{
  gross: BacktestResult;
  net: BacktestResult;
  symbol: string;
}> = ({gross, net, symbol}) => {
  const {t} = useI18n();
  const lines: {
    key: string;
    label: string;
    gross?: LineStats;
    net?: LineStats;
  }[] = [
    {
      key: 'bot',
      label: t('backtest.colBot'),
      gross: gross.stats.strategy,
      net: net.stats.strategy,
    },
    {
      key: 'hold',
      label: t('backtest.colHold', {symbol}),
      gross: gross.stats.buyHold,
      net: net.stats.buyHold,
    },
    {
      key: 'index',
      label: BENCHMARK,
      gross: gross.stats.benchmark,
      net: net.stats.benchmark,
    },
  ];
  const cell = (line?: LineStats) =>
    line ? (
      <View style={styles.compareCell}>
        <Text style={styles.compareValue}>{formatMoney(line.finalValue)}</Text>
        <Text
          style={[
            styles.compareReturn,
            {color: changeColor(line.totalReturn)},
          ]}>
          {formatPercent(line.totalReturn)}
        </Text>
      </View>
    ) : null;
  // Costs usually lower the final value. They can raise it a little: tax set
  // aside after a gain isn't invested, so a following loss is smaller.
  const difference =
    gross.stats.strategy.finalValue - net.stats.strategy.finalValue;
  const trades = net.transactions.filter(tx => tx.source !== 'dividend').length;

  return (
    <View testID="backtest-compare" style={styles.table}>
      <Text style={styles.tableHead}>{t('backtest.compareTitle')}</Text>
      <View style={styles.tableRow}>
        <Text style={styles.tableLabel} />
        <Text style={[styles.tableCell, styles.tableHead]}>
          {t('backtest.colWithout')}
        </Text>
        <Text style={[styles.tableCell, styles.tableHead]}>
          {t('backtest.colWith')}
        </Text>
      </View>
      {lines
        .filter(line => line.gross && line.net)
        .map(line => (
          <View
            key={line.key}
            testID={`backtest-compare-${line.key}`}
            style={styles.tableRow}>
            <Text style={styles.tableLabel} numberOfLines={2}>
              {line.label}
            </Text>
            {cell(line.gross)}
            {cell(line.net)}
          </View>
        ))}
      <Text testID="backtest-costs-paid" style={styles.explain}>
        {t('backtest.costsPaid', {
          spread: formatMoney(net.stats.spreadPaid, {cents: true}),
          trades,
          tax: formatMoney(net.stats.taxPaid, {cents: true}),
        })}{' '}
        {t(difference >= 0 ? 'backtest.costsLower' : 'backtest.costsHigher', {
          amount: formatMoney(Math.abs(difference), {cents: true}),
        })}
      </Text>
    </View>
  );
};

const Legend: React.FC<{color: string; label: string}> = ({color, label}) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, {backgroundColor: color}]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const Field: React.FC<{
  testID: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  decimal?: boolean;
}> = ({testID, label, value, onChange, placeholder, decimal}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      testID={testID}
      style={styles.input}
      value={value}
      onChangeText={onChange}
      keyboardType={decimal ? 'decimal-pad' : 'default'}
      placeholder={placeholder}
      placeholderTextColor="#76787E"
      autoCapitalize="none"
      autoCorrect={false}
    />
  </View>
);

export default Backtest;

const styles = StyleSheet.create({
  container: container,
  content: {
    paddingHorizontal: vw(5),
    paddingBottom: vh(4),
    rowGap: vh(1.2),
  },
  card: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: vw(4),
    rowGap: 4,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  link: {
    color: '#FFED4B',
    fontWeight: '600',
    marginTop: 4,
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
    marginTop: vh(1),
  },
  warning: {
    color: '#FFB020',
    fontSize: 12,
  },
  error: {
    color: '#FF4444',
    fontSize: 13,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: vw(2),
  },
  chip: {
    borderRadius: 16,
    paddingHorizontal: vw(3.5),
    paddingVertical: 7,
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
  input: {
    borderWidth: 1,
    borderColor: '#76787E',
    borderRadius: 10,
    height: vw(11),
    color: '#FFFFFF',
    paddingHorizontal: vw(3),
    fontSize: 15,
  },
  runBtn: {
    backgroundColor: '#FFED4B',
    borderRadius: 16,
    paddingVertical: vh(1.8),
    marginTop: vh(0.5),
  },
  runDisabled: {
    opacity: 0.6,
  },
  runText: {
    color: '#1A1A1A',
    fontWeight: '600',
    fontSize: 15,
  },
  results: {
    rowGap: vh(1.2),
    marginTop: vh(1),
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: vh(1),
  },
  table: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: vw(3),
    rowGap: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableLabel: {
    width: vw(24),
    color: '#B0B0B0',
    fontSize: 12,
  },
  tableHead: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tableCell: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'right',
  },
  compareCell: {
    flex: 1,
    alignItems: 'flex-end',
  },
  compareValue: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  compareReturn: {
    fontSize: 12,
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
  tradeRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3A3A3A',
    paddingVertical: 8,
    rowGap: 2,
  },
  tradeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tradeDates: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  tradeReturn: {
    fontWeight: '600',
    fontSize: 13,
  },
});
