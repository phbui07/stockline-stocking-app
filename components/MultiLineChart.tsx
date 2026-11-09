import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Line, Path, Polygon} from 'react-native-svg';

// A plain chart of several lines over the same days, with optional buy (▲)
// and sell (▼) markers. Built directly on react-native-svg so it's light
// and works in tests. Values can be missing (undefined), such as the first
// days of a moving average, and the line simply starts later.

export interface ChartSeries {
  key: string;
  values: (number | undefined)[];
  color: string;
  width?: number;
  dashed?: boolean;
}

export interface ChartMarker {
  index: number;
  kind: 'buy' | 'sell';
}

interface MultiLineChartProps {
  series: ChartSeries[];
  markers?: ChartMarker[];
  // Which series the markers sit on (default: the first).
  markerSeries?: string;
  width: number;
  height: number;
  formatValue: (value: number) => string;
  startLabel?: string;
  endLabel?: string;
  accessibilityLabel?: string;
}

const MARKER = 6; // half the marker's width, in points
const LABEL_WIDTH = 64; // room on the right for the y-axis labels
// Space at both ends so a marker on the first or last day isn't cut off.
const INSET = MARKER + 1;

const MultiLineChart: React.FC<MultiLineChartProps> = ({
  series,
  markers = [],
  markerSeries,
  width,
  height,
  formatValue,
  startLabel,
  endLabel,
  accessibilityLabel,
}) => {
  const length = Math.max(0, ...series.map(s => s.values.length));
  const all = series.flatMap(s =>
    s.values.filter((v): v is number => v !== undefined),
  );
  if (length < 2 || !all.length) {
    return <View style={{width, height}} />;
  }

  const plotWidth = width - LABEL_WIDTH;
  const min = Math.min(...all);
  const max = Math.max(...all);
  // Leave room above and below for the markers.
  const pad = (max - min) * 0.08 || Math.abs(max) * 0.02 || 1;
  const top = max + pad;
  const bottom = min - pad;
  const x = (i: number) => INSET + (i / (length - 1)) * (plotWidth - 2 * INSET);
  const y = (value: number) => ((top - value) / (top - bottom)) * height;

  // "M" starts a line, "L" continues it. A missing value ends the current
  // stretch, and the next value starts a new one.
  const pathFor = (values: (number | undefined)[]) => {
    let d = '';
    let drawing = false;
    values.forEach((value, i) => {
      if (value === undefined) {
        drawing = false;
        return;
      }
      d += `${drawing ? 'L' : 'M'}${x(i).toFixed(1)},${y(value).toFixed(1)} `;
      drawing = true;
    });
    return d;
  };

  const anchor =
    series.find(s => s.key === markerSeries)?.values ?? series[0].values;

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <View style={styles.row}>
        <Svg width={plotWidth} height={height}>
          {[0, 0.5, 1].map(f => (
            <Line
              key={f}
              x1={0}
              x2={plotWidth}
              y1={f * height}
              y2={f * height}
              stroke="#3A3A3A"
              strokeWidth={1}
            />
          ))}
          {series.map(s => (
            <Path
              key={s.key}
              d={pathFor(s.values)}
              stroke={s.color}
              strokeWidth={s.width ?? 1.5}
              strokeDasharray={s.dashed ? '5,4' : undefined}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {markers.map(marker => {
            const value = anchor[marker.index];
            if (value === undefined) {
              return null;
            }
            const cx = x(marker.index);
            const cy = y(value);
            // Buys point up from below the line, sells point down from above.
            const points =
              marker.kind === 'buy'
                ? `${cx},${cy + 3} ${cx - MARKER},${cy + 3 + MARKER * 1.6} ${
                    cx + MARKER
                  },${cy + 3 + MARKER * 1.6}`
                : `${cx},${cy - 3} ${cx - MARKER},${cy - 3 - MARKER * 1.6} ${
                    cx + MARKER
                  },${cy - 3 - MARKER * 1.6}`;
            return (
              <Polygon
                key={`${marker.kind}-${marker.index}`}
                points={points}
                fill={marker.kind === 'buy' ? '#5DC172' : '#FF4444'}
                stroke="#1A1A1A"
                strokeWidth={1}
              />
            );
          })}
        </Svg>
        <View style={[styles.axis, {height}]}>
          <Text style={styles.axisText}>{formatValue(top)}</Text>
          <Text style={styles.axisText}>{formatValue((top + bottom) / 2)}</Text>
          <Text style={styles.axisText}>{formatValue(bottom)}</Text>
        </View>
      </View>
      {startLabel || endLabel ? (
        <View style={[styles.dates, {width: plotWidth}]}>
          <Text style={styles.axisText}>{startLabel}</Text>
          <Text style={styles.axisText}>{endLabel}</Text>
        </View>
      ) : null}
    </View>
  );
};

export default MultiLineChart;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  axis: {
    width: LABEL_WIDTH,
    justifyContent: 'space-between',
    paddingLeft: 6,
  },
  axisText: {
    color: '#76787E',
    fontSize: 11,
  },
  dates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});
