import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SeverityBadge from '@/src/components/SeverityBadge';
import IssueStatusBadge from '@/src/components/IssueStatusBadge';
import { colors } from '@/src/theme/colors';
import { PROJECTS } from '@/src/data/projects';
import { useIssues } from '@/src/context/IssueContext';
import { useDailyReports } from '@/src/context/DailyReportContext';
import { formatDisplayDate, formatReportDate } from '@/src/utils/date';
import { getCategoryVisual } from '@/src/utils/issueDisplay';
import { CATEGORY_LABELS, type IssueStatus } from '@/src/types/issue';

const TIMELINE_STEPS = ['Reported', 'Assigned', 'In Progress', 'Waiting Approval', 'Resolved'];

function statusToTimelineIndex(status: IssueStatus): number {
  switch (status) {
    case 'DRAFT':
      return 0;
    case 'OPEN':
      return 1;
    case 'IN_PROGRESS':
      return 2;
    case 'WAITING_APPROVAL':
      return 3;
    case 'RESOLVED':
    case 'CLOSED':
      return 4;
  }
}

interface ActionDef {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  next: IssueStatus;
  primary: boolean;
  confirm?: string;
}

function getActions(status: IssueStatus): ActionDef[] {
  switch (status) {
    case 'OPEN':
      return [{ label: 'Start Work', icon: 'play-circle-outline', next: 'IN_PROGRESS', primary: true }];
    case 'IN_PROGRESS':
      return [
        { label: 'Request Approval', icon: 'send-check-outline', next: 'WAITING_APPROVAL', primary: true },
      ];
    case 'WAITING_APPROVAL':
      return [
        {
          label: 'Mark Resolved',
          icon: 'check-circle-outline',
          next: 'RESOLVED',
          primary: true,
          confirm: 'Mark this issue as resolved?',
        },
        { label: 'Reopen', icon: 'refresh', next: 'OPEN', primary: false, confirm: 'Reopen this issue?' },
      ];
    case 'RESOLVED':
      return [
        {
          label: 'Close Issue',
          icon: 'lock-check-outline',
          next: 'CLOSED',
          primary: true,
          confirm: 'Close this issue? It will be marked as fully completed.',
        },
        { label: 'Reopen', icon: 'refresh', next: 'OPEN', primary: false, confirm: 'Reopen this issue?' },
      ];
    case 'CLOSED':
      return [
        { label: 'Reopen', icon: 'refresh', next: 'OPEN', primary: true, confirm: 'Reopen this closed issue?' },
      ];
    default:
      return [];
  }
}

