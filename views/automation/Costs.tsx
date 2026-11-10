import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {centerAll, container, vh, vw} from '../../services/styleSheet';
import {useUserData} from '../../services/userData';
import {useI18n} from '../../services/i18n';
import {cleanDecimalInput, formatMoney} from '../../services/format';
import {
  COST_LIMITS,
  spreadFee,
  validateCosts,
} from '../../services/engine/costs';
import ScreenHeader from '../../components/ScreenHeader';
import SimulatedBanner from '../../components/SimulatedBanner';

const EXAMPLE = 1000; // the trade and gain the examples are worked out on

// The spread and tax rates (see engine/costs.ts). Backtests always compare
// results with and without them; practice trades pay them only if the
// switch is on.
const Costs = () => {
  const navigation = useNavigation();
  const {t} = useI18n();
  const {data, updateSettings} = useUserData();
  const saved = data.settings.costs;
  const [spreadText, setSpreadText] = useState(String(saved.spreadPercent));
  const [taxText, setTaxText] = useState(String(saved.taxPercent));
  const [apply, setApply] = useState(saved.applyToTrades);

  const costs = {
    spreadPercent: spreadText === '' ? NaN : Number(spreadText),
    taxPercent: taxText === '' ? NaN : Number(taxText),
  };
  const errors = validateCosts(costs);

  const save = () => {
    if (errors.length) {
      return;
    }
    updateSettings({costs: {...costs, applyToTrades: apply}});
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('costs.title')} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <SimulatedBanner detail={t('costs.intro')} />

        <Text style={styles.label}>{t('costs.spread')}</Text>
        <TextInput
          testID="costs-spread"
          style={styles.input}
          value={spreadText}
          onChangeText={text => setSpreadText(cleanDecimalInput(text, 3))}
          keyboardType="decimal-pad"
        />
        <Text style={styles.hint}>{t('costs.spreadHint')}</Text>
        {!errors.includes('spread') ? (
          <Text testID="costs-spread-example" style={styles.example}>
            {t('costs.spreadExample', {
              amount: formatMoney(EXAMPLE),
              cost: formatMoney(spreadFee(EXAMPLE, costs.spreadPercent), {
                cents: true,
              }),
            })}
          </Text>
        ) : (
          <Text style={styles.error}>
            {t('costs.errorSpread', COST_LIMITS.spreadPercent)}
          </Text>
        )}

        <Text style={[styles.label, styles.gap]}>{t('costs.tax')}</Text>
        <TextInput
          testID="costs-tax"
          style={styles.input}
          value={taxText}
          onChangeText={text => setTaxText(cleanDecimalInput(text, 2))}
          keyboardType="decimal-pad"
        />
        <Text style={styles.hint}>{t('costs.taxHint')}</Text>
        {!errors.includes('tax') ? (
          <Text testID="costs-tax-example" style={styles.example}>
            {t('costs.taxExample', {
              amount: formatMoney(EXAMPLE),
              cost: formatMoney((EXAMPLE * costs.taxPercent) / 100, {
                cents: true,
              }),
            })}
          </Text>
        ) : (
          <Text style={styles.error}>
            {t('costs.errorTax', COST_LIMITS.taxPercent)}
          </Text>
        )}

        <View style={[styles.toggleRow, styles.gap]}>
          <View style={styles.flex}>
            <Text style={styles.label}>{t('costs.apply')}</Text>
            <Text style={styles.hint}>{t('costs.applyHint')}</Text>
          </View>
          <Switch
            testID="costs-apply"
            value={apply}
            onValueChange={setApply}
            trackColor={{true: '#FFED4B', false: '#3A3A3A'}}
            thumbColor="#FFFFFF"
          />
        </View>

        <Text style={[styles.hint, styles.gap]}>{t('costs.notAdvice')}</Text>

        <TouchableOpacity
          testID="costs-save"
          disabled={errors.length > 0}
          style={[styles.saveBtn, centerAll, errors.length > 0 && styles.off]}
          onPress={save}>
          <Text style={styles.saveText}>{t('common.save')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Costs;

const styles = StyleSheet.create({
  container: container,
  content: {
    paddingHorizontal: vw(5),
    paddingBottom: vh(4),
    rowGap: vh(1),
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  gap: {
    marginTop: vh(1.5),
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
  hint: {
    color: '#B0B0B0',
    fontSize: 12,
    lineHeight: 17,
  },
  example: {
    color: '#FFED4B',
    fontSize: 12,
  },
  error: {
    color: '#FF4444',
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: vw(3),
  },
  flex: {
    flex: 1,
    rowGap: 4,
  },
  saveBtn: {
    backgroundColor: '#FFED4B',
    borderRadius: 16,
    paddingVertical: vh(1.8),
    marginTop: vh(1),
  },
  off: {
    backgroundColor: '#CCCCCC',
  },
  saveText: {
    color: '#1A1A1A',
    fontWeight: '600',
    fontSize: 15,
  },
});
