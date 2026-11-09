import {
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
import {useQuote} from '../../services/quoteStore';
import {isTradable} from '../../services/marketData';
import {useI18n} from '../../services/i18n';
import {
  cleanDecimalInput,
  formatMarketDate,
  formatMoney,
} from '../../services/format';
import {isMarketDate} from '../../services/engine/dates';
import {
  createRecurringRule,
  editRecurringRule,
  FREQUENCIES,
  Frequency,
  MAX_AMOUNT,
  MAX_DAY_OF_MONTH,
  MIN_AMOUNT,
  RecurringInput,
  validateRecurring,
} from '../../services/engine/recurring';
import {FREQUENCY_LABELS, WEEKDAY_SHORT} from '../../services/reasons';
import ScreenHeader from '../../components/ScreenHeader';
import SimulatedBanner from '../../components/SimulatedBanner';
import StockLogo from '../../components/StockLogo';

// Creates a rule (route params {symbol}, coming from Search) or edits one
// ({id}). The stock can't be changed while editing; delete and recreate
// instead, so each rule's history stays about a single stock.
const RecurringEdit = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const params = useRoute().params as {symbol?: string; id?: string};
  const {t, lang} = useI18n();
  const {data, addRecurring, editRecurring} = useAutomation();
  const existing = data.recurring.find(rule => rule.id === params.id);
  const symbol = existing?.symbol ?? params.symbol ?? '';
  const {quote} = useQuote(symbol);

  const [amountText, setAmountText] = useState(
    existing ? String(existing.amount) : '',
  );
  const [frequency, setFrequency] = useState<Frequency>(
    existing?.frequency ?? 'monthly',
  );
  const [weekday, setWeekday] = useState(existing?.weekday ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(existing?.dayOfMonth ?? 1);
  const [startText, setStartText] = useState('');

  const startValid = !startText || isMarketDate(startText);
  const input: RecurringInput = {
    symbol,
    name: existing?.name ?? quote?.name ?? symbol,
    amount: Number(amountText),
    frequency,
    weekday,
    dayOfMonth,
    startFrom: startText && startValid ? startText : undefined,
  };
  const valid = validateRecurring(input).length === 0 && startValid;
  // Existing rules were checked when they were created; new ones need a
  // quote to confirm the stock is priced in dollars.
  const tradable = existing ? true : !!quote && isTradable(quote);
  // Preview with the same functions that will save the rule.
  const preview = existing
    ? editRecurringRule(existing, input)
    : createRecurringRule(input);

  const save = () => {
    if (!valid || !tradable) {
      return;
    }
    if (existing) {
      editRecurring(existing.id, input);
      navigation.goBack();
    } else {
      const rule = addRecurring(input);
      navigation.replace('RecurringDetail', {id: rule.id});
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t(existing ? 'recurring.editTitle' : 'recurring.newTitle')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.stockCard}>
          <StockLogo symbol={symbol} size={vw(10)} />
          <View style={styles.flex}>
            <Text style={styles.symbol}>{symbol}</Text>
            <Text style={styles.grey} numberOfLines={1}>
              {input.name}
            </Text>
          </View>
          <Text style={styles.price}>
            {quote ? formatMoney(quote.price) : '—'}
          </Text>
        </View>
        {!existing && quote && !tradable ? (
          <Text style={styles.error}>{t('detail.notTradable')}</Text>
        ) : null}

        <Text style={styles.label}>{t('recurring.amount')}</Text>
        <TextInput
          testID="recurring-amount"
          style={styles.input}
          value={amountText}
          onChangeText={text => setAmountText(cleanDecimalInput(text, 2))}
          keyboardType="decimal-pad"
          placeholder="$50"
          placeholderTextColor="#76787E"
        />
        <Text style={styles.hint}>
          {t('recurring.amountRange', {
            min: formatMoney(MIN_AMOUNT),
            max: formatMoney(MAX_AMOUNT),
          })}
        </Text>

        <Text style={styles.label}>{t('recurring.frequency')}</Text>
        <View style={styles.chips}>
          {FREQUENCIES.map(item => (
            <Chip
              key={item}
              testID={`recurring-frequency-${item}`}
              label={t(FREQUENCY_LABELS[item])}
              selected={frequency === item}
              onPress={() => setFrequency(item)}
            />
          ))}
        </View>

        {frequency === 'monthly' ? (
          <>
            <Text style={styles.label}>{t('recurring.dayLabel')}</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                testID="recurring-day-minus"
                style={[styles.stepBtn, centerAll]}
                onPress={() => setDayOfMonth(day => Math.max(1, day - 1))}>
                <Text style={styles.stepText}>−</Text>
              </TouchableOpacity>
              <Text testID="recurring-day" style={styles.stepValue}>
                {t('recurring.day', {day: dayOfMonth})}
              </Text>
              <TouchableOpacity
                testID="recurring-day-plus"
                style={[styles.stepBtn, centerAll]}
                onPress={() =>
                  setDayOfMonth(day => Math.min(MAX_DAY_OF_MONTH, day + 1))
                }>
                <Text style={styles.stepText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>{t('recurring.dayHint')}</Text>
          </>
        ) : (
          <>
            <Text style={styles.label}>{t('recurring.weekdayLabel')}</Text>
            <View style={styles.chips}>
              {WEEKDAY_SHORT.map((key, i) => (
                <Chip
                  key={key}
                  testID={`recurring-weekday-${i + 1}`}
                  label={t(key)}
                  selected={weekday === i + 1}
                  onPress={() => setWeekday(i + 1)}
                />
              ))}
            </View>
          </>
        )}

        {__DEV__ ? (
          <>
            <Text style={styles.label}>{t('recurring.startLabel')}</Text>
            <TextInput
              testID="recurring-start"
              style={styles.input}
              value={startText}
              onChangeText={setStartText}
              placeholder="2026-01-15"
              placeholderTextColor="#76787E"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={startValid ? styles.hint : styles.error}>
              {t(startValid ? 'recurring.startHint' : 'recurring.invalidStart')}
            </Text>
          </>
        ) : null}

        {valid ? (
          <View style={styles.previewCard}>
            <Text testID="recurring-preview" style={styles.previewText}>
              {t('recurring.firstBuy', {
                date: formatMarketDate(preview.nextDate, lang, {
                  weekday: true,
                }),
              })}
            </Text>
            <Text style={styles.grey}>
              {t('recurring.howItWorks', {
                amount: formatMoney(input.amount),
                symbol,
              })}
            </Text>
          </View>
        ) : null}

        <SimulatedBanner />

        <TouchableOpacity
          testID="recurring-save"
          disabled={!valid || !tradable}
          style={[
            styles.saveBtn,
            centerAll,
            (!valid || !tradable) && styles.saveDisabled,
          ]}
          onPress={save}>
          <Text style={styles.saveText}>{t('common.save')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

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

export default RecurringEdit;

const styles = StyleSheet.create({
  container: container,
  content: {
    paddingHorizontal: vw(5),
    paddingBottom: vh(4),
    rowGap: vh(1),
  },
  flex: {
    flex: 1,
  },
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: vw(3),
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: vw(4),
  },
  symbol: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  price: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: vh(1.5),
  },
  input: {
    borderWidth: 1,
    borderColor: '#76787E',
    borderRadius: 12,
    height: vw(12),
    color: '#FFFFFF',
    paddingHorizontal: vw(4),
    fontSize: 16,
  },
  hint: {
    color: '#76787E',
    fontSize: 12,
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
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: vw(4),
  },
  stepBtn: {
    width: vw(11),
    height: vw(11),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#76787E',
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  stepValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    minWidth: vw(20),
    textAlign: 'center',
  },
  previewCard: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: vw(4),
    rowGap: 6,
    marginTop: vh(1.5),
  },
  previewText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  grey: {
    color: '#76787E',
    fontSize: 13,
    lineHeight: 18,
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
});
