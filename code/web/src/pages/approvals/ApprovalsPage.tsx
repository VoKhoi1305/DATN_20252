import { useEffect, useState, useCallback } from 'react';
import {
  ChevronLeft,
  Shield,
  X,
  Eye,
  Clock,
  Users,
  MapPin,
  ClipboardCheck,
} from 'lucide-react';
import { getMessages } from '@/locales';
import {
  fetchScenarios,
  fetchScenarioDetail,
  updateScenarioStatus,
  type ScenarioItem,
  type ScenarioDetail,
} from '@/api/scenarios.api';
import { useToast } from '@/components/ui/Toast';

const MSG = getMessages().approvals;

const SCOPE_LABELS: Record<string, string> = {
  DISTRICT: MSG.scopeDistrict,
  PROVINCE: MSG.scopeProvince,
  SYSTEM: MSG.scopeSystem,
};

const FREQ_LABELS: Record<string, string> = {
  DAILY: MSG.freqDaily,
  WEEKLY: MSG.freqWeekly,
  BIWEEKLY: MSG.freqBiweekly,
  MONTHLY: MSG.freqMonthly,
};

function formatDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

type ViewMode = 'list' | 'detail';

function ApprovalsPage() {
  const { showToast } = useToast();
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [detailData, setDetailData] = useState<ScenarioDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchScenarios({ page, limit: 20, status: 'PENDING_APPROVAL' });
      const d = res.data as any;
      const result = d?.data ?? d;
      setScenarios(Array.isArray(result?.data) ? result.data : []);
      setTotal(result?.total ?? 0);
    } catch {
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    document.title = MSG.documentTitle;
    loadPending();
  }, [loadPending]);

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

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(true);
    try {
      const newStatus = action === 'approve' ? 'ACTIVE' : 'DRAFT';
      await updateScenarioStatus(id, newStatus);
      showToast(action === 'approve' ? MSG.msgApproveSuccess : MSG.msgRejectSuccess, 'success');
      setConfirmAction(null);

      if (viewMode === 'detail') {
        setViewMode('list');
        setDetailData(null);
      }
      await loadPending();
    } catch {
      showToast(MSG.msgError, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  // ─── DETAIL VIEW ───
  if (viewMode === 'detail') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => { setViewMode('list'); setDetailData(null); }}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-4"
        >
          <ChevronLeft size={16} /> {MSG.back}
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
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  {MSG.statusPending}
                </span>
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
                      <dd className="font-medium">
                        {formatDate(detailData.effective_from)} → {detailData.effective_to ? formatDate(detailData.effective_to) : '∞'}
                      </dd>
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
                    <dd className="font-medium flex items-center gap-1">
                      <Clock size={12} /> {detailData.checkin_window_start} – {detailData.checkin_window_end}
                    </dd>
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
                    <dd className="font-medium">
                      {detailData.travel_approval_required
                        ? `${MSG.yes} (>${detailData.travel_threshold_days} ngày)`
                        : MSG.no}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmAction({ id: detailData.id, action: 'approve' })}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-500 transition-colors"
              >
                <Shield size={14} /> {MSG.approve}
              </button>
              <button
                onClick={() => setConfirmAction({ id: detailData.id, action: 'reject' })}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                <X size={14} /> {MSG.reject}
              </button>
            </div>
          </div>
        )}

        {/* Confirm dialog */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
              <p className="text-sm text-zinc-700 mb-4">
                {confirmAction.action === 'approve' ? MSG.msgApproveConfirm : MSG.msgRejectConfirm}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-sm text-zinc-600 border border-zinc-300 rounded-md hover:bg-zinc-50"
                >
                  Huỷ
                </button>
                <button
                  onClick={() => handleAction(confirmAction.id, confirmAction.action)}
                  disabled={actionLoading}
                  className={`px-3 py-1.5 text-sm text-white rounded-md ${
                    confirmAction.action === 'approve'
                      ? 'bg-green-600 hover:bg-green-500'
                      : 'bg-red-600 hover:bg-red-500'
                  } disabled:opacity-50`}
                >
                  {actionLoading ? '...' : confirmAction.action === 'approve' ? MSG.approve : MSG.reject}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-zinc-800">{MSG.pageTitle}</h1>
          {!loading && total > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              {total}
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-zinc-400 py-20">...</div>
      ) : scenarios.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardCheck size={48} className="mx-auto text-zinc-300 mb-3" />
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
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colScope}</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colFrequency}</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colCreatedAt}</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {scenarios.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{s.code}</td>
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
                  <td className="px-4 py-3 text-sm text-zinc-600">{SCOPE_LABELS[s.scope]}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{FREQ_LABELS[s.checkin_frequency] || s.checkin_frequency}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(s.created_at)}</td>
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
                        onClick={() => setConfirmAction({ id: s.id, action: 'approve' })}
                        className="flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-500"
                      >
                        <Shield size={12} /> {MSG.approve}
                      </button>
                      <button
                        onClick={() => setConfirmAction({ id: s.id, action: 'reject' })}
                        className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded text-xs font-medium hover:bg-zinc-200"
                      >
                        <X size={12} /> {MSG.reject}
                      </button>
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

      {/* Confirm dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <p className="text-sm text-zinc-700 mb-4">
              {confirmAction.action === 'approve' ? MSG.msgApproveConfirm : MSG.msgRejectConfirm}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="px-3 py-1.5 text-sm text-zinc-600 border border-zinc-300 rounded-md hover:bg-zinc-50"
              >
                Huỷ
              </button>
              <button
                onClick={() => handleAction(confirmAction.id, confirmAction.action)}
                disabled={actionLoading}
                className={`px-3 py-1.5 text-sm text-white rounded-md ${
                  confirmAction.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-500'
                    : 'bg-red-600 hover:bg-red-500'
                } disabled:opacity-50`}
              >
                {actionLoading ? '...' : confirmAction.action === 'approve' ? MSG.approve : MSG.reject}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApprovalsPage;
