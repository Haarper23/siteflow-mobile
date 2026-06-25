import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusBadge from '@/src/components/StatusBadge';
import ProgressBar from '@/src/components/ProgressBar';
import SectionHeader from '@/src/components/SectionHeader';
import DailyReportCard from '@/src/components/DailyReportCard';
import { colors } from '@/src/theme/colors';
import { PROJECTS } from '@/src/data/projects';
import { useIssues } from '@/src/context/IssueContext';
import { useDailyReports } from '@/src/context/DailyReportContext';
import type { ActivityType, ProjectBlock, ProjectActivity } from '@/src/types/project';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function getActivityIcon(type: ActivityType): { icon: MCIName; color: string } {
  switch (type) {
    case 'ISSUE_REPORTED':
      return { icon: 'alert-circle-outline', color: colors.danger };
    case 'TASK_COMPLETED':
      return { icon: 'check-circle-outline', color: colors.success };
    case 'SAFETY_INSPECTION':
      return { icon: 'shield-check-outline', color: colors.warning };
    case 'DAILY_REPORT':
      return { icon: 'clipboard-text-outline', color: colors.textSecondary };
    case 'MATERIAL_DELIVERY':
      return { icon: 'truck-delivery-outline', color: colors.primary };
  }
}

function showActionAlert(action: string) {
  Alert.alert(
    action,
    'This module will be implemented in the next development phase.',
    [{ text: 'OK', style: 'default' }],
  );
}

interface MetricTileProps {
  icon: MCIName;
  iconColor: string;
  value: number;
  label: string;
}

