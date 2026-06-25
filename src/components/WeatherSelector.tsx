import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { WeatherCondition } from '@/src/types/dailyReport';
import { WEATHER_CONDITIONS, WEATHER_LABELS } from '@/src/types/dailyReport';
import { getWeatherVisual } from '@/src/utils/dailyReportDisplay';
import { colors } from '@/src/theme/colors';

interface WeatherSelectorProps {
  value: WeatherCondition | null;
  onChange: (value: WeatherCondition) => void;
}

export default function WeatherSelector({ value, onChange }: WeatherSelectorProps) {
  return (
    <View style={styles.grid}>
      {WEATHER_CONDITIONS.map((condition) => {
        const visual = getWeatherVisual(condition);
        const selected = value === condition;
        return (
          <TouchableOpacity
            key={condition}
            style={[styles.cell, selected && styles.cellSelected]}
            onPress={() => onChange(condition)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={WEATHER_LABELS[condition]}
          >
            <MaterialCommunityIcons
              name={visual.icon}
              size={24}
              color={selected ? colors.primary : visual.color}
            />
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {WEATHER_LABELS[condition]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 8,
  },
  cellSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.textPrimary,
  },
});
