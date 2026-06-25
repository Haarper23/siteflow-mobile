import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProjectCard from '@/src/components/ProjectCard';
import EmptyState from '@/src/components/EmptyState';
import { colors } from '@/src/theme/colors';
import { PROJECTS } from '@/src/data/projects';
import { useIssues } from '@/src/context/IssueContext';
import type { ProjectStatus } from '@/src/types/project';

type FilterKey = 'ALL' | ProjectStatus;

interface FilterChip {
  key: FilterKey;
  label: string;
}

const FILTERS: FilterChip[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ON_TRACK', label: 'On Track' },
  { key: 'AT_RISK', label: 'At Risk' },
  { key: 'DELAYED', label: 'Delayed' },
];

const ON_TRACK_COUNT = PROJECTS.filter((p) => p.status === 'ON_TRACK').length;
const AT_RISK_COUNT = PROJECTS.filter((p) => p.status === 'AT_RISK').length;
const DELAYED_COUNT = PROJECTS.filter((p) => p.status === 'DELAYED').length;

export default function ProjectsScreen() {
  const insets = useSafeAreaInsets();
  const { getOpenIssueCount } = useIssues();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');

  const filteredProjects = useMemo(() => {
    const q = search.toLowerCase().trim();
    return PROJECTS.filter((p) => {
      const matchesFilter = activeFilter === 'ALL' || p.status === activeFilter;
      const matchesSearch =
        q === '' ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [search, activeFilter]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Projects</Text>
          <Text style={styles.headerSubtitle}>Manage and monitor active construction sites</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{PROJECTS.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{ON_TRACK_COUNT}</Text>
            <Text style={styles.summaryLabel}>On Track</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#F5A623' }]}>{AT_RISK_COUNT}</Text>
            <Text style={styles.summaryLabel}>At Risk</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.danger }]}>{DELAYED_COUNT}</Text>
            <Text style={styles.summaryLabel}>Delayed</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search projects, codes or locations"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Project List */}
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={{ ...project, openIssueCount: getOpenIssueCount(project.id) }}
              onPress={() =>
                router.push({ pathname: '/projects/[id]', params: { id: project.id } })
              }
            />
          ))
        ) : (
          <EmptyState
            icon={
              <MaterialCommunityIcons name="office-building-outline" size={32} color={colors.textSecondary} />
            }
            title="No projects found"
            description={
              search.length > 0
                ? `No results for "${search}". Try a different name, code or location.`
                : 'No projects match the selected filter.'
            }
            action={
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSearch('');
                  setActiveFilter('ALL');
                }}
              >
                <Text style={styles.clearButtonText}>Clear filters</Text>
              </TouchableOpacity>
            }
          />
        )}
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
  },
  headerText: {
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
    paddingTop: 16,
    paddingBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summarySep: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
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
  filtersRow: {
    gap: 8,
    marginBottom: 16,
    paddingRight: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary + '80',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
