import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BrandLogo from '@/src/components/BrandLogo';
import { colors } from '@/src/theme/colors';

/**
 * Branded startup state shown while the persisted demo session is being
 * restored. Rendering this (instead of the navigator) until restoration
 * completes prevents a flash of either protected content or the login screen,
 * and ensures navigation never runs before the navigator is mounted.
 */
export function AuthLoadingScreen() {
  return (
    <LinearGradient colors={['#0E131A', colors.background]} style={styles.container}>
      <View style={styles.center}>
        <BrandLogo variant="large" />
      </View>
      <View style={styles.footer}>
        <ActivityIndicator
          color={colors.primary}
          size="small"
          accessibilityLabel="Loading SiteFlow AI"
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingBottom: 56,
    alignItems: 'center',
  },
});
