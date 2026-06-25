import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { IssueStatus } from '@/src/types/issue';
import { colors } from '@/src/theme/colors';

interface StatusConfig {
  label: string;
  color: string;
}

const STATUS_MAP: Record<IssueStatus, StatusConfig> = {
  DRAFT: { label: 'Draft', color: colors.textSecondary },
  OPEN: { label: 'Open', color: colors.danger },
  IN_PROGRESS: { label: 'In Progress', color: colors.primary },
  WAITING_APPROVAL: { label: 'Waiting Approval', color: '#5AA9FF' },
  RESOLVED: { label: 'Resolved', color: colors.success },
  CLOSED: { label: 'Closed', color: colors.textSecondary },
};

interface IssueStatusBadgeProps {
  status: IssueStatus;
  size?: 'small' | 'medium';
}

export default function IssueStatusBadge({ status, size = 'medium' }: IssueStatusBadgeProps) {
  const { label, color } = STATUS_MAP[status];
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { borderColor: color + '60', backgroundColor: color + '18' },
        isSmall && styles.badgeSmall,
      ]}
      accessibilityLabel={`Status: ${label}`}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }, isSmall && styles.textSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
