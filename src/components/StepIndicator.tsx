import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number; // zero-based index
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <View>
      <View style={styles.row}>
        {steps.map((label, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={label}>
              <View
                style={[
                  styles.circle,
                  isCompleted && styles.circleCompleted,
                  isActive && styles.circleActive,
                ]}
                accessibilityLabel={`Step ${index + 1}: ${label}${
                  isActive ? ' (current)' : isCompleted ? ' (completed)' : ''
                }`}
              >
                {isCompleted ? (
                  <MaterialCommunityIcons name="check" size={14} color={colors.background} />
                ) : (
                  <Text style={[styles.circleText, isActive && styles.circleTextActive]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              {!isLast && (
                <View style={[styles.connector, isCompleted && styles.connectorCompleted]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
      <Text style={styles.stepLabel}>
        Step {currentStep + 1} of {steps.length} · {steps[currentStep]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  circleCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  circleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  circleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  circleTextActive: {
    color: colors.primary,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  connectorCompleted: {
    backgroundColor: colors.primary,
  },
  stepLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