function MetricTile({ icon, iconColor, value, label }: MetricTileProps) {
  return (
    <View style={styles.metricTile}>
      <View style={[styles.metricIcon, { backgroundColor: iconColor + '1A' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

interface BlockCardProps {
  block: ProjectBlock;
}

function BlockCard({ block }: BlockCardProps) {
  return (
    <View style={styles.blockCard}>
      <View style={styles.blockHeader}>
        <View>
          <Text style={styles.blockName}>{block.name}</Text>
          <Text style={styles.blockMeta}>{block.floorCount} floors</Text>
        </View>
        <View style={styles.blockRight}>
          <Text style={styles.blockProgress}>{block.progress}%</Text>
          {block.openIssueCount > 0 && (
            <View style={styles.blockIssueBadge}>
              <Text style={styles.blockIssueText}>{block.openIssueCount} issues</Text>
            </View>
          )}
        </View>
      </View>
      <ProgressBar progress={block.progress} height={4} />
    </View>
  );
}

interface ActivityItemProps {
  activity: ProjectActivity;
  isLast: boolean;
}

function ActivityItem({ activity, isLast }: ActivityItemProps) {
  const { icon, color } = getActivityIcon(activity.type);
  return (
    <View style={[styles.activityItem, isLast && styles.activityItemLast]}>
      <View style={[styles.activityIcon, { backgroundColor: color + '1A' }]}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
      </View>
      <View style={styles.activityBody}>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.activityDesc} numberOfLines={2}>
          {activity.description}
        </Text>
        <Text style={styles.activityTime}>{activity.time}</Text>
      </View>
    </View>
  );
}

export default function ProjectDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getOpenIssueCount } = useIssues();
  const { getReportsByProject, getTodayReportForProject } = useDailyReports();
  const project = PROJECTS.find((p) => p.id === id);

  if (!project) {
    return (
      <View style={[styles.notFound, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 16 }]}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <MaterialCommunityIcons name="office-building-remove-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.notFoundTitle}>Project not found</Text>
        <Text style={styles.notFoundDesc}>
          The project you are looking for does not exist or has been removed.
        </Text>
        <TouchableOpacity
          style={styles.notFoundBtn}
          onPress={() => router.replace('/projects')}
        >
          <Text style={styles.notFoundBtnText}>Back to Projects</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const projectOpenIssues = getOpenIssueCount(project.id);
  const projectReports = getReportsByProject(project.id);
  const recentProjectReports = [...projectReports]
    .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
    .slice(0, 2);
  const todayReport = getTodayReportForProject(project.id);

  const QUICK_ACTIONS: { label: string; icon: MCIName; onPress: () => void }[] = [
    {
      label: 'New Issue',
      icon: 'alert-plus-outline',
      onPress: () =>
        router.push({ pathname: '/issues/new', params: { projectId: project.id } }),
    },
    {
      label: todayReport ? "View Today's Report" : 'Daily Report',
      icon: 'clipboard-plus-outline',
      onPress: () => {
        if (todayReport) {
          router.push({ pathname: '/daily-reports/[id]', params: { id: todayReport.id } });
        } else {
          router.push({ pathname: '/daily-reports/new', params: { projectId: project.id } });
        }
      },
    },
    {
      label: 'Site Photos',
      icon: 'camera-outline',
      onPress: () => showActionAlert('Site Photos'),
    },
    {
      label: 'Team',
      icon: 'account-group-outline',
      onPress: () => showActionAlert('Team'),
    },
  ];

  return (
    <View style={styles.screen}>
      {/* Custom Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{project.code}</Text>
          </View>
        </View>

        <Text style={styles.projectName} numberOfLines={2}>
          {project.name}
        </Text>

        <View style={styles.headerMeta}>
          <StatusBadge status={project.status} />
          <View style={styles.locationChip}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.locationText}>
              {project.district}, {project.city}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewTop}>
            <View>
              <Text style={styles.overviewPercent}>{project.progress}%</Text>
              <Text style={styles.overviewPercentLabel}>Overall Completion</Text>
            </View>
            <View style={styles.overviewDates}>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Start date</Text>
                <Text style={styles.dateValue}>{project.startDate}</Text>
              </View>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Target date</Text>
                <Text style={styles.dateValue}>{project.targetDate}</Text>
              </View>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Manager</Text>
                <Text style={styles.dateValue}>{project.managerName}</Text>
              </View>
            </View>
          </View>
          <ProgressBar progress={project.progress} height={7} />
        </View>

        {/* Description */}
        <View style={styles.descCard}>
          <Text style={styles.descText}>{project.description}</Text>
        </View>

        {/* Metrics */}
        <View style={styles.section}>
          <SectionHeader title="Site Overview" />
          <View style={styles.metricsRow}>
            <MetricTile
              icon="alert-circle-outline"
              iconColor={colors.danger}
              value={projectOpenIssues}
              label="Open Issues"
            />
            <MetricTile
              icon="clock-alert-outline"
              iconColor={colors.warning}
              value={project.overdueTaskCount}
              label="Overdue Tasks"
            />
            <MetricTile
              icon="shield-alert-outline"
              iconColor={colors.danger}
              value={project.safetyAlertCount}
              label="Safety Alerts"
            />
            <MetricTile
              icon="account-hard-hat-outline"
              iconColor={colors.success}
              value={project.activeWorkerCount}
              label="Workers"
            />
          </View>

          <TouchableOpacity
            style={styles.viewIssuesBtn}
            activeOpacity={0.8}
            onPress={() =>
              router.push({ pathname: '/issues', params: { projectId: project.id } })
            }
            accessibilityLabel="View all issues for this project"
          >
            <MaterialCommunityIcons name="format-list-bulleted" size={18} color={colors.primary} />
            <Text style={styles.viewIssuesText}>View All Issues</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <SectionHeader title="Quick Actions" />
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionBtn}
                activeOpacity={0.75}
                onPress={action.onPress}
              >
                <MaterialCommunityIcons name={action.icon} size={24} color={colors.primary} />
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Daily Reports */}
        <View style={styles.section}>
          <SectionHeader
            title="Daily Reports"
            action={
              <TouchableOpacity
                onPress={() =>
                  router.push({ pathname: '/daily-reports', params: { projectId: project.id } })
                }
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllLink}>View All Reports</Text>
              </TouchableOpacity>
            }
          />
          {recentProjectReports.length > 0 ? (
            recentProjectReports.map((report) => (
              <DailyReportCard
                key={report.id}
                report={report}
                projectName={project.name}
                compact
                onPress={() =>
                  router.push({ pathname: '/daily-reports/[id]', params: { id: report.id } })
                }
              />
            ))
          ) : (
            <TouchableOpacity
              style={styles.emptyReportsCard}
              activeOpacity={0.8}
              onPress={() =>
                router.push({ pathname: '/daily-reports/new', params: { projectId: project.id } })
              }
            >
              <MaterialCommunityIcons name="clipboard-plus-outline" size={20} color={colors.primary} />
              <Text style={styles.emptyReportsText}>
                No daily reports yet. Create the first one.
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Blocks */}
        <View style={styles.section}>
          <SectionHeader title="Blocks and Areas" />
          {project.blocks.map((block) => (
            <BlockCard key={block.id} block={block} />
          ))}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <SectionHeader title="Recent Activity" />
          <View style={styles.activityList}>
            {project.recentActivity.map((act, index) => (
              <ActivityItem
                key={act.id}
                activity={act}
                isLast={index === project.recentActivity.length - 1}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBadge: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  projectName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  overviewCard: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  overviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  overviewPercent: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 44,
  },
  overviewPercentLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overviewDates: {
    gap: 6,
    alignItems: 'flex-end',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  descCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  viewIssuesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  viewIssuesText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyReportsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 16,
  },
  emptyReportsText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  metricTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  blockCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  blockName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  blockMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  blockRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  blockProgress: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  blockIssueBadge: {
    backgroundColor: colors.danger + '20',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  blockIssueText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
  },
  activityList: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'flex-start',
  },
  activityItemLast: {
    borderBottomWidth: 0,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  activityBody: {
    flex: 1,
    gap: 3,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  activityDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  activityTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notFound: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  notFoundDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  notFoundBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notFoundBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
