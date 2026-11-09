import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {vw} from '../services/styleSheet';
import {useI18n} from '../services/i18n';

// The standard reminder that every trade and result in the app is a
// simulation with virtual money, shown wherever trades or results appear.
// `detail` adds a line specific to that screen.
const SimulatedBanner: React.FC<{detail?: string}> = ({detail}) => {
  const {t} = useI18n();
  return (
    <View testID="simulated-banner" style={styles.container}>
      <Text style={styles.title}>{t('common.simulatedNote')}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
};

export default SimulatedBanner;

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: 'rgba(255, 237, 75, 0.35)',
    backgroundColor: 'rgba(255, 237, 75, 0.08)',
    borderRadius: 12,
    paddingHorizontal: vw(4),
    paddingVertical: 10,
    rowGap: 4,
  },
  title: {
    color: '#FFED4B',
    fontSize: 13,
    fontWeight: '600',
  },
  detail: {
    color: '#B0B0B0',
    fontSize: 12,
    lineHeight: 17,
  },
});
