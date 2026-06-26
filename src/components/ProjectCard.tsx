import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { Project, ProjectStatus } from '@/src/types/project';
import { colors } from '@/src/theme/colors';
import ProgressBar from '@/src/components/ProgressBar';
import StatusBadge from '@/src/components/StatusBadge';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function getAccentColor(status: ProjectStatus): string {
  switch (status) {
    case 'ON_TRACK':
      return colors.success;
    case 'AT_RISK':
      return colors.atRisk;
    case 'DELAYED':
      return colors.danger;
    case 'COMPLETED':
      return colors.textSecondary;
  }
}

interface ProjectCardProps {
  project: Project;
  compact?: boolean;
  onPress?: () => void;
}

export default function ProjectCard({ project, compact = false, onPress }: ProjectCardProps) {
  const accent = getAccentColor(project.status);
  const initials = getInitials(project.name);

  if (compact) {
    return (
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
        <View style={styles.cardHeader}>
          <View style={[styles.initialsBox, { backgroundColor: accent + '22', borderColor: accent + '44' }]}>
            <Text style={[styles.initials, { color: accent }]}>{initials}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {project.name}
            </Text>
            <Text style={styles.location} numberOfLines={1}>
              {project.city}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
        <ProgressBar progress={project.progress} showLabel />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <View style={[styles.initialsBox, { backgroundColor: accent + '22', borderColor: accent + '44' }]}>
          <Text style={[styles.initials, { color: accent }]}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {project.name}
            </Text>
          </View>
          <Text style={styles.codeText}>{project.code}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>

      <View style={styles.locationRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.textSecondary} />
        <Text style={styles.locationText} numberOfLines={1}>
          {project.district}, {project.city}
        </Text>
      </View>

      <View style={styles.badgeRow}>
        <StatusBadge status={project.status} size="small" />
      </View>

      <ProgressBar progress={project.progress} showLabel height={5} />

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="alert-circle-outline" size={13} color={colors.danger} />
          <Text style={[styles.metaText, { color: colors.danger }]}>{project.openIssueCount} issues</Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="clock-outline" size={13} color={colors.warning} />
          <Text style={[styles.metaText, { color: colors.warning }]}>{project.overdueTaskCount} overdue</Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="account-hard-hat-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.metaText}>{project.activeWorkerCount} workers</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  initialsBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initials: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  codeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  location: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
