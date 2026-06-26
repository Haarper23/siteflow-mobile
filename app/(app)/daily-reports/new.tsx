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
import WeatherSelector from '@/src/components/WeatherSelector';
import WorkforceEditor from '@/src/components/WorkforceEditor';
import WorkActivityEditor from '@/src/components/WorkActivityEditor';
import MaterialDeliveryEditor from '@/src/components/MaterialDeliveryEditor';
import EquipmentEditor from '@/src/components/EquipmentEditor';
import PhotoPickerSection from '@/src/components/PhotoPickerSection';
import LinkedIssueSelector from '@/src/components/LinkedIssueSelector';
import { colors } from '@/src/theme/colors';
import { PROJECTS } from '@/src/data/projects';
import { useDailyReports } from '@/src/context/DailyReportContext';
import {
  WORK_SHIFTS,
  WORK_SHIFT_LABELS,
  SITE_CONDITIONS,
  SITE_CONDITION_LABELS,
  WEATHER_LABELS,
  totalWorkers,
  type DailyReportFormData,
} from '@/src/types/dailyReport';
import { getTodayISODate, formatReportDate } from '@/src/utils/date';

const STEP_LABELS = [
  'Project',
  'Conditions',
  'Workforce',
  'Progress',
  'Resources',
  'Safety',
  'Review',
];

const MAX_DAILY_PHOTOS = 10;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

function yesterdayIso(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createInitialForm(): DailyReportFormData {
  return {
    projectId: '',
    reportDate: getTodayISODate(),
    shift: 'DAY',
    weather: null,
    minimumTemperature: '',
    maximumTemperature: '',
    siteCondition: null,
    workStartTime: '',
    workEndTime: '',
    workforce: [],
    activities: [],
    materialDeliveries: [],
    equipment: [],
    safetyBriefingCompleted: true,
    accidentOccurred: false,
    accidentDescription: '',
    safetyNotes: '',
    delayOccurred: false,
    delayReason: '',
    visitorCount: '0',
    generalNotes: '',
    photos: [],
    linkedIssueIds: [],
  };
}

type StepErrors = Record<string, string>;

interface YesNoToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  danger?: boolean;
}

