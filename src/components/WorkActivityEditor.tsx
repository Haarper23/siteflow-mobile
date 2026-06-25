import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormField from '@/src/components/FormField';
import ProgressBar from '@/src/components/ProgressBar';
import type { WorkActivity, WorkActivityStatus } from '@/src/types/dailyReport';
import { WORK_ACTIVITY_STATUSES, WORK_ACTIVITY_STATUS_LABELS } from '@/src/types/dailyReport';
import { getActivityStatusColor } from '@/src/utils/dailyReportDisplay';
import { colors } from '@/src/theme/colors';

interface BlockOption {
  id: string;
  name: string;
}

interface WorkActivityEditorProps {
  activities: WorkActivity[];
  blocks: BlockOption[];
  onChange: (activities: WorkActivity[]) => void;
}

interface DraftState {
  title: string;
  description: string;
  blockId: string;
  blockName: string;
  floor: string;
  progress: string;
  status: WorkActivityStatus;
  notes: string;
}

const EMPTY_DRAFT: DraftState = {
  title: '',
  description: '',
  blockId: '',
  blockName: '',
  floor: '',
  progress: '0',
  status: 'IN_PROGRESS',
  notes: '',
};

function generateId(): string {
  return `ac-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function clampProgress(raw: string): number {
  const num = parseInt(raw.trim(), 10);
  if (!Number.isFinite(num)) return 0;
  return Math.min(100, Math.max(0, num));
}

export default function WorkActivityEditor({
  activities,
  blocks,
  onChange,
}: WorkActivityEditorProps) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<{ title?: string; description?: string; notes?: string }>({});

  const openAdd = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setModalVisible(true);
  };

  const openEdit = (activity: WorkActivity) => {
    setEditingId(activity.id);
    setDraft({
      title: activity.title,
      description: activity.description,
      blockId: activity.blockId ?? '',
      blockName: activity.blockName ?? '',
      floor: activity.floor ?? '',
      progress: String(activity.progressPercentage),
      status: activity.status,
      notes: activity.notes ?? '',
    });
    setErrors({});
    setModalVisible(true);
  };

  const remove = (id: string) => {
    onChange(activities.filter((a) => a.id !== id));
  };

  const save = () => {
    const nextErrors: { title?: string; description?: string; notes?: string } = {};
    if (draft.title.trim() === '') nextErrors.title = 'Activity title is required';
    if (draft.description.trim() === '') nextErrors.description = 'Description is required';
    if (draft.status === 'BLOCKED' && draft.notes.trim() === '') {
      nextErrors.notes = 'Explain the blocker for a blocked activity';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const activity: WorkActivity = {
      id: editingId ?? generateId(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      blockId: draft.blockId || undefined,
      blockName: draft.blockName || undefined,
      floor: draft.floor.trim() || undefined,
      progressPercentage: clampProgress(draft.progress),
      status: draft.status,
      notes: draft.notes.trim() || undefined,
    };

    onChange(
      editingId ? activities.map((a) => (a.id === editingId ? activity : a)) : [...activities, activity],
    );
    setModalVisible(false);
  };

  return (
    <View>
      {activities.map((activity) => {
        const color = getActivityStatusColor(activity.status);
        return (
          <View key={activity.id} style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <Text style={styles.entryTitle} numberOfLines={2}>
                {activity.title}
              </Text>
              <View style={styles.entryActions}>
                <TouchableOpacity
                  style={styles.iconAction}
                  onPress={() => openEdit(activity)}
                  accessibilityLabel="Edit activity"
                >
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconAction}
                  onPress={() => remove(activity.id)}
                  accessibilityLabel="Delete activity"
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
            {(activity.blockName || activity.floor) && (
              <Text style={styles.entryMeta} numberOfLines={1}>
                {activity.blockName ?? ''}
                {activity.blockName && activity.floor ? ' · ' : ''}
                {activity.floor ? `Floor ${activity.floor}` : ''}
              </Text>
            )}
            <View style={styles.statusRow}>
              <View style={[styles.statusChip, { backgroundColor: color + '1A', borderColor: color + '60' }]}>
                <View style={[styles.statusDot, { backgroundColor: color }]} />
                <Text style={[styles.statusChipText, { color }]}>
                  {WORK_ACTIVITY_STATUS_LABELS[activity.status]}
                </Text>
              </View>
              <Text style={styles.progressLabel}>{activity.progressPercentage}%</Text>
            </View>
            <ProgressBar progress={activity.progressPercentage} height={5} />
            {activity.status === 'BLOCKED' && activity.notes !== undefined && (
              <Text style={styles.blockerText} numberOfLines={2}>
                {activity.notes}
              </Text>
            )}
          </View>
        );
      })}

      <TouchableOpacity style={styles.addButton} onPress={openAdd} activeOpacity={0.8}>
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.addButtonText}>Add Activity</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Activity' : 'Add Activity'}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Close"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <FormField
                label="Activity title"
                required
                value={draft.title}
                onChangeText={(t) => setDraft((d) => ({ ...d, title: t }))}
                placeholder="e.g. Block A 4th floor concrete pour"
                error={errors.title}
              />
              <FormField
                label="Description"
                required
                multiline
                value={draft.description}
                onChangeText={(t) => setDraft((d) => ({ ...d, description: t }))}
                placeholder="What was done, where and any outcome"
                error={errors.description}
              />

              {blocks.length > 0 && (
                <>
                  <Text style={styles.fieldLabel}>Block or area (optional)</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                    keyboardShouldPersistTaps="handled"
                  >
                    <TouchableOpacity
                      style={[styles.chip, draft.blockId === '' && styles.chipActive]}
                      onPress={() => setDraft((d) => ({ ...d, blockId: '', blockName: '' }))}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, draft.blockId === '' && styles.chipTextActive]}>
                        None
                      </Text>
                    </TouchableOpacity>
                    {blocks.map((block) => {
                      const selected = draft.blockId === block.id;
                      return (
                        <TouchableOpacity
                          key={block.id}
                          style={[styles.chip, selected && styles.chipActive]}
                          onPress={() =>
                            setDraft((d) => ({ ...d, blockId: block.id, blockName: block.name }))
                          }
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                            {block.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <FormField
                label="Floor (optional)"
                value={draft.floor}
                onChangeText={(t) => setDraft((d) => ({ ...d, floor: t }))}
                placeholder="e.g. 4, Ground Floor, Roof"
              />

              <FormField
                label="Progress percentage"
                value={draft.progress}
                onChangeText={(t) => setDraft((d) => ({ ...d, progress: t.replace(/[^0-9]/g, '') }))}
                placeholder="0"
                keyboardType="number-pad"
                hint="0 to 100"
              />

              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.statusGrid}>
                {WORK_ACTIVITY_STATUSES.map((status) => {
                  const selected = draft.status === status;
                  const color = getActivityStatusColor(status);
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        selected && { borderColor: color, backgroundColor: color + '14' },
                      ]}
                      onPress={() => setDraft((d) => ({ ...d, status }))}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.statusDot, { backgroundColor: color }]} />
                      <Text style={[styles.statusOptionText, selected && { color: colors.textPrimary }]}>
                        {WORK_ACTIVITY_STATUS_LABELS[status]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <FormField
                label={draft.status === 'BLOCKED' ? 'Blocker explanation' : 'Notes (optional)'}
                required={draft.status === 'BLOCKED'}
                multiline
                value={draft.notes}
                onChangeText={(t) => setDraft((d) => ({ ...d, notes: t }))}
                placeholder={
                  draft.status === 'BLOCKED'
                    ? 'Explain what is blocking this activity'
                    : 'Any relevant notes'
                }
                error={errors.notes}
              />

              <TouchableOpacity style={styles.saveButton} onPress={save} activeOpacity={0.85}>
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Update Activity' : 'Add Activity'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  entryTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 19,
  },
  entryActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconAction: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  blockerText: {
    fontSize: 12,
    color: colors.danger,
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderStyle: 'dashed',
    paddingVertical: 14,
    marginTop: 2,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  chipRow: {
    gap: 8,
    paddingRight: 4,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
});
