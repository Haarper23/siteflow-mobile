import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandLogo from '@/src/components/BrandLogo';
import { colors } from '@/src/theme/colors';
import { useAuth } from '@/src/context/AuthContext';

/**
 * Demo entry screen.
 *
 * SiteFlow AI has no backend yet, so this screen does NOT pretend to
 * authenticate a real account. There is no email/password credential check —
 * the single action starts a clearly-labelled local demo session. Real
 * email/password sign-in will be added when the backend exists.
 */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInDemo } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (loading) return;
    setError('');
    setLoading(true);

    const result = await signInDemo();
    if (result.ok) {
      router.replace('/home');
      return;
    }

    // Safe, generic message only — no storage/technical details are surfaced.
    setLoading(false);
    setError(result.message);
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <BrandLogo variant="small" />
        <Text style={styles.title}>Welcome to SiteFlow AI</Text>
        <Text style={styles.description}>
          Manage construction issues and daily site reports from the field.
        </Text>
      </View>

      {/* Demo-mode notice */}
      <View style={styles.noticeCard}>
        <View style={styles.noticeHeader}>
          <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
          <Text style={styles.noticeTitle}>Local demo mode</Text>
        </View>
        <Text style={styles.noticeBody}>
          This is a local portfolio demo session on this device. No company
          account or server sign-in is used yet — production authentication will
          be provided by the backend.
        </Text>
      </View>

      {/* General error */}
      {error !== '' && (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Continue in Demo Mode */}
      <TouchableOpacity
        style={[styles.continueButton, loading && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={loading}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Continue in demo mode"
        accessibilityState={{ disabled: loading, busy: loading }}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} size="small" />
        ) : (
          <Text style={styles.continueButtonText}>Continue in Demo Mode</Text>
        )}
      </TouchableOpacity>

      {/* Footer */}
      <Text style={styles.footer}>Built for modern construction teams</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginTop: 8,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  noticeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    padding: 16,
    gap: 10,
    marginBottom: 24,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  noticeBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger + '60',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    flex: 1,
  },
  continueButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.3,
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 'auto',
    paddingTop: 32,
  },
});
