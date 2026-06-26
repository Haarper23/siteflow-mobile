import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import type { ConstructionIssue } from '@/src/types/issue';
import { colors } from '@/src/theme/colors';
import { formatDisplayDate } from '@/src/utils/date';
import { getCategoryVisual } from '@/src/utils/issueDisplay';
import SeverityBadge from '@/src/components/SeverityBadge';
import IssueStatusBadge from '@/src/components/IssueStatusBadge';

interface IssueCardProps {
  issue: ConstructionIssue;
  projectName: string;
  onPress: () => void;
  compact?: boolean;
}

function IssueCard({ issue, projectName, onPress, compact = false }: IssueCardProps) {
  const visual = getCategoryVisual(issue.category);
  const isCritical = issue.severity === 'CRITICAL' && !issue.isDraft;

  return (
    <TouchableOpacity
      style={[styles.card, isCritical && styles.cardCritical]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={
        issue.isDraft ? `Draft: ${issue.title || 'Untitled report'}` : `Issue ${issue.referenceNumber}: ${issue.title}`
      }
    >
      <View style={styles.topRow}>
        <View style={[styles.categoryIcon, { backgroundColor: visual.color + '1A' }]}>
          <MaterialCommunityIcons name={visual.icon} size={18} color={visual.color} />
        </View>
        <View style={styles.topText}>
          <View style={styles.refRow}>
            {issue.isDraft ? (
              <View style={styles.draftPill}>
                <MaterialCommunityIcons name="pencil-outline" size={11} color={colors.primary} />
                <Text style={styles.draftPillText}>Draft</Text>
              </View>
            ) : (
              <Text style={styles.reference}>{issue.referenceNumber}</Text>
            )}
          </View>
          <Text style={styles.title} numberOfLines={compact ? 1 : 2}>
            {issue.title || 'Untitled report'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>

      <View style={styles.metaRow}>
        <MaterialCommunityIcons name="office-building-outline" size={13} color={colors.textSecondary} />
        <Text style={styles.metaText} numberOfLines={1}>
          {projectName}
        </Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText} numberOfLines={1}>
          {issue.blockName} · Floor {issue.floor}
        </Text>
      </View>

      {!compact && (
        <View style={styles.badgeRow}>
          <SeverityBadge severity={issue.severity} size="small" />
          <IssueStatusBadge status={issue.status} size="small" />
          {issue.photos.length > 0 && (
            <View style={styles.photoChip}>
              <Ionicons name="image-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.photoChipText}>{issue.photos.length}</Text>
            </View>
          )}
        </View>
      )}

      {compact && (
        <View style={styles.badgeRow}>
          <SeverityBadge severity={issue.severity} size="small" />
          <IssueStatusBadge status={issue.status} size="small" />
        </View>
      )}

      {!compact && (
        <View style={styles.footerRow}>
          <View style={styles.footerItem}>
            <MaterialCommunityIcons name="account-hard-hat-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.footerText} numberOfLines={1}>
              {issue.assignedTeam}
            </Text>
          </View>
          <Text style={styles.footerDate}>{formatDisplayDate(issue.createdAt)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Memoized: a list row re-renders only when its own props change, not on every
// parent render. Props are value/stable-id based, so the default shallow
// comparison is correct.
export default React.memo(IssueCard);

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
  cardCritical: {
    borderColor: colors.danger + '70',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  categoryIcon: {
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
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  photoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  photoChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  footerDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
