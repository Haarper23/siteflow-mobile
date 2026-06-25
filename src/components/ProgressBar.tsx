import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/src/theme/colors';

interface ProgressBarProps {
  progress: number;
  height?: number;
  showLabel?: boolean;
}

export default function ProgressBar({ progress, height = 5, showLabel = false }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <View style={showLabel ? styles.wrapperWithLabel : undefined}>
      <View style={[styles.track, { height }]}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>
      {showLabel && <Text style={styles.label}>{clamped}%</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapperWithLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 99,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
});