function YesNoToggle({ value, onChange, danger = false }: YesNoToggleProps) {
  const activeColor = danger ? colors.danger : colors.primary;
  return (
    <View style={styles.toggleRow}>
      <TouchableOpacity
        style={[styles.toggleOption, value && { borderColor: activeColor, backgroundColor: activeColor + '14' }]}
        onPress={() => onChange(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: value }}
      >
        <Text style={[styles.toggleText, value && { color: activeColor }]}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleOption, !value && styles.toggleOptionActiveNeutral]}
        onPress={() => onChange(false)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: !value }}
      >
        <Text style={[styles.toggleText, !value && { color: colors.textPrimary }]}>No</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function NewDailyReportScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ draftId?: string; projectId?: string; date?: string }>();

  const { submitReportFromDraft, saveDraft, getReportById, reports } = useDailyReports();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<DailyReportFormData>(createInitialForm);
  const [errors, setErrors] = useState<StepErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(undefined);

  const committedRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (params.draftId) {
      const existing = getReportById(params.draftId);
      if (existing) {
        setDraftId(existing.id);
        setForm({
          projectId: existing.projectId,
          reportDate: existing.reportDate,
          shift: existing.shift,
          weather: existing.weather,
          minimumTemperature:
            existing.minimumTemperature !== undefined ? String(existing.minimumTemperature) : '',
          maximumTemperature:
            existing.maximumTemperature !== undefined ? String(existing.maximumTemperature) : '',
          siteCondition: existing.siteCondition,
          workStartTime: existing.workStartTime ?? '',
          workEndTime: existing.workEndTime ?? '',
          workforce: existing.workforce,
          activities: existing.activities,
          materialDeliveries: existing.materialDeliveries,
          equipment: existing.equipment,
          safetyBriefingCompleted: existing.safetyBriefingCompleted,
          accidentOccurred: existing.accidentOccurred,
          accidentDescription: existing.accidentDescription ?? '',
          safetyNotes: existing.safetyNotes,
          delayOccurred: existing.delayOccurred,
          delayReason: existing.delayReason ?? '',
          visitorCount: String(existing.visitorCount),
          generalNotes: existing.generalNotes,
          photos: existing.photos,
          linkedIssueIds: existing.linkedIssueIds,
        });
        return;
      }
    }

    const preProject = params.projectId
      ? PROJECTS.find((p) => p.id === params.projectId)
      : undefined;
    setForm((prev) => ({
      ...prev,
      projectId: preProject?.id ?? '',
      reportDate: params.date && isValidIsoDate(params.date) ? params.date : prev.reportDate,
    }));
  }, [params.draftId, params.projectId, params.date, getReportById]);

  const selectedProject = useMemo(
    () => PROJECTS.find((p) => p.id === form.projectId),
    [form.projectId],
  );

  const blockOptions = useMemo(
    () => (selectedProject ? selectedProject.blocks.map((b) => ({ id: b.id, name: b.name })) : []),
    [selectedProject],
  );

  // A submitted/approved report already filed for this project + date.
  const duplicateReport = useMemo(
    () =>
      reports.find(
        (r) =>
          r.projectId === form.projectId &&
          r.reportDate === form.reportDate &&
          (r.status === 'SUBMITTED' || r.status === 'APPROVED'),
      ),
    [reports, form.projectId, form.reportDate],
  );

  const update = useCallback(
    <K extends keyof DailyReportFormData>(key: K, value: DailyReportFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setIsDirty(true);
    },
    [],
  );

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
        if (!form.reportDate.trim()) e.reportDate = 'Report date is required';
        else if (!isValidIsoDate(form.reportDate.trim()))
          e.reportDate = 'Use a valid date in YYYY-MM-DD format';
      } else if (target === 1) {
        if (!form.weather) e.weather = 'Please select the weather';
        if (!form.siteCondition) e.siteCondition = 'Please select the site condition';
        const min = form.minimumTemperature.trim();
        const max = form.maximumTemperature.trim();
        const minNum = min === '' ? null : Number(min);
        const maxNum = max === '' ? null : Number(max);
        if (minNum !== null && !Number.isFinite(minNum)) e.minimumTemperature = 'Enter a valid number';
        if (maxNum !== null && !Number.isFinite(maxNum)) e.maximumTemperature = 'Enter a valid number';
        if (
          minNum !== null &&
          maxNum !== null &&
          Number.isFinite(minNum) &&
          Number.isFinite(maxNum) &&
          minNum > maxNum
        ) {
          e.maximumTemperature = 'Maximum must be greater than or equal to minimum';
        }
      } else if (target === 5) {
        if (form.accidentOccurred && form.accidentDescription.trim() === '') {
          e.accidentDescription = 'Describe the incident';
        }
        if (form.delayOccurred && form.delayReason.trim() === '') {
          e.delayReason = 'Provide a reason for the delay';
        }
        const visitors = form.visitorCount.trim();
        if (visitors !== '' && (!Number.isFinite(Number(visitors)) || Number(visitors) < 0)) {
          e.visitorCount = 'Visitor count must be zero or greater';
        }
      }
      return e;
    },
    [form],
  );

  const validateForSubmit = useCallback((): { step: number; errors: StepErrors } | null => {
    for (const target of [0, 1, 5]) {
      const stepErrors = validateStep(target);
      if (Object.keys(stepErrors).length > 0) return { step: target, errors: stepErrors };
    }
    if (form.workforce.length === 0) {
      return { step: 2, errors: { workforce: 'Add at least one workforce entry' } };
    }
    if (form.activities.length === 0) {
      return { step: 3, errors: { activities: 'Add at least one work activity' } };
    }
    return null;
  }, [validateStep, form.workforce.length, form.activities.length]);

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
      Alert.alert('Discard daily report?', 'Your unsaved changes will be lost.', [
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

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (step > 0) {
          goToStep(step - 1);
          return true;
        }
        if (committedRef.current || !isDirty) return false;
        attemptLeave(() => router.back());
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [step, isDirty, attemptLeave]),
  );

  // ---- Persistence ------------------------------------------------------

  const handleSaveDraft = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = await saveDraft(form, draftId);
      setDraftId(saved.id);
      committedRef.current = true;
      Alert.alert('Draft saved', 'You can continue editing this daily report later.');
      router.replace('/daily-reports');
    } catch {
      // Generic, safe message — keep the user on the form so their input is not
      // lost. No internal error detail is surfaced (see security rules).
      Alert.alert('Save failed', 'We could not save this draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (isSaving) return;

    const invalid = validateForSubmit();
    if (invalid) {
      setErrors(invalid.errors);
      setStep(invalid.step);
      return;
    }

    if (duplicateReport) {
      Alert.alert(
        'Duplicate report',
        `A ${duplicateReport.status === 'APPROVED' ? 'approved' : 'submitted'} report already exists for this project on ${formatReportDate(form.reportDate)}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open existing',
            onPress: () => {
              committedRef.current = true;
              router.replace({ pathname: '/daily-reports/[id]', params: { id: duplicateReport.id } });
            },
          },
        ],
      );
      return;
    }

    setIsSaving(true);
    try {
      // Atomically replace the originating draft (if any) with the submitted
      // report in a single update + persist, so no stale draft can resurrect.
      const created = await submitReportFromDraft(form, draftId);
      committedRef.current = true;
      router.replace({ pathname: '/daily-reports/[id]', params: { id: created.id } });
    } catch {
      // Generic, safe message — leave the form editable so the report is not lost.
      Alert.alert('Submit failed', 'We could not submit this report. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Step renderers ---------------------------------------------------

  const renderProjectDate = () => (
    <View>
      <Text style={styles.stepTitle}>Report information</Text>
      <Text style={styles.stepSubtitle}>Select the project, date and shift for this report.</Text>

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
              update('projectId', p.id);
              clearError('projectId');
            }
          }}
        />
      ))}
      {errors.projectId !== undefined && <Text style={styles.errorText}>{errors.projectId}</Text>}

      <View style={styles.fieldLabelSpaced}>
        <FormField
          label="Report date"
          required
          value={form.reportDate}
          onChangeText={(t) => {
            update('reportDate', t);
            clearError('reportDate');
          }}
          placeholder="YYYY-MM-DD"
          error={errors.reportDate}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
        />
        <View style={styles.quickPickRow}>
          <TouchableOpacity
            style={[styles.quickPick, form.reportDate === getTodayISODate() && styles.quickPickActive]}
            onPress={() => {
              update('reportDate', getTodayISODate());
              clearError('reportDate');
            }}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.quickPickText,
                form.reportDate === getTodayISODate() && styles.quickPickTextActive,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickPick, form.reportDate === yesterdayIso() && styles.quickPickActive]}
            onPress={() => {
              update('reportDate', yesterdayIso());
              clearError('reportDate');
            }}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.quickPickText,
                form.reportDate === yesterdayIso() && styles.quickPickTextActive,
              ]}
            >
              Yesterday
            </Text>
          </TouchableOpacity>
        </View>
        {isValidIsoDate(form.reportDate) && (
          <Text style={styles.datePreview}>{formatReportDate(form.reportDate)}</Text>
        )}
      </View>

      {duplicateReport && (
        <View style={styles.warningBox}>
          <MaterialCommunityIcons name="alert-outline" size={18} color={colors.warning} />
          <View style={styles.warningBody}>
            <Text style={styles.warningText}>
              A {duplicateReport.status === 'APPROVED' ? 'approved' : 'submitted'} report already
              exists for this project on this date.
            </Text>
            <TouchableOpacity
              onPress={() => {
                committedRef.current = true;
                router.replace({ pathname: '/daily-reports/[id]', params: { id: duplicateReport.id } });
              }}
            >
              <Text style={styles.warningLink}>Open existing report</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Work shift *</Text>
      <View style={styles.chipWrap}>
        {WORK_SHIFTS.map((shift) => {
          const selected = form.shift === shift;
          return (
            <TouchableOpacity
              key={shift}
              style={[styles.pill, selected && styles.pillActive]}
              onPress={() => update('shift', shift)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                {WORK_SHIFT_LABELS[shift]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <FormField
            label="Start time (optional)"
            value={form.workStartTime}
            onChangeText={(t) => update('workStartTime', t)}
            placeholder="07:30"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={styles.timeField}>
          <FormField
            label="End time (optional)"
            value={form.workEndTime}
            onChangeText={(t) => update('workEndTime', t)}
            placeholder="17:30"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>
    </View>
  );

  const renderConditions = () => (
    <View>
      <Text style={styles.stepTitle}>Site conditions</Text>
      <Text style={styles.stepSubtitle}>Record the weather and ground conditions on site.</Text>

      <Text style={styles.fieldLabel}>Weather *</Text>
      <WeatherSelector
        value={form.weather}
        onChange={(value) => {
          update('weather', value);
          clearError('weather');
        }}
      />
      {errors.weather !== undefined && <Text style={styles.errorText}>{errors.weather}</Text>}

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <FormField
            label="Min temp °C (optional)"
            value={form.minimumTemperature}
            onChangeText={(t) => {
              update('minimumTemperature', t.replace(/[^0-9-]/g, ''));
              clearError('minimumTemperature');
            }}
            placeholder="e.g. 14"
            keyboardType="numbers-and-punctuation"
            error={errors.minimumTemperature}
          />
        </View>
        <View style={styles.timeField}>
          <FormField
            label="Max temp °C (optional)"
            value={form.maximumTemperature}
            onChangeText={(t) => {
              update('maximumTemperature', t.replace(/[^0-9-]/g, ''));
              clearError('maximumTemperature');
            }}
            placeholder="e.g. 27"
            keyboardType="numbers-and-punctuation"
            error={errors.maximumTemperature}
          />
        </View>
      </View>

      <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Site condition *</Text>
      <View style={styles.chipWrap}>
        {SITE_CONDITIONS.map((condition) => {
          const selected = form.siteCondition === condition;
          return (
            <TouchableOpacity
              key={condition}
              style={[styles.pill, selected && styles.pillActive]}
              onPress={() => {
                update('siteCondition', condition);
                clearError('siteCondition');
              }}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                {SITE_CONDITION_LABELS[condition]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {errors.siteCondition !== undefined && (
        <Text style={styles.errorText}>{errors.siteCondition}</Text>
      )}
    </View>
  );

  const renderWorkforce = () => (
    <View>
      <Text style={styles.stepTitle}>Workforce on site</Text>
      <Text style={styles.stepSubtitle}>
        Add each trade working today. At least one entry is required to submit.
      </Text>
      <WorkforceEditor
        entries={form.workforce}
        onChange={(entries) => {
          update('workforce', entries);
          clearError('workforce');
        }}
      />
      {errors.workforce !== undefined && <Text style={styles.errorText}>{errors.workforce}</Text>}
    </View>
  );

  const renderProgress = () => (
    <View>
      <Text style={styles.stepTitle}>Work completed today</Text>
      <Text style={styles.stepSubtitle}>
        Log the activities carried out. At least one activity is required to submit.
      </Text>
      <WorkActivityEditor
        activities={form.activities}
        blocks={blockOptions}
        onChange={(activities) => {
          update('activities', activities);
          clearError('activities');
        }}
      />
      {errors.activities !== undefined && <Text style={styles.errorText}>{errors.activities}</Text>}
    </View>
  );

  const renderResources = () => (
    <View>
      <Text style={styles.stepTitle}>Resources and deliveries</Text>
      <Text style={styles.stepSubtitle}>
        Record material deliveries and equipment on site. Both are optional.
      </Text>

      <Text style={styles.sectionLabel}>Material Deliveries</Text>
      <MaterialDeliveryEditor
        deliveries={form.materialDeliveries}
        onChange={(deliveries) => update('materialDeliveries', deliveries)}
      />

      <Text style={[styles.sectionLabel, styles.fieldLabelSpaced]}>Equipment</Text>
      <EquipmentEditor
        equipment={form.equipment}
        onChange={(equipment) => update('equipment', equipment)}
      />
    </View>
  );

  const renderSafety = () => (
    <View>
      <Text style={styles.stepTitle}>Safety and site evidence</Text>
      <Text style={styles.stepSubtitle}>Capture safety status, delays, visitors and photos.</Text>

      <Text style={styles.fieldLabel}>Safety briefing completed</Text>
      <YesNoToggle
        value={form.safetyBriefingCompleted}
        onChange={(value) => update('safetyBriefingCompleted', value)}
      />

      <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Accident occurred</Text>
      <YesNoToggle
        value={form.accidentOccurred}
        onChange={(value) => {
          update('accidentOccurred', value);
          if (!value) clearError('accidentDescription');
        }}
        danger
      />
      {form.accidentOccurred && (
        <View style={styles.accidentBox}>
          <View style={styles.accidentHeader}>
            <MaterialCommunityIcons name="alert-octagon-outline" size={16} color={colors.danger} />
            <Text style={styles.accidentHeaderText}>Incident details required</Text>
          </View>
          <FormField
            label="Accident description"
            required
            multiline
            value={form.accidentDescription}
            onChangeText={(t) => {
              update('accidentDescription', t);
              clearError('accidentDescription');
            }}
            placeholder="Describe what happened and the immediate response taken."
            error={errors.accidentDescription}
          />
        </View>
      )}

      <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Delay occurred</Text>
      <YesNoToggle
        value={form.delayOccurred}
        onChange={(value) => {
          update('delayOccurred', value);
          if (!value) clearError('delayReason');
        }}
      />
      {form.delayOccurred && (
        <FormField
          label="Delay reason"
          required
          multiline
          value={form.delayReason}
          onChangeText={(t) => {
            update('delayReason', t);
            clearError('delayReason');
          }}
          placeholder="e.g. Concrete delivery delayed due to traffic"
          error={errors.delayReason}
        />
      )}

      <View style={styles.fieldLabelSpaced}>
        <FormField
          label="Visitor count"
          value={form.visitorCount}
          onChangeText={(t) => {
            update('visitorCount', t.replace(/[^0-9]/g, ''));
            clearError('visitorCount');
          }}
          placeholder="0"
          keyboardType="number-pad"
          error={errors.visitorCount}
        />
        <FormField
          label="Safety notes (optional)"
          multiline
          value={form.safetyNotes}
          onChangeText={(t) => update('safetyNotes', t)}
          placeholder="Toolbox talks, observations, corrective actions"
        />
        <FormField
          label="General notes (optional)"
          multiline
          value={form.generalNotes}
          onChangeText={(t) => update('generalNotes', t)}
          placeholder="Any other notes about the day"
        />
      </View>

      <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Photo evidence</Text>
      <PhotoPickerSection
        photos={form.photos}
        onChange={(photos) => update('photos', photos)}
        maxPhotos={MAX_DAILY_PHOTOS}
      />

      <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Linked Issues</Text>
      <LinkedIssueSelector
        projectId={form.projectId}
        selectedIds={form.linkedIssueIds}
        onChange={(ids) => update('linkedIssueIds', ids)}
      />
    </View>
  );

  const renderReview = () => {
    const workers = totalWorkers(form.workforce);
    const completed = form.activities.filter((a) => a.status === 'COMPLETED').length;
    const blocked = form.activities.filter((a) => a.status === 'BLOCKED').length;

    return (
      <View>
        <Text style={styles.stepTitle}>Review daily report</Text>
        <Text style={styles.stepSubtitle}>Check everything before submitting.</Text>

        <View style={styles.totalsGrid}>
          <TotalTile label="Workers" value={workers} />
          <TotalTile label="Activities" value={form.activities.length} />
          <TotalTile label="Completed" value={completed} />
          <TotalTile label="Blocked" value={blocked} accent={blocked > 0} />
          <TotalTile label="Deliveries" value={form.materialDeliveries.length} />
          <TotalTile label="Equipment" value={form.equipment.length} />
          <TotalTile label="Linked Issues" value={form.linkedIssueIds.length} />
          <TotalTile label="Photos" value={form.photos.length} />
        </View>

        <ReviewSection title="Project and date" onEdit={() => goToStep(0)}>
          <ReviewRow label="Project" value={selectedProject?.name ?? '—'} />
          <ReviewRow label="Date" value={formatReportDate(form.reportDate)} />
          <ReviewRow label="Shift" value={WORK_SHIFT_LABELS[form.shift]} />
          <ReviewRow
            label="Hours"
            value={
              form.workStartTime || form.workEndTime
                ? `${form.workStartTime || '—'} – ${form.workEndTime || '—'}`
                : 'Not recorded'
            }
          />
        </ReviewSection>

        <ReviewSection title="Weather and condition" onEdit={() => goToStep(1)}>
          <ReviewRow label="Weather" value={form.weather ? WEATHER_LABELS[form.weather] : '—'} />
          <ReviewRow
            label="Site"
            value={form.siteCondition ? SITE_CONDITION_LABELS[form.siteCondition] : '—'}
          />
          <ReviewRow
            label="Temp"
            value={
              form.minimumTemperature || form.maximumTemperature
                ? `${form.minimumTemperature || '—'}° / ${form.maximumTemperature || '—'}°`
                : 'Not recorded'
            }
          />
        </ReviewSection>

        <ReviewSection title="Workforce" onEdit={() => goToStep(2)}>
          <ReviewRow label="Total" value={`${workers} workers`} />
          <ReviewRow label="Entries" value={`${form.workforce.length} trades`} />
        </ReviewSection>

        <ReviewSection title="Work activities" onEdit={() => goToStep(3)}>
          <ReviewRow label="Logged" value={`${form.activities.length} activities`} />
          <ReviewRow label="Completed" value={`${completed}`} />
          <ReviewRow label="Blocked" value={`${blocked}`} />
        </ReviewSection>

        <ReviewSection title="Resources" onEdit={() => goToStep(4)}>
          <ReviewRow label="Deliveries" value={`${form.materialDeliveries.length}`} />
          <ReviewRow label="Equipment" value={`${form.equipment.length}`} />
        </ReviewSection>

        <ReviewSection title="Safety and delays" onEdit={() => goToStep(5)}>
          <ReviewRow label="Briefing" value={form.safetyBriefingCompleted ? 'Completed' : 'Not done'} />
          <ReviewRow label="Accident" value={form.accidentOccurred ? 'Yes' : 'No'} />
          <ReviewRow label="Delay" value={form.delayOccurred ? 'Yes' : 'No'} />
          <ReviewRow label="Visitors" value={form.visitorCount || '0'} />
          <ReviewRow label="Photos" value={`${form.photos.length} attached`} />
          <ReviewRow label="Linked issues" value={`${form.linkedIssueIds.length}`} />
        </ReviewSection>

        {form.generalNotes.trim() !== '' && (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>General notes</Text>
            <Text style={styles.notesText}>{form.generalNotes.trim()}</Text>
          </View>
        )}

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
                <Text style={styles.submitBtnText}>Submit Daily Report</Text>
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
        return renderProjectDate();
      case 1:
        return renderConditions();
      case 2:
        return renderWorkforce();
      case 3:
        return renderProgress();
      case 4:
        return renderResources();
      case 5:
        return renderSafety();
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
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleBack}
            accessibilityLabel={step > 0 ? 'Previous step' : 'Go back'}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{draftId ? 'Edit Daily Report' : 'New Daily Report'}</Text>
          <TouchableOpacity
            style={styles.headerDraftBtn}
            onPress={handleSaveDraft}
            disabled={isSaving}
            accessibilityLabel="Save draft"
          >
            <Text style={styles.headerDraftText}>Save Draft</Text>
          </TouchableOpacity>
        </View>
        <StepIndicator steps={STEP_LABELS} currentStep={step} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      {!isReview && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={styles.footerBackBtn} onPress={handleBack} activeOpacity={0.8}>
            <Text style={styles.footerBackText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerNextBtn} onPress={handleContinue} activeOpacity={0.85}>
            <Text style={styles.footerNextText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.background} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function TotalTile({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <View style={styles.totalTile}>
      <Text style={[styles.totalValue, accent && { color: colors.danger }]}>{value}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

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
      <Text style={styles.reviewValue} numberOfLines={2}>
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
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
    gap: 8,
    marginTop: -8,
    marginBottom: 8,
  },
  quickPick: {
    paddingHorizontal: 14,
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
  datePreview: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.warning + '14',
    borderWidth: 1,
    borderColor: colors.warning + '50',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    alignItems: 'flex-start',
  },
  warningBody: {
    flex: 1,
    gap: 6,
  },
  warningText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  warningLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary + '80',
  },
  pillText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  timeField: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleOption: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOptionActiveNeutral: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '14',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  accidentBox: {
    backgroundColor: colors.danger + '0E',
    borderWidth: 1,
    borderColor: colors.danger + '40',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  accidentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  accidentHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  totalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  totalTile: {
    width: '23%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
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
    width: 100,
  },
  reviewValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    gap: 6,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  notesText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
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
