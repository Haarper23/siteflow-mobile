import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IssueCard from '@/src/components/IssueCard';
import EmptyState from '@/src/components/EmptyState';
import { ScreenError } from '@/src/components/ScreenError';
import { colors } from '@/src/theme/colors';
import { PROJECTS } from '@/src/data/projects';
import { useIssues } from '@/src/context/IssueContext';
import type { ConstructionIssue, IssueSeverity } from '@/src/types/issue';

type StatusFilter =
  | 'ALL'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_APPROVAL'
  | 'RESOLVED'
  | 'DRAFTS';

type SeverityFilter = 'ALL' | IssueSeverity;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'WAITING_APPROVAL', label: 'Waiting Approval' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'DRAFTS', label: 'Drafts' },
];

const SEVERITY_FILTERS: { key: SeverityFilter; label: string }[] = [
  { key: 'ALL', label: 'All Severities' },
  { key: 'LOW', label: 'Low' },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'HIGH', label: 'High' },
  { key: 'CRITICAL', label: 'Critical' },
];

const PROJECT_NAMES: Record<string, string> = PROJECTS.reduce<Record<string, string>>(
  (acc, p) => {
    acc[p.id] = p.name;
    return acc;
  },
  {},
);

function projectName(projectId: string): string {
  return PROJECT_NAMES[projectId] ?? 'Unknown Project';
}

interface SummaryTileProps {
  label: string;
  value: number;
  color: string;
}

function SummaryTile({ label, value, color }: SummaryTileProps) {
  return (
    <View style={styles.summaryTile}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

export default function IssuesListScreen() {
  const insets = useSafeAreaInsets();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const { issues, drafts, loadError, refreshIssues } = useIssues();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [projectFilter, setProjectFilter] = useState<string | null>(projectId ?? null);

  const allItems = useMemo<ConstructionIssue[]>(() => [...issues, ...drafts], [issues, drafts]);

  const summary = useMemo(() => {
    const scoped = projectFilter
      ? allItems.filter((i) => i.projectId === projectFilter)
      : allItems;
    return {
      open: scoped.filter((i) => !i.isDraft && i.status === 'OPEN').length,
      inProgress: scoped.filter((i) => !i.isDraft && i.status === 'IN_PROGRESS').length,
      critical: scoped.filter((i) => !i.isDraft && i.severity === 'CRITICAL').length,
      drafts: scoped.filter((i) => i.isDraft).length,
    };
  }, [allItems, projectFilter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    const result = allItems.filter((issue) => {
      if (projectFilter && issue.projectId !== projectFilter) return false;

      // Status filter
      if (statusFilter === 'DRAFTS') {
        if (!issue.isDraft) return false;
      } else if (statusFilter !== 'ALL') {
        if (issue.isDraft || issue.status !== statusFilter) return false;
      }

      // Severity filter
      if (severityFilter !== 'ALL' && issue.severity !== severityFilter) return false;

      // Search
      if (q !== '') {
        const haystack = [
          issue.title,
          issue.referenceNumber,
          projectName(issue.projectId),
          issue.blockName,
          issue.floor,
          issue.area,
          issue.assignedTeam,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    // Newest first
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [allItems, search, statusFilter, severityFilter, projectFilter]);

  const filtersActive =
    search.trim() !== '' ||
    statusFilter !== 'ALL' ||
    severityFilter !== 'ALL' ||
    projectFilter !== null;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setSeverityFilter('ALL');
    setProjectFilter(null);
  };

  const openIssue = (issue: ConstructionIssue) => {
    if (issue.isDraft) {
      router.push({ pathname: '/issues/new', params: { draftId: issue.id } });
    } else {
      router.push({ pathname: '/issues/[id]', params: { id: issue.id } });
    }
  };

  const listHeader = (
    <View>
      <View style={styles.summaryRow}>
        <SummaryTile label="Open" value={summary.open} color={colors.danger} />
        <View style={styles.summarySep} />
        <SummaryTile label="In Progress" value={summary.inProgress} color={colors.primary} />
        <View style={styles.summarySep} />
        <SummaryTile label="Critical" value={summary.critical} color={colors.danger} />
        <View style={styles.summarySep} />
        <SummaryTile label="Drafts" value={summary.drafts} color={colors.textSecondary} />
      </View>

      {projectFilter !== null && (
        <View style={styles.projectFilterChip}>
          <MaterialCommunityIcons name="office-building-outline" size={14} color={colors.primary} />
          <Text style={styles.projectFilterText} numberOfLines={1}>
            {projectName(projectFilter)}
          </Text>
          <TouchableOpacity
            onPress={() => setProjectFilter(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Clear project filter"
          >
            <Ionicons name="close-circle" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search issues, references or locations"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        keyboardShouldPersistTaps="handled"
      >
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setStatusFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        keyboardShouldPersistTaps="handled"
      >
        {SEVERITY_FILTERS.map((f) => {
          const active = severityFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, styles.chipSmall, active && styles.chipActive]}
              onPress={() => setSeverityFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
        </Text>
        {filtersActive && (
          <TouchableOpacity onPress={clearFilters} activeOpacity={0.7}>
            <Text style={styles.clearText}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loadError) {
    return (
      <ScreenError
        title="Couldn't load issues"
        message="Your saved issues could not be read. Please try again."
        onRetry={() => {
          void refreshIssues();
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/issues/new')}
            activeOpacity={0.8}
            accessibilityLabel="Add issue"
          >
            <Ionicons name="add" size={20} color={colors.background} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Issues</Text>
        <Text style={styles.headerSubtitle}>
          Track defects, safety observations and corrective actions
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <IssueCard issue={item} projectName={projectName(item.projectId)} onPress={() => openIssue(item)} />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            icon={
              <MaterialCommunityIcons name="clipboard-search-outline" size={32} color={colors.textSecondary} />
            }
            title="No issues found"
            description={
              filtersActive
                ? 'No issues match your current search and filters.'
                : 'No issues have been reported yet. Create the first defect report to get started.'
            }
            action={
              filtersActive ? (
                <TouchableOpacity style={styles.emptyBtn} onPress={clearFilters}>
                  <Text style={styles.emptyBtnText}>Clear filters</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptyBtnPrimary}
                  onPress={() => router.push('/issues/new')}
                >
                  <Text style={styles.emptyBtnPrimaryText}>New Defect Report</Text>
                </TouchableOpacity>
              )
            }
          />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
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
    gap: 6,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 38,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    marginBottom: 14,
  },
  summaryTile: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  summarySep: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  projectFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '50',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    maxWidth: '100%',
  },
  projectFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    flexShrink: 1,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    height: '100%',
  },
  chipsRow: {
    gap: 8,
    paddingRight: 4,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSmall: {
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary + '80',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyBtnPrimary: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  emptyBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
});
