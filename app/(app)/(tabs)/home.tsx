import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatCard from '@/src/components/StatCard';
import ProjectCard from '@/src/components/ProjectCard';
import IssueCard from '@/src/components/IssueCard';
import DailyReportCard from '@/src/components/DailyReportCard';
import SectionHeader from '@/src/components/SectionHeader';
import { colors } from '@/src/theme/colors';
import { PROJECTS } from '@/src/data/projects';
import { useIssues } from '@/src/context/IssueContext';
import { useDailyReports } from '@/src/context/DailyReportContext';
import { getTodayISODate } from '@/src/utils/date';

interface PriorityItem {
  id: string;
  task: string;
  project: string;
  statusLabel: string;
  statusColor: string;
  dotColor: string;
}

const PRIORITIES: PriorityItem[] = [
  {
    id: '1',
    task: 'Inspect concrete work',
    project: 'Nova Residence · Block A',
    statusLabel: 'High priority',
    statusColor: colors.danger,
    dotColor: colors.danger,
  },
  {
    id: '2',
    task: 'Review safety checklist',
    project: 'Atlas Business Center',
    statusLabel: 'Due at 14:30',
    statusColor: colors.warning,
    dotColor: colors.warning,
  },
  {
    id: '3',
    task: 'Approve defect repair',
    project: 'Nova Residence · Floor 4',
    statusLabel: 'Waiting approval',
    statusColor: colors.textSecondary,
    dotColor: colors.border,
  },
];

const RECENT_PROJECTS = PROJECTS.slice(0, 2);

const PROJECT_NAMES: Record<string, string> = PROJECTS.reduce<Record<string, string>>(
  (acc, p) => {
    acc[p.id] = p.name;
    return acc;
  },
  {},
);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { issues, getOpenIssueCount } = useIssues();
  const { getLatestReports, getTotalWorkersForDate } = useDailyReports();

  const openIssueCount = getOpenIssueCount();
  const workersToday = getTotalWorkersForDate(getTodayISODate());
  const recentIssues = useMemo(
    () =>
      [...issues]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3),
    [issues],
  );
  const recentReports = useMemo(() => getLatestReports(2), [getLatestReports]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={[colors.surface, colors.background]}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerTop}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>Berke</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>Site Engineer</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.notificationWrapper}>
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.7}
                accessibilityLabel="Notifications"
                onPress={() => router.push('/notifications')}
              >
                <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.notificationDot} />
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>BD</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stat Cards */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Active Projects"
            value={4}
            icon={<MaterialCommunityIcons name="briefcase-outline" size={22} color={colors.success} />}
            iconBg={colors.success + '22'}
          />
          <StatCard
            title="Open Issues"
            value={openIssueCount}
            icon={<MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.danger} />}
            iconBg={colors.danger + '22'}
            onPress={() => router.push('/issues')}
          />
          <StatCard
            title="Workers Today"
            value={workersToday}
            icon={<MaterialCommunityIcons name="account-group-outline" size={22} color={colors.primary} />}
            iconBg={colors.primary + '22'}
            onPress={() => router.push('/daily-reports')}
          />
          <StatCard
            title="Safety Alerts"
            value={2}
            icon={<MaterialCommunityIcons name="shield-alert-outline" size={22} color={colors.danger} />}
            iconBg={colors.danger + '22'}
          />
        </View>

        {/* Today's Priorities */}
        <View style={styles.section}>
          <SectionHeader title={"Today's Priorities"} />
          <View style={styles.priorityList}>
            {PRIORITIES.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.priorityItem,
                  index === PRIORITIES.length - 1 && styles.priorityItemLast,
                ]}
              >
                <View style={[styles.priorityDot, { backgroundColor: item.dotColor }]} />
                <View style={styles.priorityBody}>
                  <Text style={styles.priorityTask}>{item.task}</Text>
                  <Text style={styles.priorityProject}>{item.project}</Text>
                </View>
                <View style={[styles.priorityBadge, { borderColor: item.statusColor + '50' }]}>
                  <Text style={[styles.priorityBadgeText, { color: item.statusColor }]}>
                    {item.statusLabel}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Issues */}
        {recentIssues.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Recent Issues"
              action={
                <TouchableOpacity onPress={() => router.push('/issues')} activeOpacity={0.7}>
                  <Text style={styles.viewAllLink}>View All</Text>
                </TouchableOpacity>
              }
            />
            {recentIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                projectName={PROJECT_NAMES[issue.projectId] ?? 'Unknown Project'}
                compact
                onPress={() =>
                  router.push({ pathname: '/issues/[id]', params: { id: issue.id } })
                }
              />
            ))}
          </View>
        )}

        {/* Daily Site Reports */}
        {recentReports.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Daily Site Reports"
              action={
                <TouchableOpacity onPress={() => router.push('/daily-reports')} activeOpacity={0.7}>
                  <Text style={styles.viewAllLink}>View All</Text>
                </TouchableOpacity>
              }
            />
            {recentReports.map((report) => (
              <DailyReportCard
                key={report.id}
                report={report}
                projectName={PROJECT_NAMES[report.projectId] ?? 'Unknown Project'}
                compact
                onPress={() =>
                  router.push({ pathname: '/daily-reports/[id]', params: { id: report.id } })
                }
              />
            ))}
          </View>
        )}

        {/* Recent Projects */}
        <View style={styles.section}>
          <SectionHeader title="Recent Projects" />
          {RECENT_PROJECTS.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              compact
              onPress={() =>
                router.push({ pathname: '/projects/[id]', params: { id: project.id } })
              }
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingBlock: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  notificationWrapper: {
    position: 'relative',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surfaceSecondary,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  section: {
    marginBottom: 24,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  priorityList: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  priorityItemLast: {
    borderBottomWidth: 0,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  priorityBody: {
    flex: 1,
    gap: 3,
  },
  priorityTask: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  priorityProject: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priorityBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
