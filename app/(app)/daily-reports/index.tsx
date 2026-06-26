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
import DailyReportCard from '@/src/components/DailyReportCard';
import EmptyState from '@/src/components/EmptyState';
import { ScreenError } from '@/src/components/ScreenError';
import { colors } from '@/src/theme/colors';
import { PROJECTS } from '@/src/data/projects';
import { useDailyReports } from '@/src/context/DailyReportContext';
import type { DailySiteReport } from '@/src/types/dailyReport';
import { getTodayISODate, isDateToday, isWithinLastDays, formatReportDate } from '@/src/utils/date';

type StatusFilter = 'ALL' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DRAFTS';
type DateFilter = 'ALL' | 'TODAY' | 'LAST_7' | 'LAST_30';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'DRAFTS', label: 'Drafts' },
];

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'TODAY', label: 'Today' },
  { key: 'LAST_7', label: 'Last 7 Days' },
  { key: 'LAST_30', label: 'Last 30 Days' },
  { key: 'ALL', label: 'All Time' },
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

export default function DailyReportsListScreen() {
  const insets = useSafeAreaInsets();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const { reports, drafts, getTotalWorkersForDate, loadError, refreshReports } =
    useDailyReports();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [projectFilter, setProjectFilter] = useState<string | null>(projectId ?? null);

  const allItems = useMemo<DailySiteReport[]>(() => [...reports, ...drafts], [reports, drafts]);

  const summary = useMemo(() => {
    const scoped = projectFilter
      ? allItems.filter((r) => r.projectId === projectFilter)
      : allItems;
    return {
      submitted: scoped.filter((r) => r.status === 'SUBMITTED').length,
      approved: scoped.filter((r) => r.status === 'APPROVED').length,
      drafts: scoped.filter((r) => r.isDraft).length,
      workersToday: getTotalWorkersForDate(getTodayISODate()),
    };
  }, [allItems, projectFilter, getTotalWorkersForDate]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    const result = allItems.filter((report) => {
      if (projectFilter && report.projectId !== projectFilter) return false;

      if (statusFilter === 'DRAFTS') {
        if (!report.isDraft) return false;
      } else if (statusFilter !== 'ALL') {
        if (report.isDraft || report.status !== statusFilter) return false;
      }

      if (dateFilter === 'TODAY' && !isDateToday(report.reportDate)) return false;
      if (dateFilter === 'LAST_7' && !isWithinLastDays(report.reportDate, 7)) return false;
      if (dateFilter === 'LAST_30' && !isWithinLastDays(report.reportDate, 30)) return false;

      if (q !== '') {
        const haystack = [
          report.referenceNumber,
          projectName(report.projectId),
          formatReportDate(report.reportDate),
          report.reportDate,
          report.createdBy,
          ...report.activities.map((a) => a.title),
          ...report.materialDeliveries.map((m) => m.materialName),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    return result.sort(
      (a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime(),
    );
  }, [allItems, search, statusFilter, dateFilter, projectFilter]);

  const filtersActive =
    search.trim() !== '' ||
    statusFilter !== 'ALL' ||
    dateFilter !== 'ALL' ||
    projectFilter !== null;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setDateFilter('ALL');
    setProjectFilter(null);
  };

  const openReport = (report: DailySiteReport) => {
    if (report.isDraft) {
      router.push({ pathname: '/daily-reports/new', params: { draftId: report.id } });
    } else {
      router.push({ pathname: '/daily-reports/[id]', params: { id: report.id } });
    }
  };

  const listHeader = (
    <View>
      <View style={styles.summaryRow}>
        <SummaryTile label="Submitted" value={summary.submitted} color={colors.primary} />
        <View style={styles.summarySep} />
        <SummaryTile label="Approved" value={summary.approved} color={colors.success} />
        <View style={styles.summarySep} />
        <SummaryTile label="Drafts" value={summary.drafts} color={colors.textSecondary} />
        <View style={styles.summarySep} />
        <SummaryTile label="Workers Today" value={summary.workersToday} color={colors.textPrimary} />
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
          placeholder="Search reports, projects or references"
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
        <TouchableOpacity
          style={[styles.chip, styles.chipSmall, projectFilter === null && styles.chipActive]}
          onPress={() => setProjectFilter(null)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, projectFilter === null && styles.chipTextActive]}>
            All Projects
          </Text>
        </TouchableOpacity>
        {PROJECTS.map((p) => {
          const active = projectFilter === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, styles.chipSmall, active && styles.chipActive]}
              onPress={() => setProjectFilter(p.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.name}</Text>
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
        {DATE_FILTERS.map((f) => {
          const active = dateFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, styles.chipSmall, active && styles.chipActive]}
              onPress={() => setDateFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {filtered.length} {filtered.length === 1 ? 'report' : 'reports'}
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
        title="Couldn't load reports"
        message="Your saved daily reports could not be read. Please try again."
        onRetry={() => {
          void refreshReports();
        }}
      />
    );
  }

  return (
    <View style={styles.screen}>
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
            onPress={() => router.push('/daily-reports/new')}
            activeOpacity={0.8}
            accessibilityLabel="New daily report"
          >
            <Ionicons name="add" size={20} color={colors.background} />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Daily Reports</Text>
        <Text style={styles.headerSubtitle}>
          Monitor daily workforce, progress and site conditions
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DailyReportCard
            report={item}
            projectName={projectName(item.projectId)}
            onPress={() => openReport(item)}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            icon={
              <MaterialCommunityIcons name="clipboard-text-search-outline" size={32} color={colors.textSecondary} />
            }
            title="No daily reports found"
            description={
              filtersActive
                ? 'No reports match your current search and filters.'
                : 'No daily reports yet. Create the first one to track site activity.'
            }
            action={
              filtersActive ? (
                <TouchableOpacity style={styles.emptyBtn} onPress={clearFilters}>
                  <Text style={styles.emptyBtnText}>Clear filters</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptyBtnPrimary}
                  onPress={() => router.push('/daily-reports/new')}
                >
                  <Text style={styles.emptyBtnPrimaryText}>New Daily Report</Text>
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
    paddingHorizontal: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 10,
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
