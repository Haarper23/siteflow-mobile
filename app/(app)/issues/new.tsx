import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StepIndicator from '@/src/components/StepIndicator';
import FormField from '@/src/components/FormField';
import SelectionCard from '@/src/components/SelectionCard';
import PhotoPickerSection from '@/src/components/PhotoPickerSection';
import { colors } from '@/src/theme/colors';
import { PROJECTS } from '@/src/data/projects';
import { useIssues } from '@/src/context/IssueContext';
import { formatDisplayDate, createDueDateFromPreset, type DueDatePreset } from '@/src/utils/date';
import { getCategoryVisual } from '@/src/utils/issueDisplay';
import {
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  CATEGORY_LABELS,
  ASSIGNABLE_TEAMS,
  type IssueCategory,
  type IssueSeverity,
  type IssueDraftInput,
  type IssueFormData,
  type IssuePhoto,
} from '@/src/types/issue';

const STEP_LABELS = ['Location', 'Issue Details', 'Evidence', 'Assignment', 'Review'];

const FLOOR_QUICK_PICKS = ['Ground Floor', 'Basement 1', 'Roof'];

const SEVERITY_INFO: Record<IssueSeverity, string> = {
  LOW: 'Minor issue with no immediate impact',
  MEDIUM: 'Requires planned corrective action',
  HIGH: 'Needs urgent inspection or repair',
  CRITICAL: 'Immediate safety or structural risk',
};

const DUE_PRESETS: { key: DueDatePreset; label: string }[] = [
  { key: 'TODAY', label: 'Today' },
  { key: 'TOMORROW', label: 'Tomorrow' },
  { key: 'IN_3_DAYS', label: 'In 3 days' },
  { key: 'IN_7_DAYS', label: 'In 7 days' },
  { key: 'NONE', label: 'No due date' },
];

interface FormState {
  projectId: string;
  blockId: string;
  blockName: string;
  floor: string;
  area: string;
  category: IssueCategory | null;
  title: string;
  description: string;
  severity: IssueSeverity | null;
  assignedTeam: string;
  dueDate: string | null;
  photos: IssuePhoto[];
}

const EMPTY_FORM: FormState = {
  projectId: '',
  blockId: '',
  blockName: '',
  floor: '',
  area: '',
  category: null,
  title: '',
  description: '',
  severity: null,
  assignedTeam: '',
  dueDate: null,
  photos: [],
};

type StepErrors = Record<string, string>;

function isCategory(value: string | undefined): value is IssueCategory {
  return value !== undefined && (ISSUE_CATEGORIES as string[]).includes(value);
}

