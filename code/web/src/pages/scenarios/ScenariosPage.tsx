import { useEffect, useState, useCallback } from 'react';
import {
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  Check,
  X,
  Send,
  Shield,
  Pause,
  Play,
  Users,
  MapPin,
  Clock,
} from 'lucide-react';
import { getMessages } from '@/locales';
import DatePicker from '@/components/ui/DatePicker';
import {
  fetchScenarios,
  createScenario,
  updateScenario,
  updateScenarioStatus,
  deleteScenario,
  type ScenarioItem,
  type ScenarioDetail,
  type CreateScenarioPayload,
  fetchScenarioDetail,
} from '@/api/scenarios.api';
import { fetchGeofences, type GeofenceItem } from '@/api/geofences.api';

const MSG = getMessages().scenarios;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-600',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-zinc-200 text-zinc-500',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: MSG.statusDraft,
  PENDING_APPROVAL: MSG.statusPending,
  ACTIVE: MSG.statusActive,
  SUSPENDED: MSG.statusSuspended,
  EXPIRED: MSG.statusExpired,
};

const FREQ_LABELS: Record<string, string> = {
  DAILY: MSG.freqDaily,
  WEEKLY: MSG.freqWeekly,
  BIWEEKLY: MSG.freqBiweekly,
  MONTHLY: MSG.freqMonthly,
};

const SCOPE_LABELS: Record<string, string> = {
  DISTRICT: MSG.scopeDistrict,
  PROVINCE: MSG.scopeProvince,
  SYSTEM: MSG.scopeSystem,
};

type ViewMode = 'list' | 'detail' | 'form';

interface FormState {
  name: string;
  description: string;
  scope: string;
  checkin_frequency: string;
  checkin_window_start: string;
  checkin_window_end: string;
  grace_period_days: number;
  face_threshold: number;
  nfc_required: boolean;
  fallback_allowed: boolean;
  geofence_id: string;
  curfew_start: string;
  curfew_end: string;
  travel_approval_required: boolean;
  travel_threshold_days: number;
  effective_from: string;
  effective_to: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  scope: 'DISTRICT',
  checkin_frequency: 'DAILY',
  checkin_window_start: '06:00',
  checkin_window_end: '22:00',
  grace_period_days: 2,
  face_threshold: 85,
  nfc_required: true,
  fallback_allowed: true,
  geofence_id: '',
  curfew_start: '',
  curfew_end: '',
  travel_approval_required: true,
  travel_threshold_days: 3,
  effective_from: '',
  effective_to: '',
};

