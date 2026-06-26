import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor: string;
}

const REPORT_TYPES: ReportType[] = [
  {
    id: 'daily',
    title: 'Daily Site Report',
    description: 'Record workforce, completed work items and overall site conditions for the day.',
    icon: 'clipboard-text-outline',
    iconColor: colors.success,
  },
  {
    id: 'defect',
    title: 'Defect Report',
    description: 'Capture construction defects with photos, location data and severity assessment.',
    icon: 'alert-circle-outline',
    iconColor: colors.danger,
  },
  {
    id: 'safety',
    title: 'Safety Observation',
    description: 'Report workplace hazards and safety violations for immediate corrective action.',
    icon: 'shield-alert-outline',
    iconColor: colors.warning,
  },
];

function handleSelectReport(id: string) {
  switch (id) {
    case 'defect':
      router.push('/issues/new');
      break;
    case 'safety':
      router.push({ pathname: '/issues/new', params: { category: 'SAFETY' } });
      break;
    case 'daily':
      router.push('/daily-reports/new');
      break;
    default:
      break;
  }
}

export default function ReportScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Create Report</Text>
        <Text style={styles.headerSubtitle}>
          Document site progress, defects and safety observations.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Select report type</Text>

        {REPORT_TYPES.map((rt) => (
          <TouchableOpacity
            key={rt.id}
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => handleSelectReport(rt.id)}
          >
            <View style={[styles.cardIcon, { backgroundColor: rt.iconColor + '1A' }]}>
              <MaterialCommunityIcons name={rt.icon} size={28} color={rt.iconColor} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{rt.title}</Text>
              <Text style={styles.cardDesc}>{rt.description}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.viewAllButton}
          activeOpacity={0.75}
          onPress={() => router.push('/daily-reports')}
          accessibilityLabel="View daily reports"
        >
          <MaterialCommunityIcons name="clipboard-text-outline" size={18} color={colors.primary} />
          <Text style={styles.viewAllText}>View Daily Reports</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewAllButton}
          activeOpacity={0.75}
          onPress={() => router.push('/issues')}
          accessibilityLabel="View all issues"
        >
          <MaterialCommunityIcons name="format-list-bulleted" size={18} color={colors.primary} />
          <Text style={styles.viewAllText}>View All Issues</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Reports are saved on this device. Server sync and attachments will arrive in a future
            update.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  viewAllText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
