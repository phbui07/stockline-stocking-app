import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute} from '@react-navigation/native';
import {container, vh, vw} from '../../services/styleSheet';
import {useQuotes} from '../../services/quoteStore';
import {useUserData} from '../../services/userData';
import {summarize} from '../../services/portfolio';
import {getDailyHistory} from '../../services/marketData';
import {
  computeTrackRecord,
  IndicatorRecord,
  Outcome,
  TrackRecord,
} from '../../services/indicators';
import {
  AiError,
  AiErrorCode,
  explainStock,
  ExplanationResult,
  getApiKey,
  getCachedExplanation,
} from '../../services/aiExplainer';
import {TKey, useI18n} from '../../services/i18n';
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatShares,
} from '../../services/format';
import ScreenHeader from '../../components/ScreenHeader';
import ApiKeyForm from '../../components/ApiKeyForm';

const ERROR_KEYS: Record<AiErrorCode, TKey> = {
  NO_KEY: 'insights.needKey',
  INVALID_KEY: 'insights.errorInvalidKey',
  QUOTA: 'insights.errorQuota',
  BLOCKED: 'insights.errorBlocked',
  NETWORK: 'insights.errorNetwork',
  BAD_RESPONSE: 'insights.errorBad',
};

// Users are told the content is AI-generated at the start of each session.
let aiNoticeShown = false;

const Insights = () => {
  const route = useRoute();
  const {symbol} = route.params as {symbol: string};
  const {t} = useI18n();
  const [record, setRecord] = useState<TrackRecord | null | undefined>();
  const [recordFailed, setRecordFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDailyHistory(symbol)
      .then(points => !cancelled && setRecord(computeTrackRecord(points)))
      .catch(() => !cancelled && setRecordFailed(true));
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('insights.title', {symbol})} />
      <ScrollView contentContainerStyle={styles.content}>
        <AiCard symbol={symbol} record={record} />
        <PositionNote symbol={symbol} />
        <TrackRecordCard record={record} failed={recordFailed} />
      </ScrollView>
    </SafeAreaView>
  );
};

