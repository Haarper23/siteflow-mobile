import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { IssueSeverity } from '@/src/types/issue';
import { colors } from '@/src/theme/colors';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface SeverityConfig {
  label: string;
  color: string;
  icon: MCIName;
}

const SEVERITY_MAP: Record<IssueSeverity, SeverityConfig> = {
  LOW: { label: 'Low', color: colors.success, icon: 'chevron-down' },
  MEDIUM: { label: 'Medium', color: colors.warning, icon: 'equal' },
  HIGH: { label: 'High', color: '#F5894A', icon: 'chevron-up' },
  CRITICAL: { label: 'Critical', color: colors.danger, icon: 'alert' },
};

interface SeverityBadgeProps {
  severity: IssueSeverity;
  size?: 'small' | 'medium';
}

export default function SeverityBadge({ severity, size = 'medium' }: SeverityBadgeProps) {
  const { label, color, icon } = SEVERITY_MAP[severity];
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { borderColor: color + '60', backgroundColor: color + '1A' },
        isSmall && styles.badgeSmall,
      ]}
      accessibilityLabel={`Severity: ${label}`}
    >
      <MaterialCommunityIcons name={icon} size={isSmall ? 11 : 13} color={color} />
      <Text style={[styles.text, { color }, isSmall && styles.textSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
