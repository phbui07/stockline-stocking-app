/* eslint-disable react-native/no-inline-styles */
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {centerAll, container, vh, vw} from '../../services/styleSheet';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {getCachedQuote, useQuote} from '../../services/quoteStore';
import {useUserData} from '../../services/userData';
import {
  cleanSharesInput,
  maxAffordableShares,
  OrderError,
  sharesToInput,
  TradeSide,
} from '../../services/portfolio';
import {isTradable} from '../../services/marketData';
import BiometricAuth from '../../services/biometricAuth';
import {TKey, useI18n} from '../../services/i18n';
import {formatMoney, formatShares} from '../../services/format';
import ScreenHeader from '../../components/ScreenHeader';
import StockLogo from '../../components/StockLogo';
import SimulatedBanner from '../../components/SimulatedBanner';
import {LoadingOverlay} from '../../components/LoadingComponent';

const ERROR_KEYS: Record<OrderError['code'], TKey> = {
  INVALID_QUANTITY: 'order.invalidQuantity',
  INVALID_PRICE: 'order.priceUnavailable',
  INSUFFICIENT_CASH: 'order.insufficientCash',
  INSUFFICIENT_SHARES: 'order.insufficientShares',
};

const BuyingVerify = () => {
  const route = useRoute();
  const params = route.params as {symbol: string; side?: TradeSide};
  const {symbol} = params;
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const {t} = useI18n();
  const {data, placeOrder} = useUserData();
  const {quote} = useQuote(symbol);
  const owned = data.portfolio.positions[symbol]?.shares ?? 0;
  const [side, setSide] = useState<TradeSide>(
    params.side === 'SELL' && owned > 0 ? 'SELL' : 'BUY',
  );
  const [quantityText, setQuantityText] = useState('1');
  const [processing, setProcessing] = useState(false);

  const shares = Number(quantityText);
  const price = quote?.price ?? 0;
  const total = Number.isFinite(shares) ? shares * price : 0;
  const cash = data.portfolio.cash;
  const maxShares = side === 'BUY' ? maxAffordableShares(cash, price) : owned;
  const cashAfter = side === 'BUY' ? cash - total : cash + total;
  const sideLabel = t(side === 'BUY' ? 'trade.buy' : 'trade.sell');

  const problem: TKey | null = !quote
    ? 'order.priceUnavailable'
    : !(shares > 0)
    ? 'order.invalidQuantity'
    : side === 'BUY' && total > cash
    ? 'order.insufficientCash'
    : side === 'SELL' && shares > owned
    ? 'order.insufficientShares'
    : null;

  const setShares = (value: number) => setQuantityText(sharesToInput(value));

  const execute = () => {
    // Fill at the freshest price, which may have moved since the screen opened.
    const latest = getCachedQuote(symbol) ?? quote;
    if (!latest) {
      Alert.alert(t('common.error'), t('order.priceUnavailable'));
      return;
    }
    try {
      const trade = placeOrder({
        side,
        symbol,
        name: latest.name,
        shares,
        price: latest.price,
      });
      Alert.alert(
        t('common.success'),
        t(side === 'BUY' ? 'order.successBuy' : 'order.successSell', {
          shares: formatShares(trade.shares),
          symbol,
          price: formatMoney(trade.price),
        }),
        [{text: t('common.ok'), onPress: () => navigation.goBack()}],
        {cancelable: false},
      );
    } catch (error) {
      const key =
        error instanceof OrderError ? ERROR_KEYS[error.code] : 'common.error';
      Alert.alert(t('common.error'), t(key));
    }
  };

  const handlePlaceOrder = async () => {
    if (problem) {
      Alert.alert(t('common.error'), t(problem));
      return;
    }
    if (data.settings.biometricForTrades) {
      const {available} = await BiometricAuth.checkBiometricAvailability();
      if (available) {
        setProcessing(true);
        const result = await BiometricAuth.authenticateWithBiometrics(
          t('order.authPrompt', {side: sideLabel.toLowerCase(), symbol}),
        );
        setProcessing(false);
        if (result.success) {
          execute();
        } else {
          Alert.alert(t('common.error'), t('order.authFailed'));
        }
        return;
      }
    }
    Alert.alert(
      t('order.confirmTitle', {side: sideLabel.toLowerCase()}),
      t('order.confirmMessage', {
        side: sideLabel,
        shares: formatShares(shares),
        symbol,
        price: formatMoney(price),
        total: formatMoney(total),
      }),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {text: t('order.place'), onPress: execute},
      ],
    );
  };

  const rows: [string, string, string?][] = [
    [t('order.marketPrice'), quote ? formatMoney(price) : '—'],
    [t('order.quantity'), quantityText || '0'],
    [t('order.estimatedTotal'), formatMoney(total), '#FFED4B'],
    side === 'BUY'
      ? [t('order.cashAvailable'), formatMoney(cash)]
      : [t('order.sharesOwned'), formatShares(owned)],
    [t('order.cashAfter'), formatMoney(cashAfter)],
    [t('order.fundingSource'), t('order.virtualAccount'), '#FFED4B'],
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <ScreenHeader title={t('order.title')} />
        <View style={{paddingHorizontal: vw(5), rowGap: vh(2)}}>
          <View style={styles.sideToggle}>
            {(['BUY', 'SELL'] as TradeSide[]).map(item => (
              <TouchableOpacity
                key={item}
                testID={`order-side-${item}`}
                disabled={item === 'SELL' && owned === 0}
                style={[
                  styles.sideBtn,
                  side === item && {
                    backgroundColor: item === 'BUY' ? '#FFED4B' : '#FF4444',
                  },
                  item === 'SELL' && owned === 0 && {opacity: 0.4},
                ]}
                onPress={() => setSide(item)}>
                <Text
                  style={[
                    styles.sideText,
                    side === item && {
                      color: item === 'BUY' ? '#1A1A1A' : '#FFFFFF',
                    },
                  ]}>
                  {t(item === 'BUY' ? 'trade.buy' : 'trade.sell')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.card}>
            <View style={styles.stock3Container}>
              <View style={styles.stockContent1}>
                <StockLogo symbol={symbol} />
                <View style={{flexShrink: 1}}>
                  <Text style={styles.stock3Title}>{symbol}</Text>
                  <Text style={styles.stock3Sub} numberOfLines={1}>
                    {quote?.name ?? ''}
                  </Text>
                </View>
              </View>
              <Text style={{color: '#1A1A1A', fontWeight: '600'}}>
                {quote ? formatMoney(price) : '—'}
              </Text>
            </View>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                testID="order-decrease"
                style={styles.stepBtn}
                onPress={() => setShares((shares || 0) - 1)}>
                <Text style={styles.stepText}>−</Text>
              </TouchableOpacity>
              <TextInput
                testID="order-quantity"
                style={styles.quantityInput}
                value={quantityText}
                onChangeText={text => setQuantityText(cleanSharesInput(text))}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <TouchableOpacity
                testID="order-increase"
                style={styles.stepBtn}
                onPress={() => setShares((shares || 0) + 1)}>
                <Text style={styles.stepText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="order-max"
                style={styles.maxBtn}
                onPress={() => setShares(maxShares)}>
                <Text style={styles.maxText}>{t('order.max')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoContainer}>
              {rows.map(([label, value, color]) => (
                <View key={label} style={styles.infoRow}>
                  <Text style={styles.infoKey}>{label}</Text>
                  <Text style={[styles.infoValue, color ? {color} : null]}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          {problem && quantityText ? (
            <Text style={styles.problemText}>{t(problem)}</Text>
          ) : null}
          <SimulatedBanner detail={t('order.disclaimer')} />
          {quote && !isTradable(quote) ? (
            <Text style={styles.problemText}>{t('detail.notTradable')}</Text>
          ) : (
            <TouchableOpacity
              testID="order-place"
              onPress={handlePlaceOrder}
              disabled={!!problem}
              style={[
                styles.placeBtn,
                centerAll,
                {backgroundColor: problem ? '#CCCCCC' : '#FFED4B'},
              ]}>
              <Text style={{color: '#1A1A1A', fontSize: 14, fontWeight: '600'}}>
                {t('order.place')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      {processing && <LoadingOverlay />}
    </SafeAreaView>
  );
};

export default BuyingVerify;

const styles = StyleSheet.create({
  container: container,
  sideToggle: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2C',
    borderRadius: vw(2),
    padding: vw(1),
  },
  sideBtn: {
    flex: 1,
    paddingVertical: vh(1.5),
    alignItems: 'center',
    borderRadius: vw(1.5),
  },
  sideText: {
    color: '#76787E',
    fontWeight: '600',
  },
  card: {
    padding: vw(3),
    backgroundColor: '#2C2C2C',
    borderRadius: 10,
    rowGap: vh(2),
  },
  stock3Container: {
    borderRadius: 6,
    width: '100%',
    backgroundColor: '#FFED4B',
    paddingVertical: vh(1.5),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: vw(2),
  },
  stock3Title: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '600',
  },
  stock3Sub: {
    color: '#76787E',
    fontSize: 12,
    fontWeight: '400',
  },
  stockContent1: {
    flexDirection: 'row',
    columnGap: vw(2),
    alignItems: 'center',
    flexShrink: 1,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: vw(2),
  },
  stepBtn: {
    width: vw(11),
    height: vw(11),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#76787E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  quantityInput: {
    flex: 1,
    height: vw(11),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFED4B',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  maxBtn: {
    paddingHorizontal: vw(3),
    height: vw(11),
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maxText: {
    color: '#FFED4B',
    fontWeight: '600',
  },
  infoContainer: {
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoKey: {
    color: 'white',
    fontSize: 14,
    width: '50%',
  },
  infoValue: {
    color: '#76787E',
    fontSize: 14,
    width: '50%',
    fontWeight: '600',
    textAlign: 'right',
  },
  problemText: {
    color: '#FF4444',
    fontSize: 13,
  },
  placeBtn: {
    paddingHorizontal: vw(5),
    paddingVertical: vh(2),
    borderRadius: 16,
    marginBottom: vh(4),
  },
});
