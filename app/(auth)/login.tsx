import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrandLogo from '@/src/components/BrandLogo';
import { colors } from '@/src/theme/colors';

const DEMO_EMAIL = 'demo@siteflow.ai';
const DEMO_PASSWORD = 'Demo123!';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
  };

  const handleLogin = async () => {
    clearErrors();

    let hasError = false;

    if (!email.trim()) {
      setEmailError('Email is required');
      hasError = true;
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);

    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    if (email.trim() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      router.replace('/home');
    } else {
      setLoading(false);
      setGeneralError('Invalid email or password');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <BrandLogo variant="small" />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.description}>
            Sign in to manage your construction projects and field operations.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email address</Text>
            <View style={[styles.inputWrapper, emailError ? styles.inputError : undefined]}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={emailError ? colors.danger : colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (emailError) setEmailError('');
                  if (generalError) setGeneralError('');
                }}
                placeholder="you@company.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
            {emailError !== '' && <Text style={styles.fieldError}>{emailError}</Text>}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputWrapper, passwordError ? styles.inputError : undefined]}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={passwordError ? colors.danger : colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (passwordError) setPasswordError('');
                  if (generalError) setGeneralError('');
                }}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {passwordError !== '' && <Text style={styles.fieldError}>{passwordError}</Text>}
          </View>

          {/* General error */}
          {generalError !== '' && (
            <View style={styles.generalErrorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.generalErrorText}>{generalError}</Text>
            </View>
          )}

          {/* Sign In button */}
          <TouchableOpacity
            style={[styles.signInButton, loading && styles.signInButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Demo account card */}
        <View style={styles.demoCard}>
          <View style={styles.demoCardHeader}>
            <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
            <Text style={styles.demoCardTitle}>Demo Account</Text>
          </View>
          <View style={styles.demoCardRow}>
            <Text style={styles.demoLabel}>Email</Text>
            <Text style={styles.demoValue}>{DEMO_EMAIL}</Text>
          </View>
          <View style={styles.demoCardRow}>
            <Text style={styles.demoLabel}>Password</Text>
            <Text style={styles.demoValue}>{DEMO_PASSWORD}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Built for modern construction teams</Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 36,
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
  form: {
    gap: 4,
    marginBottom: 28,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: colors.textPrimary,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 6,
  },
  fieldError: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 6,
    marginLeft: 2,
  },
  generalErrorBox: {
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
  generalErrorText: {
    fontSize: 13,
    color: colors.danger,
    flex: 1,
  },
  signInButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.3,
  },
  demoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    padding: 16,
    gap: 10,
    marginBottom: 32,
  },
  demoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  demoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.2,
  },
  demoCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  demoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  demoValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 'auto',
  },
});
