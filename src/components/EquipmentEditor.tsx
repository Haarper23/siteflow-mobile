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
import type { EquipmentEntry, EquipmentStatus } from '@/src/types/dailyReport';
import {
  EQUIPMENT_NAMES,
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_LABELS,
} from '@/src/types/dailyReport';
import { getEquipmentStatusColor } from '@/src/utils/dailyReportDisplay';
import { colors } from '@/src/theme/colors';

interface EquipmentEditorProps {
  equipment: EquipmentEntry[];
  onChange: (equipment: EquipmentEntry[]) => void;
}

interface DraftState {
  equipmentName: string;
  customName: string;
  quantity: string;
  operatingHours: string;
  status: EquipmentStatus;
  notes: string;
}

const EMPTY_DRAFT: DraftState = {
  equipmentName: EQUIPMENT_NAMES[0],
  customName: '',
  quantity: '1',
  operatingHours: '',
  status: 'ACTIVE',
  notes: '',
};

function generateId(): string {
  return `eq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function EquipmentEditor({ equipment, onChange }: EquipmentEditorProps) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<{ name?: string; quantity?: string }>({});

  const openAdd = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setModalVisible(true);
  };

  const openEdit = (entry: EquipmentEntry) => {
    const isPreset = EQUIPMENT_NAMES.includes(entry.equipmentName);
    setEditingId(entry.id);
    setDraft({
      equipmentName: isPreset ? entry.equipmentName : 'Other',
      customName: isPreset ? '' : entry.equipmentName,
      quantity: String(entry.quantity),
      operatingHours: entry.operatingHours !== undefined ? String(entry.operatingHours) : '',
      status: entry.status,
      notes: entry.notes ?? '',
    });
    setErrors({});
    setModalVisible(true);
  };

  const remove = (id: string) => {
    onChange(equipment.filter((e) => e.id !== id));
  };

  const save = () => {
    const resolvedName =
      draft.equipmentName === 'Other' ? draft.customName.trim() : draft.equipmentName;
    const nextErrors: { name?: string; quantity?: string } = {};
    if (resolvedName === '') nextErrors.name = 'Equipment name is required';
    const quantity = parseInt(draft.quantity.trim(), 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      nextErrors.quantity = 'Quantity must be greater than zero';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const hours = draft.operatingHours.trim();
    const parsedHours = hours === '' ? undefined : Number(hours);

    const entry: EquipmentEntry = {
      id: editingId ?? generateId(),
      equipmentName: resolvedName,
      quantity,
      operatingHours:
        parsedHours !== undefined && Number.isFinite(parsedHours) ? parsedHours : undefined,
      status: draft.status,
      notes: draft.notes.trim() || undefined,
    };

    onChange(
      editingId ? equipment.map((e) => (e.id === editingId ? entry : e)) : [...equipment, entry],
    );
    setModalVisible(false);
  };

  return (
    <View>
      {equipment.map((entry) => {
        const color = getEquipmentStatusColor(entry.status);
        return (
          <View key={entry.id} style={styles.entryCard}>
            <View style={styles.entryBody}>
              <Text style={styles.entryTitle} numberOfLines={1}>
                {entry.equipmentName} · {entry.quantity}
              </Text>
              <View style={styles.entryMetaRow}>
                <View style={[styles.statusChip, { backgroundColor: color + '1A', borderColor: color + '60' }]}>
                  <View style={[styles.statusDot, { backgroundColor: color }]} />
                  <Text style={[styles.statusChipText, { color }]}>
                    {EQUIPMENT_STATUS_LABELS[entry.status]}
                  </Text>
                </View>
                {entry.operatingHours !== undefined && (
                  <Text style={styles.entrySub}>{entry.operatingHours}h</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.iconAction}
              onPress={() => openEdit(entry)}
              accessibilityLabel="Edit equipment"
            >
              <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconAction}
              onPress={() => remove(entry.id)}
              accessibilityLabel="Delete equipment"
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity style={styles.addButton} onPress={openAdd} activeOpacity={0.8}>
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.addButtonText}>Add Equipment</Text>
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
              <Text style={styles.modalTitle}>{editingId ? 'Edit Equipment' : 'Add Equipment'}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Close"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Equipment</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
                keyboardShouldPersistTaps="handled"
              >
                {EQUIPMENT_NAMES.map((name) => {
                  const selected = draft.equipmentName === name;
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => setDraft((d) => ({ ...d, equipmentName: name }))}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {draft.equipmentName === 'Other' && (
                <FormField
                  label="Equipment name"
                  required
                  value={draft.customName}
                  onChangeText={(t) => setDraft((d) => ({ ...d, customName: t }))}
                  placeholder="Specify equipment"
                  error={errors.name}
                />
              )}
              {draft.equipmentName !== 'Other' && errors.name !== undefined && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}

              <FormField
                label="Quantity"
                required
                value={draft.quantity}
                onChangeText={(t) => setDraft((d) => ({ ...d, quantity: t.replace(/[^0-9]/g, '') }))}
                placeholder="1"
                keyboardType="number-pad"
                error={errors.quantity}
              />
              <FormField
                label="Operating hours (optional)"
                value={draft.operatingHours}
                onChangeText={(t) =>
                  setDraft((d) => ({ ...d, operatingHours: t.replace(/[^0-9.]/g, '') }))
                }
                placeholder="e.g. 8"
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.statusGrid}>
                {EQUIPMENT_STATUSES.map((status) => {
                  const selected = draft.status === status;
                  const color = getEquipmentStatusColor(status);
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
                        {EQUIPMENT_STATUS_LABELS[status]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <FormField
                label="Notes (optional)"
                multiline
                value={draft.notes}
                onChangeText={(t) => setDraft((d) => ({ ...d, notes: t }))}
                placeholder="Any relevant notes"
              />

              <TouchableOpacity style={styles.saveButton} onPress={save} activeOpacity={0.85}>
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Update Equipment' : 'Add Equipment'}
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
    gap: 6,
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  entryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  entrySub: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
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
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 2,
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