export default function NewIssueScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    draftId?: string;
    projectId?: string;
    blockId?: string;
    category?: string;
  }>();

  const { submitIssueFromDraft, saveDraft, getIssueById } = useIssues();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<StepErrors>({});
  const [duePreset, setDuePreset] = useState<DueDatePreset | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(undefined);

  // True once the report is committed (saved or submitted), so we skip the
  // "discard changes" prompt during the resulting navigation.
  const committedRef = useRef(false);
  const initializedRef = useRef(false);

  // Synchronous re-entrancy guard for the persistence handlers. `isSaving` only
  // updates on the next render, so two taps in the same frame can both pass a
  // state-based check; the ref is set before the first await to close that race.
  const submittingRef = useRef(false);

  // One-time initialisation from route params / existing draft.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (params.draftId) {
      const existing = getIssueById(params.draftId);
      if (existing) {
        setDraftId(existing.id);
        setForm({
          projectId: existing.projectId,
          blockId: existing.blockId,
          blockName: existing.blockName,
          floor: existing.floor,
          area: existing.area,
          category: existing.category,
          title: existing.title,
          description: existing.description,
          severity: existing.severity,
          assignedTeam: existing.assignedTeam,
          dueDate: existing.dueDate,
          photos: existing.photos,
        });
        return;
      }
    }

    // New report — apply optional pre-selections.
    const preProject = params.projectId
      ? PROJECTS.find((p) => p.id === params.projectId)
      : undefined;
    const preBlock = preProject && params.blockId
      ? preProject.blocks.find((b) => b.id === params.blockId)
      : undefined;

    setForm((prev) => ({
      ...prev,
      projectId: preProject?.id ?? '',
      blockId: preBlock?.id ?? '',
      blockName: preBlock?.name ?? '',
      category: isCategory(params.category) ? params.category : null,
    }));
  }, [params.draftId, params.projectId, params.blockId, params.category, getIssueById]);

  const selectedProject = useMemo(
    () => PROJECTS.find((p) => p.id === form.projectId),
    [form.projectId],
  );

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const clearError = useCallback((key: string) => {
    setErrors((prev) => {
      if (prev[key] === undefined) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // ---- Validation -------------------------------------------------------

  const validateStep = useCallback(
    (target: number): StepErrors => {
      const e: StepErrors = {};
      if (target === 0) {
        if (!form.projectId) e.projectId = 'Please select a project';
        if (!form.blockId) e.blockId = 'Please select a block or area';
        if (!form.floor.trim()) e.floor = 'Floor is required';
        if (!form.area.trim()) e.area = 'Exact location is required';
      } else if (target === 1) {
        if (!form.category) e.category = 'Please choose a category';
        if (!form.title.trim()) e.title = 'Issue title is required';
        else if (form.title.trim().length < 4) e.title = 'Title must be at least 4 characters';
        if (!form.description.trim()) e.description = 'Description is required';
        else if (form.description.trim().length < 15)
          e.description = 'Description must be at least 15 characters';
        if (!form.severity) e.severity = 'Please select a severity';
      } else if (target === 3) {
        if (!form.assignedTeam) e.assignedTeam = 'Please assign a team';
        if (duePreset === null && form.dueDate === null) {
          e.dueDate = 'Choose a due date or select "No due date"';
        }
      }
      return e;
    },
    [form, duePreset],
  );

  const goToStep = (target: number) => {
    setErrors({});
    setStep(target);
  };

  const handleContinue = () => {
    const stepErrors = validateStep(step);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  };

  // ---- Leaving / unsaved changes ---------------------------------------

  const attemptLeave = useCallback(
    (proceed: () => void) => {
      if (committedRef.current || !isDirty) {
        proceed();
        return;
      }
      Alert.alert('Discard report?', 'Your unsaved changes will be lost.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: proceed },
      ]);
    },
    [isDirty],
  );

  const handleBack = () => {
    if (step > 0) {
      goToStep(step - 1);
      return;
    }
    attemptLeave(() => router.back());
  };

  // Android hardware back button.
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (step > 0) {
          goToStep(step - 1);
          return true;
        }
        if (committedRef.current || !isDirty) {
          return false; // allow default behaviour (leave screen)
        }
        attemptLeave(() => router.back());
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [step, isDirty, attemptLeave]),
  );

  // ---- Persistence ------------------------------------------------------

  const buildDraftInput = (): IssueDraftInput => ({
    projectId: form.projectId,
    blockId: form.blockId,
    blockName: form.blockName,
    floor: form.floor,
    area: form.area,
    category: form.category,
    title: form.title,
    description: form.description,
    severity: form.severity,
    assignedTeam: form.assignedTeam,
    dueDate: form.dueDate,
    photos: form.photos,
  });

  const handleSaveDraft = async () => {
    // Engage the synchronous guard before any await; release it in `finally`
    // so a recoverable failure leaves the form usable for a retry.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSaving(true);
    try {
      const saved = await saveDraft(buildDraftInput(), draftId);
      setDraftId(saved.id);
      committedRef.current = true;
      Alert.alert('Draft saved', 'You can continue editing this report later from the Issues list.');
      router.replace('/issues');
    } catch {
      // Generic, safe message — keep the user on the form so their input is not
      // lost. No internal error detail is surfaced (see security rules).
      Alert.alert('Save failed', 'We could not save this draft. Please try again.');
    } finally {
      submittingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Engage the synchronous guard first so a same-frame second tap (which would
    // still read `isSaving === false`) cannot start a second submit. Validation
    // returns below run inside the try, so `finally` always releases the guard.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSaving(true);
    try {
      // Validate every step that has requirements.
      for (const target of [0, 1, 3]) {
        const stepErrors = validateStep(target);
        if (Object.keys(stepErrors).length > 0) {
          setErrors(stepErrors);
          setStep(target);
          return;
        }
      }

      // All required fields are present, so category and severity are set.
      if (!form.category || !form.severity) return;

      const payload: IssueFormData = {
        projectId: form.projectId,
        blockId: form.blockId,
        blockName: form.blockName,
        floor: form.floor.trim(),
        area: form.area.trim(),
        category: form.category,
        title: form.title,
        description: form.description,
        severity: form.severity,
        assignedTeam: form.assignedTeam,
        dueDate: form.dueDate,
        photos: form.photos,
      };

      // Atomically replace the originating draft (if any) with the submitted
      // issue in a single update + persist, so no stale draft can resurrect.
      const created = await submitIssueFromDraft(payload, draftId);
      committedRef.current = true;
      router.replace({ pathname: '/issues/[id]', params: { id: created.id } });
    } catch {
      // Generic, safe message — leave the form editable so the report is not lost.
      Alert.alert('Submit failed', 'We could not submit this issue. Please try again.');
    } finally {
      submittingRef.current = false;
      setIsSaving(false);
    }
  };

  // ---- Step renderers ---------------------------------------------------

  const renderLocation = () => (
    <View>
      <Text style={styles.stepTitle}>Where is the issue?</Text>
      <Text style={styles.stepSubtitle}>Pinpoint the project, block and exact location.</Text>

      <Text style={styles.fieldLabel}>Project *</Text>
      {PROJECTS.map((p) => (
        <SelectionCard
          key={p.id}
          title={p.name}
          subtitle={`${p.code} · ${p.district}, ${p.city}`}
          icon="office-building-outline"
          selected={form.projectId === p.id}
          onPress={() => {
            if (form.projectId !== p.id) {
              // Changing project clears the block selection.
              setForm((prev) => ({ ...prev, projectId: p.id, blockId: '', blockName: '' }));
              setIsDirty(true);
              clearError('projectId');
              clearError('blockId');
            }
          }}
        />
      ))}
      {errors.projectId !== undefined && <Text style={styles.errorText}>{errors.projectId}</Text>}

      {selectedProject !== undefined && (
        <>
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Block or Area *</Text>
          {selectedProject.blocks.map((b) => (
            <SelectionCard
              key={b.id}
              title={b.name}
              subtitle={`${b.floorCount} floors`}
              trailing={`${b.progress}%`}
              icon="view-grid-outline"
              selected={form.blockId === b.id}
              onPress={() => {
                setForm((prev) => ({ ...prev, blockId: b.id, blockName: b.name }));
                setIsDirty(true);
                clearError('blockId');
              }}
            />
          ))}
          {errors.blockId !== undefined && <Text style={styles.errorText}>{errors.blockId}</Text>}
        </>
      )}

      <View style={styles.fieldLabelSpaced}>
        <FormField
          label="Floor"
          required
          value={form.floor}
          onChangeText={(t) => {
            update('floor', t);
            clearError('floor');
          }}
          placeholder="e.g. Ground Floor, Basement 1, 4, Roof"
          error={errors.floor}
          returnKeyType="next"
        />
        <View style={styles.quickPickRow}>
          {FLOOR_QUICK_PICKS.map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.quickPick, form.floor === value && styles.quickPickActive]}
              onPress={() => {
                update('floor', value);
                clearError('floor');
              }}
              activeOpacity={0.75}
            >
              <Text
                style={[styles.quickPickText, form.floor === value && styles.quickPickTextActive]}
              >
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.fieldLabelSpaced}>
        <FormField
          label="Room or exact location"
          required
          value={form.area}
          onChangeText={(t) => {
            update('area', t);
            clearError('area');
          }}
          placeholder="Apartment 402, north wall"
          error={errors.area}
          returnKeyType="done"
        />
      </View>
    </View>
  );

  const renderDetails = () => (
    <View>
      <Text style={styles.stepTitle}>Describe the issue</Text>
      <Text style={styles.stepSubtitle}>Categorise the issue and describe what was observed.</Text>

      <Text style={styles.fieldLabel}>Category *</Text>
      <View style={styles.categoryGrid}>
        {ISSUE_CATEGORIES.map((cat) => {
          const visual = getCategoryVisual(cat);
          const selected = form.category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryCard, selected && styles.categoryCardSelected]}
              onPress={() => {
                update('category', cat);
                clearError('category');
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={CATEGORY_LABELS[cat]}
            >
              <View style={[styles.categoryIcon, { backgroundColor: visual.color + '1A' }]}>
                <MaterialCommunityIcons name={visual.icon} size={20} color={visual.color} />
              </View>
              <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {errors.category !== undefined && <Text style={styles.errorText}>{errors.category}</Text>}

      <View style={styles.fieldLabelSpaced}>
        <FormField
          label="Issue title"
          required
          value={form.title}
          onChangeText={(t) => {
            update('title', t);
            clearError('title');
          }}
          placeholder="Concrete crack near window opening"
          error={errors.title}
          maxLength={120}
          returnKeyType="next"
        />

        <FormField
          label="Detailed description"
          required
          multiline
          value={form.description}
          onChangeText={(t) => {
            update('description', t);
            clearError('description');
          }}
          placeholder="Describe what was observed, when it was found and any immediate action taken."
          error={errors.description}
          hint="Minimum 15 characters."
        />
      </View>

      <Text style={styles.fieldLabel}>Severity *</Text>
      {ISSUE_SEVERITIES.map((sev) => (
        <SelectionCard
          key={sev}
          title={sev.charAt(0) + sev.slice(1).toLowerCase()}
          description={SEVERITY_INFO[sev]}
          icon="flag-outline"
          selected={form.severity === sev}
          onPress={() => {
            update('severity', sev);
            clearError('severity');
          }}
        />
      ))}
      {errors.severity !== undefined && <Text style={styles.errorText}>{errors.severity}</Text>}
    </View>
  );

  const renderEvidence = () => (
    <View>
      <Text style={styles.stepTitle}>Add photo evidence</Text>
      <Text style={styles.stepSubtitle}>
        Attach up to 5 photos. Photos are optional but strongly recommended.
      </Text>
      <PhotoPickerSection photos={form.photos} onChange={(photos) => update('photos', photos)} />
    </View>
  );

  const renderAssignment = () => (
    <View>
      <Text style={styles.stepTitle}>Assign corrective action</Text>
      <Text style={styles.stepSubtitle}>Choose the responsible team and a target due date.</Text>

      <Text style={styles.fieldLabel}>Assigned Team *</Text>
      {ASSIGNABLE_TEAMS.map((team) => (
        <SelectionCard
          key={team}
          title={team}
          icon="account-hard-hat-outline"
          selected={form.assignedTeam === team}
          onPress={() => {
            update('assignedTeam', team);
            clearError('assignedTeam');
          }}
        />
      ))}
      {errors.assignedTeam !== undefined && (
        <Text style={styles.errorText}>{errors.assignedTeam}</Text>
      )}

      <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Due Date</Text>
      <View style={styles.dueRow}>
        {DUE_PRESETS.map((preset) => {
          const selected = duePreset === preset.key;
          return (
            <TouchableOpacity
              key={preset.key}
              style={[styles.duePill, selected && styles.duePillActive]}
              onPress={() => {
                setDuePreset(preset.key);
                update('dueDate', createDueDateFromPreset(preset.key));
                clearError('dueDate');
              }}
              activeOpacity={0.75}
            >
              <Text style={[styles.duePillText, selected && styles.duePillTextActive]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {form.dueDate !== null && (
        <Text style={styles.duePreview}>Due {formatDisplayDate(form.dueDate)}</Text>
      )}
      {errors.dueDate !== undefined && <Text style={styles.errorText}>{errors.dueDate}</Text>}

      <View style={styles.noteBox}>
        <MaterialCommunityIcons name="information-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.noteText}>
          Assigned teams will be notified once backend integration is available. Issues are
          currently saved on this device.
        </Text>
      </View>
    </View>
  );

  const renderReview = () => {
    const categoryLabel = form.category ? CATEGORY_LABELS[form.category] : '—';
    const severityLabel = form.severity
      ? form.severity.charAt(0) + form.severity.slice(1).toLowerCase()
      : '—';

    return (
      <View>
        <Text style={styles.stepTitle}>Review report</Text>
        <Text style={styles.stepSubtitle}>Check the details before submitting.</Text>

        <ReviewSection title="Project and location" onEdit={() => goToStep(0)}>
          <ReviewRow label="Project" value={selectedProject?.name ?? '—'} />
          <ReviewRow label="Block" value={form.blockName || '—'} />
          <ReviewRow label="Floor" value={form.floor || '—'} />
          <ReviewRow label="Location" value={form.area || '—'} />
        </ReviewSection>

        <ReviewSection title="Issue details" onEdit={() => goToStep(1)}>
          <ReviewRow label="Category" value={categoryLabel} />
          <ReviewRow label="Title" value={form.title || '—'} />
          <ReviewRow label="Description" value={form.description || '—'} />
          <ReviewRow label="Severity" value={severityLabel} />
        </ReviewSection>

        <ReviewSection title="Evidence" onEdit={() => goToStep(2)}>
          <ReviewRow
            label="Photos"
            value={form.photos.length > 0 ? `${form.photos.length} attached` : 'None attached'}
          />
        </ReviewSection>

        <ReviewSection title="Assignment" onEdit={() => goToStep(3)}>
          <ReviewRow label="Assigned team" value={form.assignedTeam || '—'} />
          <ReviewRow
            label="Due date"
            value={form.dueDate !== null ? formatDisplayDate(form.dueDate) : 'No due date'}
          />
        </ReviewSection>

        <View style={styles.submitGroup}>
          <TouchableOpacity
            style={[styles.submitBtn, isSaving && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="send-outline" size={18} color={colors.background} />
                <Text style={styles.submitBtnText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.draftBtn, isSaving && styles.btnDisabled]}
            onPress={handleSaveDraft}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            <Text style={styles.draftBtnText}>Save as Draft</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return renderLocation();
      case 1:
        return renderDetails();
      case 2:
        return renderEvidence();
      case 3:
        return renderAssignment();
      default:
        return renderReview();
    }
  };

  const isReview = step === STEP_LABELS.length - 1;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleBack}
            accessibilityLabel={step > 0 ? 'Previous step' : 'Go back'}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{draftId ? 'Edit Report' : 'New Report'}</Text>
          <TouchableOpacity
            style={styles.headerDraftBtn}
            onPress={handleSaveDraft}
            disabled={isSaving}
            accessibilityLabel="Save draft"
          >
            <Text style={styles.headerDraftText}>Save Draft</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.stepIndicatorWrap}>
          <StepIndicator steps={STEP_LABELS} currentStep={step} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      {/* Footer navigation (hidden on review where submit lives) */}
      {!isReview && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.footerBackBtn}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Text style={styles.footerBackText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.footerNextBtn}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <Text style={styles.footerNextText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ---- Review helpers -----------------------------------------------------

interface ReviewSectionProps {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}

function ReviewSection({ title, onEdit, children }: ReviewSectionProps) {
  return (
    <View style={styles.reviewSection}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewTitle}>{title}</Text>
        <TouchableOpacity
          onPress={onEdit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Edit ${title}`}
          style={styles.reviewEdit}
        >
          <MaterialCommunityIcons name="pencil-outline" size={14} color={colors.primary} />
          <Text style={styles.reviewEditText}>Edit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.reviewBody}>{children}</View>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
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
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerDraftBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerDraftText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  stepIndicatorWrap: {
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  fieldLabelSpaced: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 2,
    marginBottom: 8,
    marginLeft: 2,
  },
  quickPickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -8,
    marginBottom: 8,
  },
  quickPick: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickPickActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary + '80',
  },
  quickPickText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  quickPickTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 8,
  },
  categoryCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: colors.textPrimary,
  },
  dueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  duePill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  duePillActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary + '80',
  },
  duePillText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  duePillTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  duePreview: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 12,
  },
  noteBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 20,
    alignItems: 'flex-start',
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  reviewSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reviewEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewEditText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  reviewBody: {
    gap: 10,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  reviewLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    flexShrink: 0,
    width: 96,
  },
  reviewValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  submitGroup: {
    marginTop: 8,
    gap: 10,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  draftBtn: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  draftBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerBackBtn: {
    paddingHorizontal: 22,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerBackText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  footerNextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  footerNextText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background,
  },
});
