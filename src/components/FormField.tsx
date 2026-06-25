import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors } from '@/src/theme/colors';

interface FormFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  multiline?: boolean;
}

export default function FormField({
  label,
  error,
  hint,
  required = false,
  multiline = false,
  ...inputProps
}: FormFieldProps) {
  const hasError = error !== undefined && error !== '';

  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.requiredMark}>*</Text>}
      </View>
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          hasError && styles.inputError,
        ]}
        placeholderTextColor={colors.textSecondary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...inputProps}
      />
      {hasError ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint !== undefined ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  requiredMark: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 50,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputMultiline: {
    minHeight: 110,
    paddingTop: 14,
    paddingBottom: 14,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 6,
    marginLeft: 2,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    marginLeft: 2,
  },
});
