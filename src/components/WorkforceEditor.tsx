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
import type { WorkforceEntry } from '@/src/types/dailyReport';
import { WORKFORCE_TRADES, totalWorkers } from '@/src/types/dailyReport';
import { colors } from '@/src/theme/colors';

interface WorkforceEditorProps {
  entries: WorkforceEntry[];
  onChange: (entries: WorkforceEntry[]) => void;
}

interface DraftState {
  trade: string;
  company: string;
  workerCount: string;
  supervisorName: string;
  notes: string;
}

const EMPTY_DRAFT: DraftState = {
  trade: WORKFORCE_TRADES[0],
  company: '',
  workerCount: '',
  supervisorName: '',
  notes: '',
};

function generateId(): string {
  return `wf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function WorkforceEditor({ entries, onChange }: WorkforceEditorProps) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<{ company?: string; workerCount?: string }>({});

  const total = totalWorkers(entries);

  const openAdd = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setModalVisible(true);
  };

  const openEdit = (entry: WorkforceEntry) => {
    setEditingId(entry.id);
    setDraft({
      trade: entry.trade,
      company: entry.company,
      workerCount: String(entry.workerCount),
      supervisorName: entry.supervisorName ?? '',
      notes: entry.notes ?? '',
    });
    setErrors({});
    setModalVisible(true);
  };

  const remove = (id: string) => {
    onChange(entries.filter((e) => e.id !== id));
  };

  const save = () => {
    const nextErrors: { company?: string; workerCount?: string } = {};
    if (draft.company.trim() === '') nextErrors.company = 'Company is required';
    const count = parseInt(draft.workerCount.trim(), 10);
    if (!Number.isFinite(count) || count <= 0) {
      nextErrors.workerCount = 'Enter a whole number greater than zero';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const entry: WorkforceEntry = {
      id: editingId ?? generateId(),
      trade: draft.trade,
      company: draft.company.trim(),
      workerCount: count,
      supervisorName: draft.supervisorName.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    };

    onChange(
      editingId ? entries.map((e) => (e.id === editingId ? entry : e)) : [...entries, entry],
    );
    setModalVisible(false);
  };

  return (
    <View>
      <View style={styles.totalCard}>
        <View>
          <Text style={styles.totalValue}>{total}</Text>
          <Text style={styles.totalLabel}>Total workers on site</Text>
        </View>
        <MaterialCommunityIcons name="account-group" size={32} color={colors.primary} />
      </View>

      {entries.map((entry) => (
        <View key={entry.id} style={styles.entryCard}>
          <View style={styles.entryBody}>
            <Text style={styles.entryTitle}>
              {entry.trade} · {entry.workerCount}
            </Text>
            <Text style={styles.entrySub} numberOfLines={1}>
              {entry.company}
              {entry.supervisorName ? ` · ${entry.supervisorName}` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.iconAction}
            onPress={() => openEdit(entry)}
            accessibilityLabel={`Edit ${entry.trade}`}
          >
            <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconAction}
            onPress={() => remove(entry.id)}
            accessibilityLabel={`Delete ${entry.trade}`}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={openAdd} activeOpacity={0.8}>
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.addButtonText}>Add Workforce Entry</Text>
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
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Workforce' : 'Add Workforce'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Close"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Trade</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
                keyboardShouldPersistTaps="handled"
              >
                {WORKFORCE_TRADES.map((trade) => {
                  const selected = draft.trade === trade;
                  return (
                    <TouchableOpacity
                      key={trade}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => setDraft((d) => ({ ...d, trade }))}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {trade}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <FormField
                label="Company"
                required
                value={draft.company}
                onChangeText={(t) => setDraft((d) => ({ ...d, company: t }))}
                placeholder="e.g. Nova Yapı"
                error={errors.company}
                returnKeyType="next"
              />
              <FormField
                label="Worker count"
                required
                value={draft.workerCount}
                onChangeText={(t) =>
                  setDraft((d) => ({ ...d, workerCount: t.replace(/[^0-9]/g, '') }))
                }
                placeholder="0"
                keyboardType="number-pad"
                error={errors.workerCount}
                returnKeyType="next"
              />
              <FormField
                label="Supervisor name (optional)"
                value={draft.supervisorName}
                onChangeText={(t) => setDraft((d) => ({ ...d, supervisorName: t }))}
                placeholder="e.g. Hakan Şahin"
                returnKeyType="next"
              />
              <FormField
                label="Notes (optional)"
                value={draft.notes}
                onChangeText={(t) => setDraft((d) => ({ ...d, notes: t }))}
                placeholder="Any relevant notes"
                multiline
              />

              <TouchableOpacity style={styles.saveButton} onPress={save} activeOpacity={0.85}>
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Update Entry' : 'Add Entry'}
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
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary + '12',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  totalValue: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.primary,
  },
  totalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  entryBody: {
    flex: 1,
    gap: 3,
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  entrySub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  iconAction: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxHeight: '88%',
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
