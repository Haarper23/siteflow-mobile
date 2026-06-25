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
import ProgressBar from '@/src/components/ProgressBar';
import IssueCard from '@/src/components/IssueCard';
import DailyReportStatusBadge from '@/src/components/DailyReportStatusBadge';
import { colors } from '@/src/theme/colors';
import { PROJECTS } from '@/src/data/projects';
import { useDailyReports } from '@/src/context/DailyReportContext';
import { useIssues } from '@/src/context/IssueContext';
import { formatReportDate, formatDisplayDate, calculateWorkDuration } from '@/src/utils/date';
import {
  getWeatherVisual,
  getActivityStatusColor,
  getEquipmentStatusColor,
} from '@/src/utils/dailyReportDisplay';
import {
  WEATHER_LABELS,
  SITE_CONDITION_LABELS,
  WORK_SHIFT_LABELS,
  WORK_ACTIVITY_STATUS_LABELS,
  EQUIPMENT_STATUS_LABELS,
  totalWorkers,
  type DailyReportStatus,
} from '@/src/types/dailyReport';

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

export default function DailyReportDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getReportById, markReportStatus, deleteDraft } = useDailyReports();
  const { getIssueById } = useIssues();

  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const report = getReportById(id);

  if (!report) {
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
          <Text style={styles.notFoundTitle}>Report not found</Text>
          <Text style={styles.notFoundDesc}>
            This daily report may have been removed or never existed.
          </Text>
          <TouchableOpacity style={styles.notFoundBtn} onPress={() => router.replace('/daily-reports')}>
            <Text style={styles.notFoundBtnText}>Back to Daily Reports</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const continueEditing = () => {
    setMenuVisible(false);
    router.replace({ pathname: '/daily-reports/new', params: { draftId: report.id } });
  };

  const handleDeleteDraft = () => {
    setMenuVisible(false);
    Alert.alert('Delete draft?', 'This draft will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteDraft(report.id);
          router.replace('/daily-reports');
        },
      },
    ]);
  };

  // ---- Draft view -------------------------------------------------------
  if (report.isDraft) {
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
            <DailyReportStatusBadge status="DRAFT" />
            <View style={styles.iconBtnPlaceholder} />
          </View>
        </View>
        <View style={styles.notFound}>
          <View style={styles.draftIconWrap}>
            <MaterialCommunityIcons name="file-document-edit-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.notFoundTitle}>Draft daily report</Text>
          <Text style={styles.notFoundDesc}>
            {projectName(report.projectId)} · {formatReportDate(report.reportDate)}
          </Text>
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

  // ---- Submitted report view -------------------------------------------
  const weather = getWeatherVisual(report.weather);
  const workers = totalWorkers(report.workforce);
  const completed = report.activities.filter((a) => a.status === 'COMPLETED').length;
  const blocked = report.activities.filter((a) => a.status === 'BLOCKED').length;
  const workHours = calculateWorkDuration(report.workStartTime, report.workEndTime);

  const changeStatus = (status: DailyReportStatus, message: string) => {
    Alert.alert('Confirm', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => void markReportStatus(report.id, status) },
    ]);
  };

  const reopenAsDraft = () => {
    Alert.alert('Reopen as draft?', 'This report will move back to draft for editing.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reopen',
        onPress: () => {
          void markReportStatus(report.id, 'DRAFT');
          router.replace({ pathname: '/daily-reports/new', params: { draftId: report.id } });
        },
      },
    ]);
  };

  const tempRange =
    report.minimumTemperature !== undefined || report.maximumTemperature !== undefined
      ? `${report.minimumTemperature ?? '—'}° / ${report.maximumTemperature ?? '—'}°`
      : 'Not recorded';

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
          <Text style={styles.headerRef}>{report.referenceNumber}</Text>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setMenuVisible(true)}
            accessibilityLabel="More options"
          >
            <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <DailyReportStatusBadge status={report.status} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview */}
        <View style={styles.block}>
          <Text style={styles.projectTitle}>{projectName(report.projectId)}</Text>
          <View style={styles.weatherRow}>
            <View style={[styles.weatherIcon, { backgroundColor: weather.color + '1A' }]}>
              <MaterialCommunityIcons name={weather.icon} size={18} color={weather.color} />
            </View>
            <Text style={styles.weatherText}>
              {WEATHER_LABELS[report.weather]} · {SITE_CONDITION_LABELS[report.siteCondition]}
            </Text>
          </View>

          <View style={styles.overviewCard}>
            <DetailRow icon="calendar-outline" label="Date" value={formatReportDate(report.reportDate)} />
            <DetailRow icon="weather-night" label="Shift" value={WORK_SHIFT_LABELS[report.shift]} />
            <DetailRow icon="thermometer" label="Temperature" value={tempRange} />
            <DetailRow
              icon="clock-outline"
              label="Work hours"
              value={
                report.workStartTime || report.workEndTime
                  ? `${report.workStartTime ?? '—'} – ${report.workEndTime ?? '—'}${workHours !== '—' ? ` (${workHours})` : ''}`
                  : 'Not recorded'
              }
            />
            <DetailRow icon="account-outline" label="Created by" value={report.createdBy} />
            <DetailRow
              icon="send-outline"
              label="Submitted"
              value={report.submittedAt !== undefined ? formatDisplayDate(report.submittedAt) : '—'}
              last={report.status !== 'APPROVED'}
            />
            {report.status === 'APPROVED' && (
              <DetailRow
                icon="check-decagram-outline"
                label="Approved"
                value={report.approvedAt !== undefined ? formatDisplayDate(report.approvedAt) : '—'}
                last
              />
            )}
          </View>
        </View>

        {/* Summary metrics */}
        <View style={styles.block}>
          <View style={styles.metricsGrid}>
            <MetricTile icon="account-group-outline" value={workers} label="Workers" color={colors.primary} />
            <MetricTile icon="progress-check" value={report.activities.length} label="Activities" color={colors.textPrimary} />
            <MetricTile icon="check-circle-outline" value={completed} label="Completed" color={colors.success} />
            <MetricTile icon="cancel" value={blocked} label="Blocked" color={blocked > 0 ? colors.danger : colors.textPrimary} />
            <MetricTile icon="truck-outline" value={report.materialDeliveries.length} label="Deliveries" color={colors.textPrimary} />
            <MetricTile
              icon="alert-octagon-outline"
              value={report.accidentOccurred ? 1 : 0}
              label="Incidents"
              color={report.accidentOccurred ? colors.danger : colors.success}
            />
          </View>
        </View>

        {/* Workforce */}
        <Section title="Workforce" trailing={`${workers} total`}>
          {report.workforce.length === 0 ? (
            <Text style={styles.emptyText}>No workforce recorded.</Text>
          ) : (
            report.workforce.map((entry) => (
              <View key={entry.id} style={styles.lineRow}>
                <View style={styles.lineBody}>
                  <Text style={styles.lineTitle}>{entry.trade}</Text>
                  <Text style={styles.lineSub} numberOfLines={1}>
                    {entry.company}
                    {entry.supervisorName ? ` · ${entry.supervisorName}` : ''}
                  </Text>
                </View>
                <Text style={styles.lineValue}>{entry.workerCount}</Text>
              </View>
            ))
          )}
        </Section>

        {/* Activities */}
        <Section title="Work Activities">
          {report.activities.length === 0 ? (
            <Text style={styles.emptyText}>No activities recorded.</Text>
          ) : (
            report.activities.map((activity) => {
              const color = getActivityStatusColor(activity.status);
              return (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityTitle} numberOfLines={2}>
                      {activity.title}
                    </Text>
                    <View style={[styles.statusChip, { backgroundColor: color + '1A', borderColor: color + '60' }]}>
                      <View style={[styles.statusDot, { backgroundColor: color }]} />
                      <Text style={[styles.statusChipText, { color }]}>
                        {WORK_ACTIVITY_STATUS_LABELS[activity.status]}
                      </Text>
                    </View>
                  </View>
                  {activity.description !== '' && (
                    <Text style={styles.activityDesc}>{activity.description}</Text>
                  )}
                  {(activity.blockName || activity.floor) && (
                    <Text style={styles.activityMeta}>
                      {activity.blockName ?? ''}
                      {activity.blockName && activity.floor ? ' · ' : ''}
                      {activity.floor ? `Floor ${activity.floor}` : ''}
                    </Text>
                  )}
                  <View style={styles.progressRow}>
                    <View style={styles.progressBarWrap}>
                      <ProgressBar progress={activity.progressPercentage} height={5} />
                    </View>
                    <Text style={styles.progressValue}>{activity.progressPercentage}%</Text>
                  </View>
                  {activity.notes !== undefined && activity.notes !== '' && (
                    <Text style={[styles.activityMeta, activity.status === 'BLOCKED' && styles.blockerText]}>
                      {activity.notes}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </Section>

        {/* Materials */}
        <Section title="Material Deliveries">
          {report.materialDeliveries.length === 0 ? (
            <Text style={styles.emptyText}>No deliveries recorded.</Text>
          ) : (
            report.materialDeliveries.map((delivery) => (
              <View key={delivery.id} style={styles.materialItem}>
                <View style={styles.lineRowTop}>
                  <Text style={styles.lineTitle} numberOfLines={1}>
                    {delivery.materialName}
                  </Text>
                  <Text style={styles.lineValue}>
                    {delivery.quantity} {delivery.unit}
                  </Text>
                </View>
                <Text style={styles.lineSub} numberOfLines={1}>
                  {delivery.supplier}
                  {delivery.deliveryNoteNumber ? ` · ${delivery.deliveryNoteNumber}` : ''}
                  {delivery.receivedBy ? ` · ${delivery.receivedBy}` : ''}
                </Text>
              </View>
            ))
          )}
        </Section>

        {/* Equipment */}
        <Section title="Equipment">
          {report.equipment.length === 0 ? (
            <Text style={styles.emptyText}>No equipment recorded.</Text>
          ) : (
            report.equipment.map((entry) => {
              const color = getEquipmentStatusColor(entry.status);
              return (
                <View key={entry.id} style={styles.lineRow}>
                  <View style={styles.lineBody}>
                    <Text style={styles.lineTitle}>
                      {entry.equipmentName} · {entry.quantity}
                    </Text>
                    <View style={[styles.statusChip, { backgroundColor: color + '1A', borderColor: color + '60', marginTop: 4 }]}>
                      <View style={[styles.statusDot, { backgroundColor: color }]} />
                      <Text style={[styles.statusChipText, { color }]}>
                        {EQUIPMENT_STATUS_LABELS[entry.status]}
                      </Text>
                    </View>
                  </View>
                  {entry.operatingHours !== undefined && (
                    <Text style={styles.lineValue}>{entry.operatingHours}h</Text>
                  )}
                </View>
              );
            })
          )}
        </Section>

        {/* Safety */}
        <Section title="Safety">
          <View style={styles.overviewCard}>
            <DetailRow
              icon="account-check-outline"
              label="Briefing"
              value={report.safetyBriefingCompleted ? 'Completed' : 'Not completed'}
            />
            <DetailRow
              icon="alert-octagon-outline"
              label="Accident"
              value={report.accidentOccurred ? 'Yes' : 'No'}
            />
            <DetailRow icon="clock-alert-outline" label="Delay" value={report.delayOccurred ? 'Yes' : 'No'} />
            <DetailRow icon="account-multiple-outline" label="Visitors" value={String(report.visitorCount)} last />
          </View>
          {report.accidentOccurred && report.accidentDescription !== undefined && (
            <View style={styles.alertNote}>
              <Text style={styles.alertNoteLabel}>Incident description</Text>
              <Text style={styles.alertNoteText}>{report.accidentDescription}</Text>
            </View>
          )}
          {report.delayOccurred && report.delayReason !== undefined && (
            <View style={styles.delayNote}>
              <Text style={styles.delayNoteLabel}>Delay reason</Text>
              <Text style={styles.delayNoteText}>{report.delayReason}</Text>
            </View>
          )}
          {report.safetyNotes !== '' && (
            <Text style={styles.bodyNote}>{report.safetyNotes}</Text>
          )}
        </Section>

        {/* Evidence */}
        <Section title="Evidence">
          {report.photos.length > 0 ? (
            <View style={styles.photoGrid}>
              {report.photos.map((photo) => (
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
              <Text style={styles.emptyEvidenceText}>No photos were attached to this report.</Text>
            </View>
          )}
        </Section>

        {/* Linked issues */}
        {report.linkedIssueIds.length > 0 && (
          <Section title="Linked Issues">
            {report.linkedIssueIds.map((issueId) => {
              const issue = getIssueById(issueId);
              if (!issue) {
                return (
                  <View key={issueId} style={styles.missingIssue}>
                    <MaterialCommunityIcons name="link-off" size={16} color={colors.textSecondary} />
                    <Text style={styles.missingIssueText}>
                      A linked issue is no longer available.
                    </Text>
                  </View>
                );
              }
              return (
                <IssueCard
                  key={issueId}
                  issue={issue}
                  projectName={projectName(issue.projectId)}
                  compact
                  onPress={() => router.push({ pathname: '/issues/[id]', params: { id: issue.id } })}
                />
              );
            })}
          </Section>
        )}

        {/* General notes */}
        {report.generalNotes !== '' && (
          <Section title="General Notes">
            <Text style={styles.bodyNote}>{report.generalNotes}</Text>
          </Section>
        )}

        {/* Status actions */}
        <View style={styles.actionsBlock}>
          {report.status === 'SUBMITTED' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary]}
                onPress={() => changeStatus('APPROVED', 'Approve this daily report?')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.background} />
                <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>Approve Report</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSecondary]}
                onPress={() => changeStatus('REJECTED', 'Reject this daily report?')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="close-circle-outline" size={18} color={colors.danger} />
                <Text style={[styles.actionBtnText, { color: colors.danger }]}>Reject Report</Text>
              </TouchableOpacity>
            </>
          )}
          {report.status === 'APPROVED' && (
            <View style={styles.approvedBanner}>
              <MaterialCommunityIcons name="check-decagram" size={20} color={colors.success} />
              <Text style={styles.approvedText}>
                Approved on {report.approvedAt !== undefined ? formatDisplayDate(report.approvedAt) : '—'}
              </Text>
            </View>
          )}
          {report.status === 'REJECTED' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={reopenAsDraft}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="file-document-edit-outline" size={18} color={colors.background} />
              <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>Reopen as Draft</Text>
            </TouchableOpacity>
          )}
        </View>
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

      {/* Overflow menu */}
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
                router.replace('/daily-reports');
              }}
            >
              <MaterialCommunityIcons name="format-list-bulleted" size={20} color={colors.textPrimary} />
              <Text style={styles.menuItemText}>View all reports</Text>
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

interface SectionProps {
  title: string;
  trailing?: string;
  children: React.ReactNode;
}

function Section({ title, trailing, children }: SectionProps) {
  return (
    <View style={styles.block}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {trailing !== undefined && <Text style={styles.sectionTrailing}>{trailing}</Text>}
      </View>
      {children}
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

interface MetricTileProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  value: number;
  label: string;
  color: string;
}

function MetricTile({ icon, value, label, color }: MetricTileProps) {
  return (
    <View style={styles.metricTile}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
  scroll: {
    flex: 1,
  },
  block: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  projectTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  weatherIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  overviewCard: {
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
    width: 100,
  },
  detailValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionTrailing: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  lineRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  lineBody: {
    flex: 1,
  },
  lineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  lineSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lineValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  materialItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
    gap: 2,
  },
  activityItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
    gap: 8,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  activityTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 19,
  },
  activityDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  activityMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  blockerText: {
    color: colors.danger,
    fontStyle: 'italic',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarWrap: {
    flex: 1,
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 38,
    textAlign: 'right',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  alertNote: {
    backgroundColor: colors.danger + '0E',
    borderWidth: 1,
    borderColor: colors.danger + '40',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    gap: 4,
  },
  alertNoteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  alertNoteText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  delayNote: {
    backgroundColor: colors.warning + '12',
    borderWidth: 1,
    borderColor: colors.warning + '40',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    gap: 4,
  },
  delayNoteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
  },
  delayNoteText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  bodyNote: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
    marginTop: 10,
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
  missingIssue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  missingIssueText: {
    flex: 1,
    fontSize: 13,
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
  approvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success + '14',
    borderWidth: 1,
    borderColor: colors.success + '40',
    borderRadius: 12,
    paddingVertical: 16,
  },
  approvedText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
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
