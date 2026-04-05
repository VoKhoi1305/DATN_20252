import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, UserCheck, X, ClipboardList } from 'lucide-react';
import { getMessages } from '@/locales';
import {
  fetchPendingEnrollments,
  approveEnrollment,
  rejectEnrollment,
  type PendingEnrollmentItem,
} from '@/api/enrollment.api';
import { useToast } from '@/components/ui/Toast';

const MSG = getMessages().enrollmentApprovals;

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${min}`;
}

type DialogState = {
  subject: PendingEnrollmentItem;
  action: 'approve' | 'reject';
} | null;

function EnrollmentApprovalsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<PendingEnrollmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selected, setSelected] = useState<PendingEnrollmentItem | null>(null);

  const [dialog, setDialog] = useState<DialogState>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadPending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchPendingEnrollments();
      const d = (res.data as any)?.data ?? res.data;
      setItems(Array.isArray(d?.items) ? d.items : []);
      setTotal(d?.total ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = MSG.documentTitle;
    loadPending();
  }, [loadPending]);

  const openDetail = (subject: PendingEnrollmentItem) => {
    setSelected(subject);
    setViewMode('detail');
  };

  const openDialog = (subject: PendingEnrollmentItem, action: 'approve' | 'reject') => {
    setNote('');
    setNoteError('');
    setDialog({ subject, action });
  };

  const handleAction = async () => {
    if (!dialog) return;

    if (dialog.action === 'reject' && !note.trim()) {
      setNoteError(MSG.msgNoteRequired);
      return;
    }

    setActionLoading(true);
    try {
      if (dialog.action === 'approve') {
        await approveEnrollment(dialog.subject.id, note.trim() || undefined);
        showToast(MSG.msgApproveSuccess, 'success');
      } else {
        await rejectEnrollment(dialog.subject.id, note.trim());
        showToast(MSG.msgRejectSuccess, 'success');
      }
      setDialog(null);
      if (viewMode === 'detail') {
        setViewMode('list');
        setSelected(null);
      }
      await loadPending();
    } catch {
      showToast(MSG.msgError, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── DETAIL VIEW ───
  if (viewMode === 'detail' && selected) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button
          onClick={() => { setViewMode('list'); setSelected(null); }}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-4"
        >
          <ChevronLeft size={16} /> {MSG.back}
        </button>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-semibold text-zinc-800">{selected.fullName}</h1>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">{selected.code}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              {MSG.statusPending}
            </span>
          </div>

          {/* Info */}
          <div className="border border-zinc-200 rounded-lg p-4">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Mã hồ sơ</dt>
                <dd className="font-mono text-zinc-700">{selected.code}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Ngày gửi duyệt</dt>
                <dd className="text-zinc-700">{formatDate(selected.submittedAt)}</dd>
              </div>
              {selected.enrollmentDate && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Ngày bắt đầu đăng ký</dt>
                  <dd className="text-zinc-700">{formatDate(selected.enrollmentDate)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => openDialog(selected, 'approve')}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-500 transition-colors"
            >
              <UserCheck size={14} /> {MSG.approve}
            </button>
            <button
              onClick={() => openDialog(selected, 'reject')}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-md text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              <X size={14} /> {MSG.reject}
            </button>
          </div>
        </div>

        {/* Dialog */}
        {dialog && <ActionDialog />}
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-lg font-semibold text-zinc-800">{MSG.pageTitle}</h1>
        {!loading && total > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            {total}
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center text-zinc-400 py-20">...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardList size={48} className="mx-auto text-zinc-300 mb-3" />
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
                <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colSubmittedAt}</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{item.code}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDetail(item)}
                      className="text-sm font-medium text-zinc-800 hover:text-red-700 hover:underline text-left"
                    >
                      {item.fullName}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(item.submittedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openDialog(item, 'approve')}
                        className="flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-500"
                      >
                        <UserCheck size={12} /> {MSG.approve}
                      </button>
                      <button
                        onClick={() => openDialog(item, 'reject')}
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

      {/* Dialog */}
      {dialog && <ActionDialog />}
    </div>
  );

  function ActionDialog() {
    const isReject = dialog!.action === 'reject';
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
          <h2 className="text-sm font-semibold text-zinc-800 mb-3">
            {isReject ? MSG.dlgRejectTitle : MSG.dlgApproveTitle}
          </h2>
          <p className="text-xs text-zinc-500 mb-3">
            {dialog!.subject.fullName} ({dialog!.subject.code})
          </p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              {MSG.dlgNoteLabel}
              {isReject && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); setNoteError(''); }}
              placeholder={isReject ? MSG.dlgRejectHint : MSG.dlgApproveHint}
              rows={3}
              className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm text-zinc-700 resize-none focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            {noteError && <p className="text-xs text-red-500 mt-1">{noteError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDialog(null)}
              disabled={actionLoading}
              className="px-3 py-1.5 text-sm text-zinc-600 border border-zinc-300 rounded-md hover:bg-zinc-50"
            >
              {MSG.dlgCancel}
            </button>
            <button
              onClick={handleAction}
              disabled={actionLoading}
              className={`px-3 py-1.5 text-sm text-white rounded-md disabled:opacity-50 ${
                isReject ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
              }`}
            >
              {actionLoading ? '...' : isReject ? MSG.reject : MSG.approve}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default EnrollmentApprovalsPage;