const AiCard: React.FC<{symbol: string; record?: TrackRecord | null}> = ({
  symbol,
  record,
}) => {
  const {t, lang} = useI18n();
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [result, setResult] = useState<ExplanationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AiErrorCode | null>(null);

  useEffect(() => {
    getApiKey().then(key => setHasKey(!!key));
    getCachedExplanation(symbol, lang).then(setResult);
  }, [symbol, lang]);

  const run = useCallback(
    async (force: boolean) => {
      setLoading(true);
      setError(null);
      try {
        setResult(
          await explainStock(symbol, lang, {trackRecord: record, force}),
        );
      } catch (e) {
        const code = e instanceof AiError ? e.code : 'NETWORK';
        if (code === 'NO_KEY' || code === 'INVALID_KEY') {
          setHasKey(false);
        }
        setError(code);
      } finally {
        setLoading(false);
      }
    },
    [symbol, lang, record],
  );

  const explain = (force: boolean) => {
    if (aiNoticeShown) {
      run(force);
      return;
    }
    Alert.alert(t('insights.noticeTitle'), t('insights.noticeBody'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('insights.noticeContinue'),
        onPress: () => {
          aiNoticeShown = true;
          run(force);
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('insights.aiTitle')}</Text>
      {hasKey === false ? (
        <>
          <Text style={styles.grey}>
            {error && error !== 'NO_KEY'
              ? t(ERROR_KEYS[error])
              : t('insights.needKey')}
          </Text>
          <ApiKeyForm
            onSaved={() => {
              setHasKey(true);
              setError(null);
            }}
          />
        </>
      ) : loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#FFED4B" />
          <Text style={styles.grey}>{t('insights.loading')}</Text>
        </View>
      ) : result ? (
        <ExplanationView
          result={result}
          onRegenerate={() => explain(true)}
          error={error}
        />
      ) : (
        <>
          <Text style={styles.grey}>{t('insights.aiIntro')}</Text>
          {error ? (
            <Text style={styles.error}>{t(ERROR_KEYS[error])}</Text>
          ) : null}
          <TouchableOpacity
            testID="insights-explain"
            style={styles.primaryBtn}
            disabled={hasKey === null}
            onPress={() => explain(false)}>
            <Text style={styles.primaryText}>{t('insights.explain')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const ExplanationView: React.FC<{
  result: ExplanationResult;
  onRegenerate: () => void;
  error: AiErrorCode | null;
}> = ({result, onRegenerate, error}) => {
  const {t, lang} = useI18n();
  const {explanation: e} = result;
  const paragraphs: [TKey, string][] = [
    ['insights.summary', e.summary],
    ['insights.priceAction', e.priceAction],
    ['insights.valuation', e.valuation],
    ['insights.news', e.news],
  ];
  const lists: [TKey, string[], string][] = [
    ['insights.positives', e.positives, '+'],
    ['insights.risks', e.risks, '!'],
    ['insights.questions', e.questions, '?'],
  ];

  return (
    <View testID="insights-explanation" style={styles.sections}>
      {paragraphs
        .filter(([, text]) => !!text)
        .map(([title, text]) => (
          <View key={title}>
            <Text style={styles.sectionTitle}>{t(title)}</Text>
            <Text style={styles.body}>{text}</Text>
          </View>
        ))}
      {lists
        .filter(([, items]) => items.length > 0)
        .map(([title, items, bullet]) => (
          <View key={title}>
            <Text style={styles.sectionTitle}>{t(title)}</Text>
            {items.map(item => (
              <View key={item} style={styles.bulletRow}>
                <Text style={styles.bullet}>{bullet}</Text>
                <Text style={[styles.body, styles.flex]}>{item}</Text>
              </View>
            ))}
          </View>
        ))}
      {e.terms.length ? (
        <View>
          <Text style={styles.sectionTitle}>{t('insights.terms')}</Text>
          {e.terms.map(term => (
            <Text key={term.term} style={styles.body}>
              <Text style={styles.term}>{term.term}: </Text>
              {term.meaning}
            </Text>
          ))}
        </View>
      ) : null}
      <Text testID="insights-ai-label" style={styles.label}>
        {t('insights.label', {
          model: result.model,
          time: formatDateTime(result.generatedAt, lang),
        })}
        {result.removed
          ? ` ${t('insights.removed', {count: result.removed})}`
          : ''}
      </Text>
      {error ? <Text style={styles.error}>{t(ERROR_KEYS[error])}</Text> : null}
      <TouchableOpacity style={styles.secondaryBtn} onPress={onRegenerate}>
        <Text style={styles.secondaryText}>{t('insights.regenerate')}</Text>
      </TouchableOpacity>
    </View>
  );
};

// Descriptive facts about the user's own virtual holding, computed on the
// device and never sent to the AI.
const PositionNote: React.FC<{symbol: string}> = ({symbol}) => {
  const {t} = useI18n();
  const {data} = useUserData();
  const {quotes} = useQuotes(Object.keys(data.portfolio.positions));
  const summary = summarize(data.portfolio, quotes);
  const holding = summary.holdings.find(h => h.position.symbol === symbol);
  if (!holding || !summary.totalValue) {
    return null;
  }
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('insights.positionTitle')}</Text>
      <Text style={styles.body}>
        {t('insights.positionDesc', {
          shares: formatShares(holding.position.shares),
          percent: formatPercent(
            (holding.value / summary.totalValue) * 100,
            false,
          ),
        })}
      </Text>
    </View>
  );
};

const TrackRecordCard: React.FC<{
  record?: TrackRecord | null;
  failed: boolean;
}> = ({record, failed}) => {
  const {t, lang} = useI18n();
  return (
    <View testID="insights-indicators" style={styles.card}>
      <Text style={styles.cardTitle}>{t('insights.indicatorsTitle')}</Text>
      {failed ? (
        <Text style={styles.grey}>{t('detail.chartError')}</Text>
      ) : record === undefined ? (
        <ActivityIndicator color="#FFED4B" />
      ) : record === null ? (
        <Text style={styles.grey}>{t('insights.notEnoughData')}</Text>
      ) : (
        <>
          <Text style={styles.grey}>
            {t('insights.indicatorsIntro', {
              from: formatDate(record.from, lang),
              to: formatDate(record.to, lang),
              horizon: record.horizon,
            })}
          </Text>
          <View style={[styles.indicatorRow, styles.baseRow]}>
            <Text style={styles.indicatorName}>{t('insights.baseRate')}</Text>
            <OutcomeText outcome={record.base} />
          </View>
          {record.records.map(item => (
            <IndicatorRow key={item.id} record={item} />
          ))}
          <Text style={styles.caveat}>{t('insights.caveat')}</Text>
        </>
      )}
    </View>
  );
};

const IndicatorRow: React.FC<{record: IndicatorRecord}> = ({record}) => {
  const {t} = useI18n();
  return (
    <View testID={`indicator-${record.id}`} style={styles.indicatorRow}>
      <View style={styles.indicatorHeader}>
        <Text style={[styles.indicatorName, styles.flex]}>
          {t(`indicator.${record.id}`)}
        </Text>
        {record.activeNow !== undefined ? (
          <Text style={[styles.badge, record.activeNow && styles.badgeActive]}>
            {t(record.activeNow ? 'insights.now' : 'insights.notNow')}
          </Text>
        ) : null}
      </View>
      <Text style={styles.caveat}>{t(`indicator.${record.id}Desc`)}</Text>
      <OutcomeText outcome={record} />
    </View>
  );
};

// Below this many cases, a percentage is mostly noise.
const FEW_SAMPLES = 50;

const OutcomeText: React.FC<{outcome: Outcome}> = ({outcome}) => {
  const {t} = useI18n();
  if (!outcome.samples) {
    return <Text style={styles.body}>{t('insights.never')}</Text>;
  }
  return (
    <Text style={styles.body}>
      {t('insights.higherAfter', {
        rate: formatPercent(outcome.upRate, false),
        avg: formatPercent(outcome.avgReturn),
        count: formatNumber(outcome.samples),
      })}
      {outcome.samples < FEW_SAMPLES ? (
        <Text style={styles.warning}> · {t('insights.fewSamples')}</Text>
      ) : null}
    </Text>
  );
};

export default Insights;

const styles = StyleSheet.create({
  container: container,
  content: {
    paddingHorizontal: vw(5),
    paddingBottom: vh(4),
    rowGap: vh(2),
  },
  card: {
    backgroundColor: '#2C2C2C',
    borderRadius: 10,
    padding: vw(4),
    rowGap: vh(1.5),
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  grey: {
    color: '#76787E',
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: '#FF4444',
    fontSize: 13,
  },
  loading: {
    alignItems: 'center',
    rowGap: vh(1),
    paddingVertical: vh(2),
  },
  sections: {
    rowGap: vh(1.5),
  },
  sectionTitle: {
    color: '#FFED4B',
    fontWeight: '600',
    marginBottom: 4,
  },
  body: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  term: {
    fontWeight: '600',
  },
  bulletRow: {
    flexDirection: 'row',
    columnGap: vw(2),
    marginBottom: 4,
  },
  bullet: {
    color: '#FFED4B',
    fontWeight: '700',
    width: vw(3),
  },
  flex: {
    flex: 1,
  },
  label: {
    color: '#76787E',
    fontSize: 12,
    lineHeight: 17,
    borderTopWidth: 1,
    borderTopColor: '#404040',
    paddingTop: vh(1),
  },
  primaryBtn: {
    backgroundColor: '#FFED4B',
    borderRadius: 16,
    paddingVertical: vh(1.5),
    alignItems: 'center',
  },
  primaryText: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#FFED4B',
    borderRadius: 16,
    paddingVertical: vh(1.2),
    alignItems: 'center',
  },
  secondaryText: {
    color: '#FFED4B',
    fontWeight: '600',
  },
  indicatorRow: {
    borderTopWidth: 1,
    borderTopColor: '#404040',
    paddingTop: vh(1),
    rowGap: 4,
  },
  baseRow: {
    borderTopWidth: 0,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: vw(3),
  },
  indicatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: vw(2),
  },
  indicatorName: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  badge: {
    color: '#76787E',
    fontSize: 11,
    borderWidth: 1,
    borderColor: '#76787E',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  badgeActive: {
    color: '#1A1A1A',
    backgroundColor: '#FFED4B',
    borderColor: '#FFED4B',
  },
  warning: {
    color: '#FFB800',
  },
  caveat: {
    color: '#76787E',
    fontSize: 12,
    lineHeight: 17,
  },
});
