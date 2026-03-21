import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Clock,
  UserX,
  Shield,
  MapPin,
  Lock,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowRight,
  Zap,
  Bell,
  Briefcase,
  ShieldAlert,
  CheckCircle2,
  X,
} from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/navigation/PageHeader';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/data-display/EmptyState';
import { useToast } from '@/components/ui/Toast';

import {
  fetchAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  toggleAlertRule,
} from '@/api/alert-rules.api';

import {
  fetchScenarios,
  type ScenarioItem,
} from '@/api/scenarios.api';

import type {
  AlertRuleListItem,
  AlertRuleEventType,
  ConditionOperator,
  AlertRuleLevel,
  CreateAlertRulePayload,
  UpdateAlertRulePayload,
  AlertRuleListResponse,
} from '@/types/alert-rule.types';

import { getMessages } from '@/locales';

// ---------------------------------------------------------------------------
// Locale
// ---------------------------------------------------------------------------
const MSG = getMessages().alertRules;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const EVENT_TYPES: AlertRuleEventType[] = [
  'CHECK_IN',
  'CHECKIN_OVERDUE',
  'SEVERE_OVERDUE',
  'FACE_MISMATCH',
  'NFC_FAIL',
  'NFC_MISMATCH',
  'GEOFENCE_VIOLATION',
];

const OPERATORS: ConditionOperator[] = ['>=', '<=', '==', '>', '<'];

const LEVELS: AlertRuleLevel[] = ['THAP', 'TRUNG_BINH', 'CAO', 'KHAN_CAP'];

const EVENT_LABEL: Record<AlertRuleEventType, string> = {
  CHECK_IN: MSG.eventCHECK_IN,
  CHECKIN_OVERDUE: MSG.eventCHECKIN_OVERDUE,
  SEVERE_OVERDUE: MSG.eventSEVERE_OVERDUE,
  FACE_MISMATCH: MSG.eventFACE_MISMATCH,
  NFC_FAIL: MSG.eventNFC_FAIL,
  NFC_MISMATCH: MSG.eventNFC_MISMATCH,
  GEOFENCE_VIOLATION: MSG.eventGEOFENCE_VIOLATION,
};

const LEVEL_BADGE: Record<AlertRuleLevel, { variant: 'done' | 'warning' | 'urgent' | 'processing'; label: string }> = {
  THAP: { variant: 'done', label: MSG.levelTHAP },
  TRUNG_BINH: { variant: 'warning', label: MSG.levelTRUNG_BINH },
  CAO: { variant: 'urgent', label: MSG.levelCAO },
  KHAN_CAP: { variant: 'processing', label: MSG.levelKHAN_CAP },
};

const LEVEL_CHIP_STYLE: Record<AlertRuleLevel, string> = {
  THAP: 'bg-green-100 text-green-800 border-green-300',
  TRUNG_BINH: 'bg-amber-100 text-amber-800 border-amber-300',
  CAO: 'bg-orange-100 text-orange-800 border-orange-300',
  KHAN_CAP: 'bg-red-100 text-red-800 border-red-300',
};

const OP_LABEL: Record<ConditionOperator, string> = {
  '>=': MSG.opGte,
  '<=': MSG.opLte,
  '==': MSG.opEq,
  '>': MSG.opGt,
  '<': MSG.opLt,
};

