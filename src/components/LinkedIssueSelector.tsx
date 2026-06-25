import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import SeverityBadge from '@/src/components/SeverityBadge';
import IssueStatusBadge from '@/src/components/IssueStatusBadge';
import { useIssues } from '@/src/context/IssueContext';
import { colors } from '@/src/theme/colors';

interface LinkedIssueSelectorProps {
  projectId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function LinkedIssueSelector({
  projectId,
  selectedIds,
  onChange,
}: LinkedIssueSelectorProps) {
  const { getIssuesByProject } = useIssues();
  const [search, setSearch] = useState('');

  const projectIssues = useMemo(() => {
    if (!projectId) return [];
    // Only non-draft issues from this project; closed issues are hidden by default.
    return getIssuesByProject(projectId).filter((issue) => issue.status !== 'CLOSED');
  }, [projectId, getIssuesByProject]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (q === '') return projectIssues;
    return projectIssues.filter((issue) =>
      `${issue.title} ${issue.referenceNumber}`.toLowerCase().includes(q),
    );
  }, [projectIssues, search]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((existing) => existing !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (!projectId) {
    return (
      <View style={styles.emptyNote}>
        <MaterialCommunityIcons name="link-variant-off" size={20} color={colors.textSecondary} />
        <Text style={styles.emptyNoteText}>Select a project first to link issues.</Text>
      </View>
    );
  }

  if (projectIssues.length === 0) {
    return (
      <View style={styles.emptyNote}>
        <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.emptyNoteText}>
          No open issues to link for this project.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.selectedRow}>
        <Text style={styles.selectedText}>
          {selectedIds.length} issue{selectedIds.length === 1 ? '' : 's'} linked
        </Text>
        {selectedIds.length > 0 && (
          <TouchableOpacity onPress={() => onChange([])} activeOpacity={0.7}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={16} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search issues by title or reference"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {filtered.map((issue) => {
        const selected = selectedIds.includes(issue.id);
        return (
          <TouchableOpacity
            key={issue.id}
            style={[styles.issueCard, selected && styles.issueCardSelected]}
            onPress={() => toggle(issue.id)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${issue.referenceNumber} ${issue.title}`}
          >
            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
              {selected && <Ionicons name="checkmark" size={14} color={colors.background} />}
            </View>
            <View style={styles.issueBody}>
              <Text style={styles.issueRef}>{issue.referenceNumber}</Text>
              <Text style={styles.issueTitle} numberOfLines={1}>
                {issue.title}
              </Text>
              <View style={styles.badgeRow}>
                <SeverityBadge severity={issue.severity} size="small" />
                <IssueStatusBadge status={issue.status} size="small" />
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      {filtered.length === 0 && (
        <Text style={styles.noResults}>No issues match &quot;{search}&quot;.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectedText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    height: '100%',
  },
  issueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  issueCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  issueBody: {
    flex: 1,
    gap: 4,
  },
  issueRef: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  emptyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: 16,
  },
  emptyNoteText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  noResults: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
