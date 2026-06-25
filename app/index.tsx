import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import BrandLogo from '@/src/components/BrandLogo';
import { colors } from '@/src/theme/colors';

export default function SplashScreen() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/login');
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <LinearGradient
      colors={['#0E131A', colors.background]}
      style={styles.container}
    >
      <View style={styles.center}>
        <BrandLogo variant="large" />
      </View>
      <View style={styles.footer}>
        <ActivityIndicator color={colors.primary} size="small" />
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
