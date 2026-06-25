import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg?: string;
  status?: string;
  onPress?: () => void;
}

export default function StatCard({ title, value, icon, iconBg, status, onPress }: StatCardProps) {
  const content = (
    <>
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, iconBg ? { backgroundColor: iconBg } : undefined]}>
          {icon}
        </View>
        {onPress !== undefined && (
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {status !== undefined && <Text style={styles.status}>{status}</Text>}
    </>
  );

  if (onPress !== undefined) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${value}`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  status: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