export default function IssueDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getIssueById, markIssueStatus, deleteDraft } = useIssues();
  const { reports } = useDailyReports();

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const issue = getIssueById(id);
  const referencingReports = reports.filter((r) => r.linkedIssueIds.includes(id));

  if (!issue) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <MaterialCommunityIcons name="file-search-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.notFoundTitle}>Issue not found</Text>
          <Text style={styles.notFoundDesc}>
            This issue may have been removed or never existed.
          </Text>
          <TouchableOpacity style={styles.notFoundBtn} onPress={() => router.replace('/issues')}>
            <Text style={styles.notFoundBtnText}>Back to Issues</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const project = PROJECTS.find((p) => p.id === issue.projectId);
  const projectName = project?.name ?? 'Unknown Project';
  const visual = getCategoryVisual(issue.category);
  const actions = getActions(issue.status);
  const timelineIndex = statusToTimelineIndex(issue.status);

  const handleStatusChange = (action: ActionDef) => {
    const apply = () => {
      void markIssueStatus(issue.id, action.next);
    };
    if (action.confirm !== undefined) {
      Alert.alert('Confirm', action.confirm, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: apply },
      ]);
    } else {
      apply();
    }
  };

  const continueEditing = () => {
    setMenuVisible(false);
    router.replace({ pathname: '/issues/new', params: { draftId: issue.id } });
  };

  const handleDeleteDraft = () => {
    setMenuVisible(false);
    Alert.alert('Delete draft?', 'This draft will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteDraft(issue.id);
          router.replace('/issues');
        },
      },
    ]);
  };

  // ---- Draft view -------------------------------------------------------
  if (issue.isDraft) {
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
            <IssueStatusBadge status="DRAFT" />
            <View style={styles.iconBtnPlaceholder} />
          </View>
        </View>
        <View style={styles.notFound}>
          <View style={styles.draftIconWrap}>
            <MaterialCommunityIcons name="file-document-edit-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.notFoundTitle}>{issue.title || 'Untitled draft'}</Text>
          <Text style={styles.notFoundDesc}>
            This report is still a draft. Continue editing to complete and submit it.
          </Text>
          <TouchableOpacity style={styles.draftPrimaryBtn} onPress={continueEditing}>
            <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.background} />
            <Text style={styles.draftPrimaryText}>Continue Editing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.notFoundBtn} onPress={handleDeleteDraft}>
            <Text style={[styles.notFoundBtnText, { color: colors.danger }]}>Delete Draft</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---- Issue view -------------------------------------------------------
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
          <Text style={styles.headerRef}>{issue.referenceNumber}</Text>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setMenuVisible(true)}
            accessibilityLabel="More options"
          >
            <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerBadges}>
          <IssueStatusBadge status={issue.status} />
          <SeverityBadge severity={issue.severity} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main */}
        <View style={styles.block}>
          <Text style={styles.title}>{issue.title}</Text>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryIcon, { backgroundColor: visual.color + '1A' }]}>
              <MaterialCommunityIcons name={visual.icon} size={16} color={visual.color} />
            </View>
            <Text style={styles.categoryText}>{CATEGORY_LABELS[issue.category]}</Text>
          </View>

          <View style={styles.locationCard}>
            <DetailRow icon="office-building-outline" label="Project" value={projectName} />
            <DetailRow icon="view-grid-outline" label="Block" value={issue.blockName} />
            <DetailRow icon="layers-outline" label="Floor" value={issue.floor} />
            <DetailRow icon="map-marker-outline" label="Location" value={issue.area} last />
          </View>

          <Text style={styles.descriptionLabel}>Description</Text>
          <Text style={styles.description}>{issue.description}</Text>
        </View>

        {/* Evidence */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Evidence</Text>
          {issue.photos.length > 0 ? (
            <View style={styles.photoGrid}>
              {issue.photos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  onPress={() => setPreviewUri(photo.uri)}
                  activeOpacity={0.85}
                  accessibilityLabel="Preview photo"
                >
                  <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyEvidence}>
              <MaterialCommunityIcons name="image-off-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.emptyEvidenceText}>No photos were attached to this issue.</Text>
            </View>
          )}
        </View>

        {/* Status timeline */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Status Timeline</Text>
          <View style={styles.timeline}>
            {TIMELINE_STEPS.map((label, index) => {
              const reached = index <= timelineIndex;
              const isCurrent = index === timelineIndex;
              const isLast = index === TIMELINE_STEPS.length - 1;
              return (
                <View key={label} style={styles.timelineRow}>
                  <View style={styles.timelineMarkerCol}>
                    <View
                      style={[
                        styles.timelineDot,
                        reached && styles.timelineDotReached,
                        isCurrent && styles.timelineDotCurrent,
                      ]}
                    >
                      {reached && <View style={styles.timelineDotInner} />}
                    </View>
                    {!isLast && (
                      <View
                        style={[styles.timelineLine, index < timelineIndex && styles.timelineLineReached]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.timelineLabel,
                      reached && styles.timelineLabelReached,
                      isCurrent && styles.timelineLabelCurrent,
                    ]}
                  >
                    {label}
                    {isCurrent ? '  · Current' : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Assignment */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Assignment</Text>
          <View style={styles.locationCard}>
            <DetailRow icon="account-hard-hat-outline" label="Assigned team" value={issue.assignedTeam} />
            <DetailRow
              icon="calendar-clock-outline"
              label="Due date"
              value={issue.dueDate !== null ? formatDisplayDate(issue.dueDate) : 'No due date'}
            />
            <DetailRow icon="account-outline" label="Created by" value={issue.createdBy} />
            <DetailRow icon="calendar-outline" label="Created" value={formatDisplayDate(issue.createdAt)} />
            <DetailRow
              icon="update"
              label="Last updated"
              value={formatDisplayDate(issue.updatedAt)}
              last
            />
          </View>
        </View>

        {/* Referenced in Daily Reports */}
        {referencingReports.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Referenced in Daily Reports</Text>
            {referencingReports.map((report) => (
              <TouchableOpacity
                key={report.id}
                style={styles.refReportRow}
                activeOpacity={0.75}
                onPress={() =>
                  router.push({ pathname: '/daily-reports/[id]', params: { id: report.id } })
                }
                accessibilityLabel={`Open daily report ${report.referenceNumber}`}
              >
                <View style={styles.refReportIcon}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.refReportBody}>
                  <Text style={styles.refReportTitle}>{report.referenceNumber}</Text>
                  <Text style={styles.refReportDate}>{formatReportDate(report.reportDate)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <View style={styles.actionsBlock}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.actionBtn, action.primary ? styles.actionBtnPrimary : styles.actionBtnSecondary]}
                onPress={() => handleStatusChange(action)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name={action.icon}
                  size={18}
                  color={action.primary ? colors.background : colors.textPrimary}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    action.primary ? styles.actionBtnTextPrimary : styles.actionBtnTextSecondary,
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Photo preview modal */}
      <Modal
        visible={previewUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setPreviewUri(null)}
            accessibilityLabel="Close preview"
          >
            <Ionicons name="close" size={26} color={colors.white} />
          </TouchableOpacity>
          {previewUri !== null && (
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Overflow menu modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuSheet, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.menuHandle} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.replace('/issues');
              }}
            >
              <MaterialCommunityIcons name="format-list-bulleted" size={20} color={colors.textPrimary} />
              <Text style={styles.menuItemText}>View all issues</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

interface DetailRowProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
  last?: boolean;
}

function DetailRow({ icon, label, value, last = false }: DetailRowProps) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <MaterialCommunityIcons name={icon} size={16} color={colors.textSecondary} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
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
    gap: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  iconBtnPlaceholder: {
    width: 38,
    height: 38,
  },
  headerRef: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  scroll: {
    flex: 1,
  },
  block: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 28,
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
  },
  detailRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    width: 96,
  },
  detailValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.2,
    marginTop: 18,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoThumb: {
    width: 88,
    height: 88,
    borderRadius: 10,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyEvidence: {
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
  emptyEvidenceText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  timeline: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineMarkerCol: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotReached: {
    borderColor: colors.primary,
  },
  timelineDotCurrent: {
    backgroundColor: colors.primary + '22',
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 22,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  timelineLineReached: {
    backgroundColor: colors.primary,
  },
  timelineLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingTop: 1,
    paddingBottom: 18,
  },
  timelineLabelReached: {
    color: colors.textPrimary,
  },
  timelineLabelCurrent: {
    fontWeight: '700',
    color: colors.primary,
  },
  refReportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  refReportIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refReportBody: {
    flex: 1,
    gap: 3,
  },
  refReportTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  refReportDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionsBlock: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
  },
  actionBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionBtnTextPrimary: {
    color: colors.background,
  },
  actionBtnTextSecondary: {
    color: colors.textPrimary,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  draftIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.primary + '14',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 8,
  },
  notFoundDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  notFoundBtn: {
    marginTop: 4,
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
  draftPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 24,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  draftPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '92%',
    height: '80%',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  menuHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
