import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

interface BrandLogoProps {
  variant?: 'small' | 'large';
}

export default function BrandLogo({ variant = 'large' }: BrandLogoProps) {
  if (variant === 'large') {
    return (
      <View style={styles.largeContainer}>
        <View style={styles.largeIconBox}>
          <MaterialCommunityIcons name="hard-hat" size={42} color={colors.primary} />
        </View>
        <Text style={styles.largeBrandName}>SiteFlow AI</Text>
        <Text style={styles.largeTagline}>Build smarter. Manage better.</Text>
      </View>
    );
  }

  return (
    <View style={styles.smallContainer}>
      <View style={styles.smallIconBox}>
        <MaterialCommunityIcons name="hard-hat" size={20} color={colors.primary} />
      </View>
      <Text style={styles.smallBrandName}>SiteFlow AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  largeContainer: {
    alignItems: 'center',
  },
  largeIconBox: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  largeBrandName: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  largeTagline: {
    fontSize: 15,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  smallContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smallIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBrandName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
});
