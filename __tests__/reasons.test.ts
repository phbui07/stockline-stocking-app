import {translate} from '../services/i18n';
import {describeReason, describeStrategy} from '../services/reasons';
import {maCrossover} from '../services/engine/strategies/maCrossover';

// describeReason builds some translation keys from pieces, which the type
// checker can't verify, so check every combination resolves to a sentence.
describe.each(['en', 'vi'] as const)('reasons in %s', lang => {
  const t = (key: any, params?: any) => translate(lang, key, params);

  it('describes every moving-average signal', () => {
    for (const code of ['maBuy', 'maSell']) {
      for (const mode of ['price', 'cross']) {
        for (const buffer of [0, 2]) {
          const text = describeReason(
            {code, params: {mode, fast: 20, slow: 50, buffer}},
            t,
          );
          expect(text).not.toMatch(/^reason\.|\{/); // no raw key or placeholder
          expect(text).toContain('50');
        }
      }
    }
  });

  it('describes a strategy’s settings', () => {
    const text = describeStrategy(
      {
        ...maCrossover.defaults,
        bufferPercent: 2,
        trendFilter: true,
      },
      t,
    );
    expect(text).toMatch(/20\/50/);
    expect(text).toMatch(/2%/);
    expect(text).toMatch(/200/);
  });
});

it('reads naturally in English', () => {
  const t = (key: any, params?: any) => translate('en', key, params);
  expect(
    describeReason(
      {code: 'maSell', params: {mode: 'price', fast: 20, slow: 20, buffer: 0}},
      t,
    ),
  ).toBe('Sold: price closed below its 20-day average');
  expect(
    describeReason(
      {code: 'maBuy', params: {mode: 'cross', fast: 20, slow: 50, buffer: 2}},
      t,
    ),
  ).toBe(
    'Bought: the 20-day average rose more than 2% above the 50-day average',
  );
});