const OP_SYMBOL: Record<ConditionOperator, string> = {
  '>=': '≥',
  '<=': '≤',
  '==': '=',
  '>': '>',
  '<': '<',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getEventIcon(type: AlertRuleEventType) {
  switch (type) {
    case 'CHECK_IN':
      return <CheckCircle2 size={18} className="text-green-600" />;
    case 'CHECKIN_OVERDUE':
      return <Clock size={18} className="text-amber-600" />;
    case 'SEVERE_OVERDUE':
      return <AlertTriangle size={18} className="text-red-600" />;
    case 'FACE_MISMATCH':
      return <UserX size={18} className="text-orange-600" />;
    case 'NFC_FAIL':
      return <Shield size={18} className="text-zinc-600" />;
    case 'NFC_MISMATCH':
      return <ShieldAlert size={18} className="text-red-600" />;
    case 'GEOFENCE_VIOLATION':
      return <MapPin size={18} className="text-purple-600" />;
    default:
      return <Zap size={18} className="text-zinc-400" />;
  }
}

function buildRuleDescription(rule: AlertRuleListItem): string {
  const op = OP_SYMBOL[rule.condition_operator] ?? rule.condition_operator;
  const eventLabel = EVENT_LABEL[rule.event_type] ?? rule.event_type;
  const levelLabel = LEVEL_BADGE[rule.alert_level]?.label ?? rule.alert_level;
  const windowPart = rule.condition_window_days
    ? ` trong ${rule.condition_window_days} ${MSG.condDays}`
    : '';
  return `Khi có ${op} ${rule.condition_value} ${MSG.condEvents} ${eventLabel}${windowPart} → Cảnh báo mức ${levelLabel}`;
}

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------
interface RuleFormState {
  name: string;
  event_type: AlertRuleEventType | '';
  condition_operator: ConditionOperator;
  condition_value: number;
  condition_window_days: string;
  alert_level: AlertRuleLevel;
  is_active: boolean;
}

const EMPTY_FORM: RuleFormState = {
  name: '',
  event_type: '',
  condition_operator: '>=',
  condition_value: 1,
  condition_window_days: '',
  alert_level: 'TRUNG_BINH',
  is_active: true,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Toggle switch */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 items-center rounded-full transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700/30
        ${checked ? 'bg-red-700' : 'bg-zinc-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm
          ${checked ? 'translate-x-[18px]' : 'translate-x-[3px]'}
        `}
      />
    </button>
  );
}

/** Pipeline flow diagram */
function PipelineDiagram() {
  const steps = [
    { icon: <Zap size={20} />, label: MSG.pipelineEvent, desc: MSG.pipelineEventDesc, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { icon: <ShieldAlert size={20} />, label: MSG.pipelineRule, desc: MSG.pipelineRuleDesc, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { icon: <Bell size={20} />, label: MSG.pipelineAlert, desc: MSG.pipelineAlertDesc, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { icon: <Briefcase size={20} />, label: MSG.pipelineCase, desc: MSG.pipelineCaseDesc, color: 'text-red-600 bg-red-50 border-red-200' },
  ];

  return (
    <div className="bg-white border border-zinc-200 rounded p-4 mt-6">
      <h3 className="text-[13px] font-semibold text-zinc-900 mb-3">{MSG.sectionPipeline}</h3>

      <div className="flex items-start gap-1 overflow-x-auto pb-2">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-start shrink-0">
            <div className={`flex flex-col items-center border rounded-lg px-4 py-3 w-[140px] ${step.color}`}>
              <div className="mb-1.5">{step.icon}</div>
              <span className="text-[12px] font-semibold text-center">{step.label}</span>
              <span className="text-[11px] text-center opacity-80 mt-0.5">{step.desc}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex items-center self-center px-1 pt-2">
                <ArrowRight size={16} className="text-zinc-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-[12px] text-amber-800">
        <AlertTriangle size={14} className="shrink-0" />
        <span>{MSG.pipelineAutoEscalate}</span>
      </div>
    </div>
  );
}

/** Rule card */
function RuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: AlertRuleListItem;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (rule: AlertRuleListItem) => void;
  onDelete: (rule: AlertRuleListItem) => void;
}) {
  const isDefault = rule.source === 'DEFAULT';
  const levelBadge = LEVEL_BADGE[rule.alert_level];
  const description = buildRuleDescription(rule);

  return (
    <div className={`
      bg-white border rounded-lg p-4 flex items-start gap-4 transition-colors
      ${rule.is_active ? 'border-zinc-200' : 'border-zinc-200 opacity-60'}
    `}>
      {/* Left: icon */}
      <div className="shrink-0 mt-0.5">
        {getEventIcon(rule.event_type)}
      </div>

      {/* Center: info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-zinc-900">{rule.name}</span>
          {isDefault && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-[10px] text-zinc-500 font-medium">
              <Lock size={10} />
              {MSG.defaultRuleLock}
            </span>
          )}
        </div>
        <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{description}</p>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-3 shrink-0">
        {levelBadge && (
          <Badge variant={levelBadge.variant}>{levelBadge.label}</Badge>
        )}

        <div className="flex flex-col items-center gap-0.5">
          <Toggle
            checked={rule.is_active}
            onChange={(v) => onToggle(rule.id, v)}
          />
          <span className="text-[10px] text-zinc-400">
            {rule.is_active ? MSG.toggleActive : MSG.toggleInactive}
          </span>
        </div>

        {rule.is_editable && (
          <button
            onClick={() => onEdit(rule)}
            className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors"
            title={MSG.btnEdit}
          >
            <Pencil size={14} />
          </button>
        )}

        {rule.is_deletable && (
          <button
            onClick={() => onDelete(rule)}
            className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
            title={MSG.btnDelete}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Create / Edit modal */
function RuleFormModal({
  open,
  editing,
  form,
  setForm,
  saving,
  onSave,
  onClose,
}: {
  open: boolean;
  editing: boolean;
  form: RuleFormState;
  setForm: React.Dispatch<React.SetStateAction<RuleFormState>>;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const isValid = form.name.trim() && form.event_type && form.condition_value >= 1;

  // Build preview sentence
  const previewParts: string[] = [];
  if (form.event_type) {
    const op = OP_SYMBOL[form.condition_operator] ?? form.condition_operator;
    const eventLabel = EVENT_LABEL[form.event_type as AlertRuleEventType] ?? '';
    const levelLabel = LEVEL_BADGE[form.alert_level]?.label ?? '';
    previewParts.push(
      `${MSG.previewPrefix} ${op} ${form.condition_value} ${MSG.previewEventIn} ${eventLabel}`,
    );
    if (form.condition_window_days) {
      previewParts.push(`${MSG.previewWithin} ${form.condition_window_days} ${MSG.previewDays}`);
    }
    previewParts.push(`→ ${MSG.previewThen} ${levelLabel}`);
  }
  const previewText = previewParts.join(' ');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200">
          <h2 className="text-[14px] font-semibold text-zinc-900">
            {editing ? MSG.formEditTitle : MSG.formTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Rule name */}
          <div>
            <label className="block text-[12px] font-medium text-zinc-700 mb-1">{MSG.formName}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={MSG.formNamePlaceholder}
              className="w-full h-9 px-3 text-[13px] border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700"
            />
          </div>

          {/* Step 1: KHI - event type */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">{MSG.condWhen}</span>
              <span className="text-[12px] text-zinc-500">{MSG.formEventType}</span>
            </div>
            <select
              value={form.event_type}
              onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value as AlertRuleEventType }))}
              className="w-full h-9 px-3 text-[13px] border border-zinc-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700"
            >
              <option value="">{MSG.formEventTypePlaceholder}</option>
              {EVENT_TYPES.map((et) => (
                <option key={et} value={et}>{EVENT_LABEL[et]}</option>
              ))}
            </select>
          </div>

          {/* Step 2: XAY RA - operator + value */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">{MSG.condOccurs}</span>
              <span className="text-[12px] text-zinc-500">{MSG.formOperator}</span>
            </div>
            <div className="flex gap-2">
              <select
                value={form.condition_operator}
                onChange={(e) => setForm((p) => ({ ...p, condition_operator: e.target.value as ConditionOperator }))}
                className="w-1/2 h-9 px-3 text-[13px] border border-zinc-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700"
              >
                {OPERATORS.map((op) => (
                  <option key={op} value={op}>{OP_LABEL[op]}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={form.condition_value}
                onChange={(e) => setForm((p) => ({ ...p, condition_value: Math.max(1, Number(e.target.value)) }))}
                placeholder={MSG.formValuePlaceholder}
                className="w-1/2 h-9 px-3 text-[13px] border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700"
              />
            </div>
          </div>

          {/* Step 3: TRONG - window days */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">{MSG.condWithin}</span>
              <span className="text-[12px] text-zinc-500">{MSG.formWindowDays}</span>
            </div>
            <input
              type="number"
              min={1}
              value={form.condition_window_days}
              onChange={(e) => setForm((p) => ({ ...p, condition_window_days: e.target.value }))}
              placeholder={MSG.formWindowDaysPlaceholder}
              className="w-full h-9 px-3 text-[13px] border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700"
            />
            <p className="text-[11px] text-zinc-400 mt-1">{MSG.formWindowDaysHint}</p>
          </div>

          {/* Step 4: THI TAO CANH BAO MUC - alert level */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">{MSG.condThen}</span>
              <span className="text-[12px] text-zinc-500">{MSG.formAlertLevel}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {LEVELS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, alert_level: lv }))}
                  className={`
                    px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all
                    ${LEVEL_CHIP_STYLE[lv]}
                    ${form.alert_level === lv
                      ? 'ring-2 ring-offset-1 ring-red-700/40 shadow-sm'
                      : 'opacity-60 hover:opacity-100'
                    }
                  `}
                >
                  {LEVEL_BADGE[lv].label}
                </button>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-zinc-700">{MSG.formIsActive}</span>
            <Toggle
              checked={form.is_active}
              onChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
            />
          </div>

          {/* Preview */}
          {previewText && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-[12px] text-blue-800 font-medium">{previewText}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-200">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {MSG.btnCancel}
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            disabled={!isValid}
            onClick={onSave}
          >
            {editing ? MSG.btnSave : MSG.btnCreate}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Delete confirmation modal */
function DeleteConfirmModal({
  open,
  ruleName,
  deleting,
  onConfirm,
  onClose,
}: {
  open: boolean;
  ruleName: string;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
        <div className="px-5 py-4">
          <h3 className="text-[14px] font-semibold text-zinc-900 mb-2">{MSG.deleteTitle}</h3>
          <p className="text-[13px] text-zinc-600">{MSG.deleteMessage(ruleName)}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-200">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {MSG.deleteCancel}
          </Button>
          <Button variant="danger-ghost" size="sm" loading={deleting} onClick={onConfirm}>
            {MSG.deleteConfirm}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function RuleCardSkeleton() {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4 flex items-start gap-4">
      <Skeleton className="w-5 h-5 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>
      <Skeleton className="h-5 w-16 rounded shrink-0" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function AlertRuleBuilderPage() {
  const { showToast } = useToast();

  // ---- Scenario state ----
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(true);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');

  // ---- Rules state ----
  const [rules, setRules] = useState<AlertRuleListItem[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  // ---- Modal state ----
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRuleListItem | null>(null);
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ---- Delete state ----
  const [deleteTarget, setDeleteTarget] = useState<AlertRuleListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ---- Document title ----
  useEffect(() => {
    document.title = MSG.documentTitle;
  }, []);

  // --------------------------------------------------------------------------
  // Load scenarios
  // --------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        setScenariosLoading(true);
        const res = await fetchScenarios({ limit: 200 });
        const d = res.data as any;
        const result = d?.data ?? d;
        const list = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
        setScenarios(list);
      } catch {
        setScenarios([]);
      } finally {
        setScenariosLoading(false);
      }
    })();
  }, []);

  // --------------------------------------------------------------------------
  // Load rules for selected scenario
  // --------------------------------------------------------------------------
  const loadRules = useCallback(async () => {
    if (!selectedScenarioId) {
      setRules([]);
      return;
    }
    setRulesLoading(true);
    setRulesError(null);
    try {
      const res = await fetchAlertRules({ scenario_id: selectedScenarioId, limit: 100 });
      const raw = res.data as any;
      const body = (raw?.data ?? raw) as AlertRuleListResponse;
      setRules(Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body as any : []);
    } catch {
      setRulesError(MSG.msgLoadError);
    } finally {
      setRulesLoading(false);
    }
  }, [selectedScenarioId]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // --------------------------------------------------------------------------
  // Derived data
  // --------------------------------------------------------------------------
  const defaultRules = useMemo(() => rules.filter((r) => r.source === 'DEFAULT'), [rules]);
  const customRules = useMemo(() => rules.filter((r) => r.source === 'CUSTOM'), [rules]);


  // --------------------------------------------------------------------------
  // Toggle rule active status
  // --------------------------------------------------------------------------
  const handleToggle = useCallback(
    async (id: string, active: boolean) => {
      try {
        await toggleAlertRule(id, active);
        setRules((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: active } : r)));
        showToast(active ? MSG.msgToggleOnSuccess : MSG.msgToggleOffSuccess, 'success');
      } catch {
        showToast(MSG.msgError, 'error');
      }
    },
    [showToast],
  );

  // --------------------------------------------------------------------------
  // Open create modal
  // --------------------------------------------------------------------------
  const openCreate = useCallback(() => {
    setEditingRule(null);
    setForm(EMPTY_FORM);
    setShowFormModal(true);
  }, []);

  // --------------------------------------------------------------------------
  // Open edit modal
  // --------------------------------------------------------------------------
  const openEdit = useCallback((rule: AlertRuleListItem) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      event_type: rule.event_type,
      condition_operator: rule.condition_operator,
      condition_value: rule.condition_value,
      condition_window_days: rule.condition_window_days?.toString() ?? '',
      alert_level: rule.alert_level,
      is_active: rule.is_active,
    });
    setShowFormModal(true);
  }, []);

  // --------------------------------------------------------------------------
  // Save rule (create / update)
  // --------------------------------------------------------------------------
  const handleSave = useCallback(async () => {
    if (!form.event_type) return;
    setSaving(true);
    try {
      if (editingRule) {
        // Update
        const payload: UpdateAlertRulePayload = {
          name: form.name.trim(),
          event_type: form.event_type as AlertRuleEventType,
          condition_operator: form.condition_operator,
          condition_value: form.condition_value,
          alert_level: form.alert_level,
          is_active: form.is_active,
        };
        if (form.condition_window_days) {
          payload.condition_window_days = Number(form.condition_window_days);
        }
        await updateAlertRule(editingRule.id, payload);
        showToast(MSG.msgUpdateSuccess, 'success');
      } else {
        // Create
        const payload: CreateAlertRulePayload = {
          scenario_id: selectedScenarioId,
          name: form.name.trim(),
          event_type: form.event_type as AlertRuleEventType,
          condition_operator: form.condition_operator,
          condition_value: form.condition_value,
          alert_level: form.alert_level,
          is_active: form.is_active,
        };
        if (form.condition_window_days) {
          payload.condition_window_days = Number(form.condition_window_days);
        }
        await createAlertRule(payload);
        showToast(MSG.msgCreateSuccess, 'success');
      }
      setShowFormModal(false);
      loadRules();
    } catch {
      showToast(MSG.msgError, 'error');
    } finally {
      setSaving(false);
    }
  }, [editingRule, form, selectedScenarioId, loadRules, showToast]);

  // --------------------------------------------------------------------------
  // Delete rule
  // --------------------------------------------------------------------------
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAlertRule(deleteTarget.id);
      showToast(MSG.msgDeleteSuccess, 'success');
      setDeleteTarget(null);
      loadRules();
    } catch {
      showToast(MSG.msgError, 'error');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, loadRules, showToast]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div className="p-4 max-w-[1100px]">
      <PageHeader
        breadcrumbs={[
          { label: MSG.breadcrumbDashboard, href: '/dashboard' },
          { label: MSG.breadcrumbAlertRules },
        ]}
        title={MSG.pageTitle}
        subtitle={MSG.subtitle}
      />

      {/* Scenario selector */}
      <div className="mb-5">
        <label className="block text-[12px] font-medium text-zinc-700 mb-1">{MSG.scenarioLabel}</label>
        {scenariosLoading ? (
          <Skeleton className="h-9 w-80" />
        ) : (
          <select
            value={selectedScenarioId}
            onChange={(e) => setSelectedScenarioId(e.target.value)}
            className="h-9 px-3 text-[13px] border border-zinc-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700 min-w-[320px] max-w-full"
          >
            <option value="">{MSG.scenarioPlaceholder}</option>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Empty state: no scenario selected */}
      {!selectedScenarioId && (
        <div className="bg-white border border-zinc-200 rounded-lg py-16">
          <EmptyState
            icon={<ShieldAlert size={32} />}
            title={MSG.emptyNoScenario}
            subtitle={MSG.emptyNoScenarioSubtitle}
          />
        </div>
      )}

      {/* Loading rules */}
      {selectedScenarioId && rulesLoading && (
        <div className="space-y-3">
          <RuleCardSkeleton />
          <RuleCardSkeleton />
          <RuleCardSkeleton />
        </div>
      )}

      {/* Error */}
      {selectedScenarioId && rulesError && !rulesLoading && (
        <div className="bg-white border border-zinc-200 rounded-lg py-12">
          <EmptyState
            icon={<AlertTriangle size={32} />}
            title={MSG.errSystem}
            subtitle={rulesError}
            action={
              <Button variant="outline" size="sm" onClick={loadRules}>
                {MSG.retry}
              </Button>
            }
          />
        </div>
      )}

      {/* Rules loaded */}
      {selectedScenarioId && !rulesLoading && !rulesError && (
        <>
          {/* Default rules section */}
          {defaultRules.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1.5">
                <Lock size={14} className="text-zinc-400" />
                <h2 className="text-[13px] font-semibold text-zinc-900">{MSG.sectionDefault}</h2>
              </div>
              <p className="text-[11px] text-zinc-400 mb-3">{MSG.sectionDefaultDesc}</p>
              <div className="space-y-2">
                {defaultRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onToggle={handleToggle}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom rules section */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <h2 className="text-[13px] font-semibold text-zinc-900">{MSG.sectionCustom}</h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">{MSG.sectionCustomDesc}</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={openCreate}
              >
                {MSG.btnCreate}
              </Button>
            </div>

            {customRules.length === 0 ? (
              <div className="bg-white border border-zinc-200 border-dashed rounded-lg py-10">
                <EmptyState
                  icon={<Plus size={28} />}
                  title={MSG.emptyNoCustomRules}
                  subtitle={MSG.emptyNoCustomRulesSubtitle}
                />
              </div>
            ) : (
              <div className="space-y-2">
                {customRules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onToggle={handleToggle}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pipeline diagram */}
          <PipelineDiagram />
        </>
      )}

      {/* Form modal */}
      <RuleFormModal
        open={showFormModal}
        editing={!!editingRule}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
        onClose={() => setShowFormModal(false)}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        open={!!deleteTarget}
        ruleName={deleteTarget?.name ?? ''}
        deleting={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
