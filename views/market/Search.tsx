import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import React, {useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {container, vh, vw} from '../../services/styleSheet';
import {viewIcon} from '../../assets/svgXML';
import {useQuotes} from '../../services/quoteStore';
import {useUserData} from '../../services/userData';
import {useSymbolSearch} from '../../services/useSymbolSearch';
import {TKey, useI18n} from '../../services/i18n';
import {PopularStocks} from '../../services/renderData';
import ScreenHeader from '../../components/ScreenHeader';
import StockRow from '../../components/StockRow';

export type SearchMode =
  | 'view'
  | 'buy'
  | 'sell'
  | 'alert'
  | 'recurring'
  | 'bot';

const TITLES: Record<SearchMode, TKey> = {
  view: 'search.titleView',
  buy: 'search.titleBuy',
  sell: 'search.titleSell',
  alert: 'search.titleAlert',
  recurring: 'search.titleRecurring',
  bot: 'search.titleRecurring', // same wording: "Choose a stock or ETF"
};

// Modes that end in a purchase only list stocks and ETFs.
const BUYING_MODES: SearchMode[] = ['buy', 'recurring', 'bot'];

const Search = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();
  const mode: SearchMode =
    (route.params as {mode?: SearchMode} | undefined)?.mode ?? 'view';
  const {t} = useI18n();
  const {data} = useUserData();
  const [query, setQuery] = useState('');
  // Selling only makes sense for stocks you own, so search those locally.
  const search = useSymbolSearch(mode === 'sell' ? '' : query);

  const holdings = Object.values(data.portfolio.positions).filter(position => {
    const q = query.trim().toLowerCase();
    return (
      !q ||
      position.symbol.toLowerCase().includes(q) ||
      position.name.toLowerCase().includes(q)
    );
  });

  const rows =
    mode === 'sell'
      ? holdings.map(p => ({
          symbol: p.symbol,
          name: p.name,
          subtitle: undefined,
        }))
      : search.active
      ? search.results
          .filter(
            r =>
              !BUYING_MODES.includes(mode) ||
              r.type === 'EQUITY' ||
              r.type === 'ETF',
          )
          .map(r => ({
            symbol: r.symbol,
            name: r.name,
            subtitle: `${r.name} · ${r.exchange}`,
          }))
      : PopularStocks.map(symbol => ({
          symbol,
          name: undefined,
          subtitle: undefined,
        }));

  const {quotes} = useQuotes(rows.map(row => row.symbol));

  const select = (symbol: string) => {
    if (mode === 'buy' || mode === 'sell') {
      navigation.replace('BuyingVerify', {
        symbol,
        side: mode === 'buy' ? 'BUY' : 'SELL',
      });
    } else if (mode === 'alert') {
      navigation.popTo('Alerts', {symbol});
    } else if (mode === 'recurring') {
      navigation.replace('RecurringEdit', {symbol});
    } else if (mode === 'bot') {
      navigation.replace('BotEdit', {symbol});
    } else {
      navigation.navigate('ChartInfor', {symbol});
    }
  };

  const remote = mode !== 'sell' && search.active;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t(TITLES[mode])} />
      <View style={styles.searchBox}>
        {viewIcon(vw(5), vw(5))}
        <TextInput
          testID="search-input"
          style={styles.searchInput}
          placeholder={t('search.placeholder')}
          placeholderTextColor="#76787E"
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled">
        {remote && search.searching ? (
          <ActivityIndicator color="#FFED4B" style={styles.message} />
        ) : remote && search.failed ? (
          <Text style={styles.message}>{t('search.failed')}</Text>
        ) : rows.length === 0 && query.trim() ? (
          <Text style={styles.message}>
            {t('search.noResults', {query: query.trim()})}
          </Text>
        ) : (
          rows.map(row => (
            <StockRow
              key={row.symbol}
              testID={`search-result-${row.symbol}`}
              symbol={row.symbol}
              name={row.name}
              subtitle={row.subtitle}
              quote={quotes[row.symbol]}
              onPress={() => select(row.symbol)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Search;

const styles = StyleSheet.create({
  container: container,
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    borderRadius: vw(3),
    paddingHorizontal: vw(4),
    paddingVertical: vh(1.5),
    columnGap: vw(2),
    marginHorizontal: vw(5),
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  list: {
    paddingHorizontal: vw(5),
    paddingVertical: vh(1),
  },
  message: {
    color: '#76787E',
    textAlign: 'center',
    marginTop: vh(4),
  },
});