function ScenariosPage() {
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [detailData, setDetailData] = useState<ScenarioDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [geofences, setGeofences] = useState<GeofenceItem[]>([]);

  const loadScenarios = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;

      const res = await fetchScenarios(params);
      const d = res.data as any;
      const result = d?.data ?? d;
      setScenarios(Array.isArray(result?.data) ? result.data : []);
      setTotal(result?.total ?? 0);
    } catch {
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus]);

  useEffect(() => {
    document.title = MSG.documentTitle;
    loadScenarios();
  }, [loadScenarios]);

  useEffect(() => {
    fetchGeofences({ limit: 200, is_active: 'true' }).then((res) => {
      const d = res.data as any;
      const list = d?.data?.data ?? d?.data ?? [];
      setGeofences(Array.isArray(list) ? list : []);
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setViewMode('form');
  };

  const openEdit = (s: ScenarioItem) => {
    setForm({
      name: s.name,
      description: s.description || '',
      scope: s.scope,
      checkin_frequency: s.checkin_frequency,
      checkin_window_start: s.checkin_window_start,
      checkin_window_end: s.checkin_window_end,
      grace_period_days: s.grace_period_days,
      face_threshold: s.face_threshold,
      nfc_required: s.nfc_required,
      fallback_allowed: s.fallback_allowed,
      geofence_id: s.geofence_id || '',
      curfew_start: s.curfew_start || '',
      curfew_end: s.curfew_end || '',
      travel_approval_required: s.travel_approval_required,
      travel_threshold_days: s.travel_threshold_days ?? 3,
      effective_from: s.effective_from ? s.effective_from.slice(0, 10) : '',
      effective_to: s.effective_to ? s.effective_to.slice(0, 10) : '',
    });
    setEditingId(s.id);
    setViewMode('form');
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setViewMode('detail');
    try {
      const res = await fetchScenarioDetail(id);
      const d = res.data as any;
      setDetailData(d?.data ?? d);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload: CreateScenarioPayload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        scope: form.scope,
        checkin_frequency: form.checkin_frequency,
        checkin_window_start: form.checkin_window_start,
        checkin_window_end: form.checkin_window_end,
        grace_period_days: form.grace_period_days,
        face_threshold: form.face_threshold,
        nfc_required: form.nfc_required,
        fallback_allowed: form.fallback_allowed,
        geofence_id: form.geofence_id || null,
        curfew_start: form.curfew_start || null,
        curfew_end: form.curfew_end || null,
        travel_approval_required: form.travel_approval_required,
        travel_threshold_days: form.travel_threshold_days,
        effective_from: form.effective_from || null,
        effective_to: form.effective_to || null,
      };

      if (editingId) {
        await updateScenario(editingId, payload);
      } else {
        await createScenario(payload);
      }

      setViewMode('list');
      await loadScenarios();
    } catch {
      // error
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScenario(id);
      setDeleteConfirm(null);
      await loadScenarios();
    } catch {}
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateScenarioStatus(id, status);
      await loadScenarios();
      if (detailData?.id === id) {
        openDetail(id);
      }
    } catch {}
  };

  const totalPages = Math.ceil(total / 20);

  // ─── DETAIL VIEW ───
  if (viewMode === 'detail') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => setViewMode('list')}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-4"
        >
          <ChevronLeft size={16} /> Quay lại
        </button>

        {detailLoading ? (
          <div className="text-center text-zinc-400 py-20">...</div>
        ) : !detailData ? (
          <div className="text-center text-zinc-400 py-20">Không tìm thấy</div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-lg font-semibold text-zinc-800">{detailData.name}</h1>
                <p className="text-xs text-zinc-400 mt-0.5">{detailData.code} · v{detailData.version}</p>
                {detailData.description && (
                  <p className="text-sm text-zinc-600 mt-2">{detailData.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[detailData.status]}`}>
                  {STATUS_LABELS[detailData.status]}
                </span>
                {/* Status action buttons */}
                {detailData.status === 'DRAFT' && (
                  <button
                    onClick={() => handleStatusChange(detailData.id, 'PENDING_APPROVAL')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-md text-xs hover:bg-amber-500"
                  >
                    <Send size={12} /> {MSG.formSubmitApproval}
                  </button>
                )}
                {detailData.status === 'PENDING_APPROVAL' && (
                  <button
                    onClick={() => handleStatusChange(detailData.id, 'ACTIVE')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-xs hover:bg-green-500"
                  >
                    <Shield size={12} /> {MSG.formApprove}
                  </button>
                )}
                {detailData.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleStatusChange(detailData.id, 'SUSPENDED')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-xs hover:bg-red-500"
                  >
                    <Pause size={12} /> {MSG.formSuspend}
                  </button>
                )}
                {detailData.status === 'SUSPENDED' && (
                  <button
                    onClick={() => handleStatusChange(detailData.id, 'ACTIVE')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-xs hover:bg-green-500"
                  >
                    <Play size={12} /> {MSG.formReactivate}
                  </button>
                )}
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* General */}
              <div className="border border-zinc-200 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-3">{MSG.sectionGeneral}</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">{MSG.lblScope}</dt>
                    <dd className="font-medium">{SCOPE_LABELS[detailData.scope]}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">{MSG.lblSubjectCount}</dt>
                    <dd className="font-medium flex items-center gap-1"><Users size={12} /> {detailData.subject_count}</dd>
                  </div>
                  {detailData.effective_from && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">{MSG.lblEffective}</dt>
                      <dd className="font-medium">{detailData.effective_from?.toString().slice(0, 10)} → {detailData.effective_to?.toString().slice(0, 10) || '∞'}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Check-in rules */}
              <div className="border border-zinc-200 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-3">{MSG.sectionCheckin}</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">{MSG.lblCheckinFreq}</dt>
                    <dd className="font-medium">{FREQ_LABELS[detailData.checkin_frequency] || detailData.checkin_frequency}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">{MSG.lblCheckinWindow}</dt>
                    <dd className="font-medium flex items-center gap-1"><Clock size={12} /> {detailData.checkin_window_start} – {detailData.checkin_window_end}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">{MSG.lblGracePeriod}</dt>
                    <dd className="font-medium">{detailData.grace_period_days} ngày</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">{MSG.lblFaceThreshold}</dt>
                    <dd className="font-medium">{detailData.face_threshold}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">{MSG.lblNfcRequired}</dt>
                    <dd className="font-medium">{detailData.nfc_required ? MSG.yes : MSG.no}</dd>
                  </div>
                </dl>
              </div>

              {/* Monitoring */}
              <div className="border border-zinc-200 rounded-lg p-4 col-span-2">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-3">{MSG.sectionMonitoring}</h3>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">{MSG.lblGeofence}</dt>
                    <dd className="font-medium flex items-center gap-1">
                      {detailData.geofence ? (
                        <><MapPin size={12} className="text-red-500" /> {detailData.geofence.name} ({detailData.geofence.radius}m)</>
                      ) : (
                        <span className="text-zinc-400">{MSG.noGeofence}</span>
                      )}
                    </dd>
                  </div>
                  {detailData.curfew_start && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">{MSG.lblCurfew}</dt>
                      <dd className="font-medium">{detailData.curfew_start} – {detailData.curfew_end}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">{MSG.lblTravelApproval}</dt>
                    <dd className="font-medium">{detailData.travel_approval_required ? `${MSG.yes} (>${detailData.travel_threshold_days} ngày)` : MSG.no}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── FORM VIEW ───
  if (viewMode === 'form') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button
          onClick={() => setViewMode('list')}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-4"
        >
          <ChevronLeft size={16} /> Quay lại
        </button>

        <h1 className="text-lg font-semibold text-zinc-800 mb-6">
          {editingId ? MSG.editScenario : MSG.addScenario}
        </h1>

        <div className="space-y-6">
          {/* General */}
          <section className="border border-zinc-200 rounded-lg p-4 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase">{MSG.sectionGeneral}</h3>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">{MSG.lblName} *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={MSG.phName}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">{MSG.lblDescription}</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={MSG.phDescription}
                rows={2}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">{MSG.lblScope} *</label>
                <select
                  value={form.scope}
                  onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="DISTRICT">{MSG.scopeDistrict}</option>
                  <option value="PROVINCE">{MSG.scopeProvince}</option>
                  <option value="SYSTEM">{MSG.scopeSystem}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">{MSG.lblEffectiveFrom}</label>
                  <DatePicker
                    value={form.effective_from}
                    onChange={(v) => setForm((f) => ({ ...f, effective_from: v }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">{MSG.lblEffectiveTo}</label>
                  <DatePicker
                    value={form.effective_to}
                    onChange={(v) => setForm((f) => ({ ...f, effective_to: v }))}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Check-in rules */}
          <section className="border border-zinc-200 rounded-lg p-4 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase">{MSG.sectionCheckin}</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">{MSG.lblCheckinFreq} *</label>
                <select
                  value={form.checkin_frequency}
                  onChange={(e) => setForm((f) => ({ ...f, checkin_frequency: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="DAILY">{MSG.freqDaily}</option>
                  <option value="WEEKLY">{MSG.freqWeekly}</option>
                  <option value="BIWEEKLY">{MSG.freqBiweekly}</option>
                  <option value="MONTHLY">{MSG.freqMonthly}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">{MSG.lblCheckinWindow} (bắt đầu)</label>
                <input
                  type="time"
                  value={form.checkin_window_start}
                  onChange={(e) => setForm((f) => ({ ...f, checkin_window_start: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">{MSG.lblCheckinWindow} (kết thúc)</label>
                <input
                  type="time"
                  value={form.checkin_window_end}
                  onChange={(e) => setForm((f) => ({ ...f, checkin_window_end: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">{MSG.lblGracePeriod}</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={form.grace_period_days}
                  onChange={(e) => setForm((f) => ({ ...f, grace_period_days: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">{MSG.lblFaceThreshold}</label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={form.face_threshold}
                  onChange={(e) => setForm((f) => ({ ...f, face_threshold: parseInt(e.target.value) || 85 }))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.nfc_required}
                    onChange={(e) => setForm((f) => ({ ...f, nfc_required: e.target.checked }))}
                    className="accent-red-600"
                  />
                  {MSG.lblNfcRequired}
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.fallback_allowed}
                    onChange={(e) => setForm((f) => ({ ...f, fallback_allowed: e.target.checked }))}
                    className="accent-red-600"
                  />
                  {MSG.lblFallbackAllowed}
                </label>
              </div>
            </div>
          </section>

          {/* Monitoring */}
          <section className="border border-zinc-200 rounded-lg p-4 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase">{MSG.sectionMonitoring}</h3>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">{MSG.lblGeofence}</label>
              <select
                value={form.geofence_id}
                onChange={(e) => setForm((f) => ({ ...f, geofence_id: e.target.value }))}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="">{MSG.selectGeofence}</option>
                {geofences.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.radius}m) — {g.address || g.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">{MSG.lblCurfew} ({MSG.lblCurfewStart})</label>
                <input
                  type="time"
                  value={form.curfew_start}
                  onChange={(e) => setForm((f) => ({ ...f, curfew_start: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">{MSG.lblCurfew} ({MSG.lblCurfewEnd})</label>
                <input
                  type="time"
                  value={form.curfew_end}
                  onChange={(e) => setForm((f) => ({ ...f, curfew_end: e.target.value }))}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.travel_approval_required}
                  onChange={(e) => setForm((f) => ({ ...f, travel_approval_required: e.target.checked }))}
                  className="accent-red-600"
                />
                {MSG.lblTravelApproval}
              </label>
              {form.travel_approval_required && (
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">{MSG.lblTravelDays}</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={form.travel_threshold_days}
                    onChange={(e) => setForm((f) => ({ ...f, travel_threshold_days: parseInt(e.target.value) || 3 }))}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setViewMode('list')}
              className="px-4 py-2 border border-zinc-300 rounded-md text-sm text-zinc-600 hover:bg-zinc-50"
            >
              {MSG.formCancel}
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || saving}
              className="px-4 py-2 bg-red-700 text-white rounded-md text-sm hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check size={14} />
              {saving ? '...' : MSG.formSave}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-zinc-800">{MSG.pageTitle}</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-700 text-white rounded-md text-sm hover:bg-red-600"
        >
          <PlusCircle size={14} />
          {MSG.addScenario}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={MSG.phSearch}
            className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">{MSG.statusDraft}</option>
          <option value="PENDING_APPROVAL">{MSG.statusPending}</option>
          <option value="ACTIVE">{MSG.statusActive}</option>
          <option value="SUSPENDED">{MSG.statusSuspended}</option>
          <option value="EXPIRED">{MSG.statusExpired}</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-zinc-400 py-20">...</div>
      ) : scenarios.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-500 text-sm">{MSG.emptyTitle}</p>
          <p className="text-zinc-400 text-xs mt-1">{MSG.emptySubtitle}</p>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colCode}</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colName}</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colStatus}</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colFrequency}</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colSubjects}</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colGeofence}</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {scenarios.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-zinc-400">{s.code}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDetail(s.id)}
                      className="text-sm font-medium text-zinc-800 hover:text-red-700 hover:underline text-left"
                    >
                      {s.name}
                    </button>
                    {s.description && (
                      <p className="text-xs text-zinc-400 truncate max-w-xs">{s.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[s.status]}`}>
                      {STATUS_LABELS[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {FREQ_LABELS[s.checkin_frequency] || s.checkin_frequency}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm text-zinc-600">
                      <Users size={12} /> {s.subject_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {s.geofence_id ? (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-red-500" />
                        {geofences.find((g) => g.id === s.geofence_id)?.name || s.geofence_id.slice(0, 8)}
                      </span>
                    ) : (
                      <span className="text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openDetail(s.id)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded"
                        title={MSG.viewDetail}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded"
                        title={MSG.editScenario}
                      >
                        <Pencil size={14} />
                      </button>
                      {deleteConfirm === s.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="p-1.5 text-zinc-400 hover:bg-zinc-100 rounded"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(s.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title={MSG.deleteScenario}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded text-sm ${
                page === i + 1
                  ? 'bg-red-700 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ScenariosPage;
