import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface SelectionCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: MCIName;
  iconColor?: string;
  selected: boolean;
  onPress: () => void;
  trailing?: string;
}

export default function SelectionCard({
  title,
  subtitle,
  description,
  icon,
  iconColor = colors.primary,
  selected,
  onPress,
  trailing,
}: SelectionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
    >
      {icon !== undefined && (
        <View
          style={[
            styles.iconBox,
            { backgroundColor: (selected ? colors.primary : iconColor) + '1A' },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={selected ? colors.primary : iconColor}
          />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, selected && styles.titleSelected]} numberOfLines={1}>
            {title}
          </Text>
          {trailing !== undefined && <Text style={styles.trailing}>{trailing}</Text>}
        </View>
        {subtitle !== undefined && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        {description !== undefined && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>

      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  titleSelected: {
    color: colors.textPrimary,
  },
  trailing: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
