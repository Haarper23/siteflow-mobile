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
import type { MaterialDelivery } from '@/src/types/dailyReport';
import { MATERIAL_UNITS } from '@/src/types/dailyReport';
import { colors } from '@/src/theme/colors';

interface MaterialDeliveryEditorProps {
  deliveries: MaterialDelivery[];
  onChange: (deliveries: MaterialDelivery[]) => void;
}

interface DraftState {
  materialName: string;
  quantity: string;
  unit: string;
  supplier: string;
  deliveryNoteNumber: string;
  receivedBy: string;
  notes: string;
}

const EMPTY_DRAFT: DraftState = {
  materialName: '',
  quantity: '',
  unit: MATERIAL_UNITS[0],
  supplier: '',
  deliveryNoteNumber: '',
  receivedBy: '',
  notes: '',
};

function generateId(): string {
  return `md-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function MaterialDeliveryEditor({
  deliveries,
  onChange,
}: MaterialDeliveryEditorProps) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<{ materialName?: string; quantity?: string; supplier?: string }>({});

  const openAdd = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setModalVisible(true);
  };

  const openEdit = (delivery: MaterialDelivery) => {
    setEditingId(delivery.id);
    setDraft({
      materialName: delivery.materialName,
      quantity: String(delivery.quantity),
      unit: delivery.unit,
      supplier: delivery.supplier,
      deliveryNoteNumber: delivery.deliveryNoteNumber ?? '',
      receivedBy: delivery.receivedBy ?? '',
      notes: delivery.notes ?? '',
    });
    setErrors({});
    setModalVisible(true);
  };

  const remove = (id: string) => {
    onChange(deliveries.filter((d) => d.id !== id));
  };

  const save = () => {
    const nextErrors: { materialName?: string; quantity?: string; supplier?: string } = {};
    if (draft.materialName.trim() === '') nextErrors.materialName = 'Material name is required';
    const quantity = Number(draft.quantity.trim());
    if (!Number.isFinite(quantity) || quantity <= 0) {
      nextErrors.quantity = 'Quantity must be greater than zero';
    }
    if (draft.supplier.trim() === '') nextErrors.supplier = 'Supplier is required';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const delivery: MaterialDelivery = {
      id: editingId ?? generateId(),
      materialName: draft.materialName.trim(),
      quantity,
      unit: draft.unit,
      supplier: draft.supplier.trim(),
      deliveryNoteNumber: draft.deliveryNoteNumber.trim() || undefined,
      receivedBy: draft.receivedBy.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    };

    onChange(
      editingId ? deliveries.map((d) => (d.id === editingId ? delivery : d)) : [...deliveries, delivery],
    );
    setModalVisible(false);
  };

  return (
    <View>
      {deliveries.map((delivery) => (
        <View key={delivery.id} style={styles.entryCard}>
          <View style={styles.entryBody}>
            <Text style={styles.entryTitle} numberOfLines={1}>
              {delivery.materialName}
            </Text>
            <Text style={styles.entrySub} numberOfLines={1}>
              {delivery.quantity} {delivery.unit} · {delivery.supplier}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.iconAction}
            onPress={() => openEdit(delivery)}
            accessibilityLabel="Edit delivery"
          >
            <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconAction}
            onPress={() => remove(delivery.id)}
            accessibilityLabel="Delete delivery"
          >
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={openAdd} activeOpacity={0.8}>
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.addButtonText}>Add Material Delivery</Text>
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
              <Text style={styles.modalTitle}>{editingId ? 'Edit Delivery' : 'Add Delivery'}</Text>
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
                label="Material name"
                required
                value={draft.materialName}
                onChangeText={(t) => setDraft((d) => ({ ...d, materialName: t }))}
                placeholder="e.g. Ready-mix concrete C30/37"
                error={errors.materialName}
              />
              <FormField
                label="Quantity"
                required
                value={draft.quantity}
                onChangeText={(t) => setDraft((d) => ({ ...d, quantity: t.replace(/[^0-9.]/g, '') }))}
                placeholder="0"
                keyboardType="decimal-pad"
                error={errors.quantity}
              />

              <Text style={styles.fieldLabel}>Unit</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
                keyboardShouldPersistTaps="handled"
              >
                {MATERIAL_UNITS.map((unit) => {
                  const selected = draft.unit === unit;
                  return (
                    <TouchableOpacity
                      key={unit}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => setDraft((d) => ({ ...d, unit }))}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{unit}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <FormField
                label="Supplier"
                required
                value={draft.supplier}
                onChangeText={(t) => setDraft((d) => ({ ...d, supplier: t }))}
                placeholder="e.g. Marmara Beton"
                error={errors.supplier}
              />
              <FormField
                label="Delivery note number (optional)"
                value={draft.deliveryNoteNumber}
                onChangeText={(t) => setDraft((d) => ({ ...d, deliveryNoteNumber: t }))}
                placeholder="e.g. MB-44821"
                autoCapitalize="characters"
              />
              <FormField
                label="Received by (optional)"
                value={draft.receivedBy}
                onChangeText={(t) => setDraft((d) => ({ ...d, receivedBy: t }))}
                placeholder="Name of receiver"
              />
              <FormField
                label="Notes (optional)"
                multiline
                value={draft.notes}
                onChangeText={(t) => setDraft((d) => ({ ...d, notes: t }))}
                placeholder="Any relevant notes"
              />

              <TouchableOpacity style={styles.saveButton} onPress={save} activeOpacity={0.85}>
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Update Delivery' : 'Add Delivery'}
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
