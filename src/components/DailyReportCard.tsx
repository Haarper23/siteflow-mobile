import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import type { DailySiteReport } from '@/src/types/dailyReport';
import { WEATHER_LABELS, totalWorkers } from '@/src/types/dailyReport';
import { colors } from '@/src/theme/colors';
import { formatReportDate } from '@/src/utils/date';
import { getWeatherVisual } from '@/src/utils/dailyReportDisplay';
import DailyReportStatusBadge from '@/src/components/DailyReportStatusBadge';

interface DailyReportCardProps {
  report: DailySiteReport;
  projectName: string;
  onPress: () => void;
  compact?: boolean;
}

function DailyReportCard({
  report,
  projectName,
  onPress,
  compact = false,
}: DailyReportCardProps) {
  const weather = getWeatherVisual(report.weather);
  const workers = totalWorkers(report.workforce);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={
        report.isDraft
          ? `Draft daily report for ${projectName}`
          : `Daily report ${report.referenceNumber} for ${projectName}`
      }
    >
      <View style={styles.topRow}>
        <View style={[styles.weatherIcon, { backgroundColor: weather.color + '1A' }]}>
          <MaterialCommunityIcons name={weather.icon} size={20} color={weather.color} />
        </View>
        <View style={styles.topText}>
          <View style={styles.refRow}>
            {report.isDraft ? (
              <View style={styles.draftPill}>
                <MaterialCommunityIcons name="pencil-outline" size={11} color={colors.primary} />
                <Text style={styles.draftPillText}>Draft</Text>
              </View>
            ) : (
              <Text style={styles.reference}>{report.referenceNumber}</Text>
            )}
          </View>
          <Text style={styles.projectName} numberOfLines={1}>
            {projectName}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>

      <View style={styles.metaRow}>
        <MaterialCommunityIcons name="calendar-outline" size={13} color={colors.textSecondary} />
        <Text style={styles.metaText} numberOfLines={1}>
          {formatReportDate(report.reportDate)}
        </Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText} numberOfLines={1}>
          {WEATHER_LABELS[report.weather]}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="account-group-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.statText}>{workers} workers</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="progress-check" size={14} color={colors.textSecondary} />
          <Text style={styles.statText}>{report.activities.length} activities</Text>
        </View>
        {!compact && (
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="truck-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.statText}>{report.materialDeliveries.length} deliveries</Text>
          </View>
        )}
      </View>

      <View style={styles.footerRow}>
        <DailyReportStatusBadge status={report.status} size="small" />
        {report.accidentOccurred && (
          <View style={styles.alertChip}>
            <MaterialCommunityIcons name="alert-octagon-outline" size={12} color={colors.danger} />
            <Text style={styles.alertChipText}>Incident</Text>
          </View>
        )}
        {report.delayOccurred && (
          <View style={styles.delayChip}>
            <MaterialCommunityIcons name="clock-alert-outline" size={12} color={colors.warning} />
            <Text style={styles.delayChipText}>Delay</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Memoized: a list row re-renders only when its own props change, not on every
// parent render. Props are value/stable-id based, so the default shallow
// comparison is correct.
export default React.memo(DailyReportCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  weatherIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  topText: {
    flex: 1,
    gap: 3,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reference: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  draftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary + '1A',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  draftPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  projectName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  metaDot: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  alertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.danger + '1A',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  alertChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
  },
  delayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.warning + '1A',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  delayChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warning,
  },
});
