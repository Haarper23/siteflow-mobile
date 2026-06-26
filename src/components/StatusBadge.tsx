import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ProjectStatus } from '@/src/types/project';
import { colors } from '@/src/theme/colors';

interface StatusConfig {
  label: string;
  color: string;
}

const STATUS_MAP: Record<ProjectStatus, StatusConfig> = {
  ON_TRACK: { label: 'On Track', color: colors.success },
  AT_RISK: { label: 'At Risk', color: colors.atRisk },
  DELAYED: { label: 'Delayed', color: colors.danger },
  COMPLETED: { label: 'Completed', color: colors.textSecondary },
};

interface StatusBadgeProps {
  status: ProjectStatus;
  size?: 'small' | 'medium';
}

export default function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const { label, color } = STATUS_MAP[status];
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { borderColor: color + '60', backgroundColor: color + '18' },
        isSmall && styles.badgeSmall,
      ]}
    >
      <Text style={[styles.text, { color }, isSmall && styles.textSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  textSmall: {
    fontSize: 11,
  },
});
