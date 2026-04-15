import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  UserCheck,
  X,
  ClipboardList,
  Search,
  ChevronRight,
  Plane,
  PauseCircle,
  Smartphone,
  Home,
  MapPin,
  Calendar,
  FileText,
  User as UserIcon,
  CreditCard,
  Clock,
} from 'lucide-react';
import { getMessages } from '@/locales';
import {
  fetchAllRequests,
  reviewRequest,
} from '@/api/requests.api';
import type { RequestItem, RequestStatus, RequestType } from '@/types/request.types';
import { useToast } from '@/components/ui/Toast';

const MSG = getMessages().requests;

const STATUS_FILTERS: { key: RequestStatus | ''; label: string }[] = [
  { key: '', label: MSG.filterAll },
  { key: 'PENDING', label: MSG.filterPending },
  { key: 'APPROVED', label: MSG.filterApproved },
  { key: 'REJECTED', label: MSG.filterRejected },
];

const TYPE_LABELS: Record<string, string> = {
  TRAVEL: MSG.typeTRAVEL,
  POSTPONE: MSG.typePOSTPONE,
  CHANGE_DEVICE: MSG.typeCHANGE_DEVICE,
  CHANGE_ADDRESS: MSG.typeCHANGE_ADDRESS,
};

const TYPE_ICON: Record<string, typeof Plane> = {
  TRAVEL: Plane,
  POSTPONE: PauseCircle,
  CHANGE_DEVICE: Smartphone,
  CHANGE_ADDRESS: Home,
};

const TYPE_COLOR: Record<string, { bg: string; text: string; ring: string }> = {
  TRAVEL:         { bg: 'bg-sky-50',    text: 'text-sky-700',    ring: 'ring-sky-200' },
  POSTPONE:       { bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-200' },
  CHANGE_DEVICE:  { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200' },
  CHANGE_ADDRESS: { bg: 'bg-emerald-50',text: 'text-emerald-700',ring: 'ring-emerald-200' },
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: MSG.statusPENDING,
  APPROVED: MSG.statusAPPROVED,
  REJECTED: MSG.statusREJECTED,
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${min}`;
}

function formatDateOnly(isoOrYmd: string | null | undefined) {
  if (!isoOrYmd) return '—';
  const s = String(isoOrYmd);
  // Accept YYYY-MM-DD and full ISO
  const d = s.length === 10 ? new Date(s + 'T00:00:00') : new Date(s);
  if (isNaN(d.getTime())) return s;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// Type-specific detail rows with icons + human labels
function TypeSpecificDetails({
  type,
  details,
}: {
  type: RequestType;
  details: Record<string, any>;
}) {
  if (!details || Object.keys(details).length === 0) return null;

  const rows: { icon: typeof MapPin; label: string; value: string }[] = [];

  if (type === 'TRAVEL') {
    if (details.destination) rows.push({ icon: MapPin,   label: MSG.lblDestination, value: String(details.destination) });
    if (details.date_from)   rows.push({ icon: Calendar, label: MSG.lblDateFrom,    value: formatDateOnly(details.date_from) });
    if (details.date_to)     rows.push({ icon: Calendar, label: MSG.lblDateTo,      value: formatDateOnly(details.date_to) });
  } else if (type === 'POSTPONE') {
    if (details.date) rows.push({ icon: Calendar, label: MSG.lblPostponeDate, value: formatDateOnly(details.date) });
  } else if (type === 'CHANGE_ADDRESS') {
    if (details.new_address) rows.push({ icon: Home, label: MSG.lblNewAddress, value: String(details.new_address) });
  } else if (type === 'CHANGE_DEVICE') {
    if (details.new_device_id) rows.push({ icon: Smartphone, label: MSG.lblNewDevice, value: String(details.new_device_id) });
  }

  // Fallback: show any other keys generically
  const known = new Set(['destination', 'date_from', 'date_to', 'date', 'new_address', 'new_device_id']);
  Object.entries(details).forEach(([k, v]) => {
    if (!known.has(k) && v != null && String(v).trim() !== '') {
      rows.push({ icon: FileText, label: k, value: String(v) });
    }
  });

  if (rows.length === 0) return null;

  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
          {MSG.sectionRequestInfo}
        </h3>
      </div>
      <dl className="divide-y divide-zinc-100">
        {rows.map((r, i) => {
          const Icon = r.icon;
          return (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5">
              <Icon size={14} className="mt-0.5 text-zinc-400 shrink-0" />
              <dt className="text-sm text-zinc-500 w-28 shrink-0">{r.label}</dt>
              <dd className="text-sm text-zinc-800 font-medium flex-1 break-words">{r.value}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

type DialogState = {
  request: RequestItem;
  action: 'approve' | 'reject';
} | null;

function RequestApprovalsPage() {
  const { showToast } = useToast();

  // List state
  const [items, setItems] = useState<RequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  // Filters
  const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('');
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selected, setSelected] = useState<RequestItem | null>(null);

  // Dialog
  const [dialog, setDialog] = useState<DialogState>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchAllRequests({
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        page,
        limit,
      });
      const d = (res.data as any)?.data ?? res.data;
      setItems(Array.isArray(d?.items) ? d.items : []);
      setTotal(d?.total ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page]);

  useEffect(() => {
    document.title = MSG.documentTitle;
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
      setPage(1);
    }, 300);
  };

  const handleFilterChange = (key: RequestStatus | '') => {
    setStatusFilter(key);
    setPage(1);
  };

  const openDetail = (req: RequestItem) => {
    setSelected(req);
    setViewMode('detail');
  };

  const openDialog = (req: RequestItem, action: 'approve' | 'reject') => {
    setNote('');
    setNoteError('');
    setDialog({ request: req, action });
  };

  const handleAction = async () => {
    if (!dialog) return;

    if (dialog.action === 'reject' && !note.trim()) {
      setNoteError(MSG.msgNoteRequired);
      return;
    }

    setActionLoading(true);
    try {
      const apiAction = dialog.action === 'approve' ? 'APPROVED' : 'REJECTED';
      await reviewRequest(dialog.request.id, apiAction, note.trim() || undefined);
      showToast(
        dialog.action === 'approve' ? MSG.msgApproveSuccess : MSG.msgRejectSuccess,
        'success',
      );
      setDialog(null);
      if (viewMode === 'detail') {
        setViewMode('list');
        setSelected(null);
      }
      await loadData();
    } catch {
      showToast(MSG.msgError, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  // ─── DETAIL VIEW ───
  if (viewMode === 'detail' && selected) {
    const TypeIcon = TYPE_ICON[selected.type] || FileText;
    const typeColor = TYPE_COLOR[selected.type] || { bg: 'bg-zinc-50', text: 'text-zinc-700', ring: 'ring-zinc-200' };

    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button
          onClick={() => { setViewMode('list'); setSelected(null); }}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-4 transition-colors"
        >
          <ChevronLeft size={16} /> {MSG.back}
        </button>

        <div className="space-y-5">
          {/* Hero header — type-colored */}
          <div className={`${typeColor.bg} border border-zinc-200 rounded-lg p-5`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg bg-white ring-1 ${typeColor.ring} flex items-center justify-center shrink-0`}>
                  <TypeIcon size={22} className={typeColor.text} />
                </div>
                <div>
                  <h1 className={`text-base font-semibold ${typeColor.text}`}>
                    {TYPE_LABELS[selected.type] || selected.type}
                  </h1>
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono">{selected.code}</p>
                  <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                    <Clock size={11} /> {formatDate(selected.created_at)}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_BADGE[selected.status] || 'bg-zinc-100 text-zinc-600'}`}>
                {STATUS_LABELS[selected.status] || selected.status}
              </span>
            </div>
          </div>

          {/* Subject info */}
          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
              <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                {MSG.sectionSubjectInfo}
              </h3>
            </div>
            <dl className="divide-y divide-zinc-100">
              <div className="flex items-center gap-3 px-4 py-2.5">
                <UserIcon size={14} className="text-zinc-400 shrink-0" />
                <dt className="text-sm text-zinc-500 w-28 shrink-0">{MSG.detailSubject}</dt>
                <dd className="text-sm text-zinc-800 font-medium flex-1">{selected.subject_name}</dd>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5">
                <CreditCard size={14} className="text-zinc-400 shrink-0" />
                <dt className="text-sm text-zinc-500 w-28 shrink-0">{MSG.detailCccd}</dt>
                <dd className="text-sm text-zinc-800 font-mono flex-1">{selected.subject_cccd}</dd>
              </div>
            </dl>
          </div>

          {/* Type-specific details */}
          <TypeSpecificDetails type={selected.type} details={selected.details} />

          {/* Reason */}
          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
              <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                {MSG.detailReason}
              </h3>
            </div>
            <p className="px-4 py-3 text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
              {selected.reason}
            </p>
          </div>

          {/* Review info (if already reviewed) */}
          {selected.reviewed_at && (
            <div className="border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50/50">
              <div className="px-4 py-2.5 bg-zinc-100 border-b border-zinc-200">
                <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                  {MSG.sectionReviewInfo}
                </h3>
              </div>
              <dl className="divide-y divide-zinc-200">
                {selected.reviewed_by_name && (
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <UserIcon size={14} className="text-zinc-400 shrink-0" />
                    <dt className="text-sm text-zinc-500 w-28 shrink-0">{MSG.detailReviewedBy}</dt>
                    <dd className="text-sm text-zinc-800 flex-1">{selected.reviewed_by_name}</dd>
                  </div>
                )}
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <Clock size={14} className="text-zinc-400 shrink-0" />
                  <dt className="text-sm text-zinc-500 w-28 shrink-0">{MSG.detailReviewedAt}</dt>
                  <dd className="text-sm text-zinc-800 flex-1">{formatDate(selected.reviewed_at)}</dd>
                </div>
                {selected.review_note && (
                  <div className="flex items-start gap-3 px-4 py-2.5">
                    <FileText size={14} className="mt-0.5 text-zinc-400 shrink-0" />
                    <dt className="text-sm text-zinc-500 w-28 shrink-0">{MSG.detailReviewNote}</dt>
                    <dd className="text-sm text-zinc-800 flex-1 whitespace-pre-wrap break-words">{selected.review_note}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Actions (only for PENDING) */}
          {selected.status === 'PENDING' && (
            <div className="sticky bottom-0 flex gap-3 pt-4 pb-2 bg-gradient-to-t from-white via-white to-transparent">
              <button
                onClick={() => openDialog(selected, 'approve')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-500 transition-colors shadow-sm"
              >
                <UserCheck size={16} /> {MSG.approve}
              </button>
              <button
                onClick={() => openDialog(selected, 'reject')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-zinc-300 text-zinc-700 rounded-md text-sm font-medium hover:bg-zinc-50 transition-colors"
              >
                <X size={16} /> {MSG.reject}
              </button>
            </div>
          )}
        </div>

        {dialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
              <h2 className="text-sm font-semibold text-zinc-800 mb-3">
                {dialog.action === 'reject' ? MSG.dlgRejectTitle : MSG.dlgApproveTitle}
              </h2>
              <p className="text-xs text-zinc-500 mb-1">{dialog.request.subject_name}</p>
              <p className="text-xs text-zinc-400 mb-3 font-mono">
                {dialog.request.code} — {TYPE_LABELS[dialog.request.type] || dialog.request.type}
              </p>
              <div className="mb-4">
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  {MSG.dlgNoteLabel}
                  {dialog.action === 'reject' && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <textarea
                  value={note}
                  onChange={(e) => { setNote(e.target.value); setNoteError(''); }}
                  placeholder={dialog.action === 'reject' ? MSG.dlgRejectHint : MSG.dlgApproveHint}
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
                    dialog.action === 'reject' ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
                  }`}
                >
                  {actionLoading ? '...' : dialog.action === 'reject' ? MSG.reject : MSG.approve}
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
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-200 text-zinc-600">
              {total}
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        {/* Status filter tabs */}
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === f.key
                  ? 'bg-red-700 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={MSG.searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 border border-zinc-300 rounded-md text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center text-zinc-400 py-20">...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardList size={48} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-zinc-500 text-sm">
            {statusFilter || searchQuery ? MSG.emptyFilterTitle : MSG.emptyTitle}
          </p>
          <p className="text-zinc-400 text-xs mt-1">
            {statusFilter || searchQuery ? MSG.emptyFilterSubtitle : MSG.emptySubtitle}
          </p>
        </div>
      ) : (
        <>
          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colCode}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colSubject}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 hidden md:table-cell">{MSG.colCccd}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colType}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500">{MSG.colStatus}</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 hidden sm:table-cell">{MSG.colCreatedAt}</th>
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
                        {item.subject_name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 font-mono hidden md:table-cell">{item.subject_cccd}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const Icon = TYPE_ICON[item.type] || FileText;
                        const c = TYPE_COLOR[item.type] || { bg: 'bg-zinc-50', text: 'text-zinc-700', ring: 'ring-zinc-200' };
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text} ring-1 ${c.ring}`}>
                            <Icon size={11} /> {TYPE_LABELS[item.type] || item.type}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] || ''}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 hidden sm:table-cell">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {item.status === 'PENDING' ? (
                          <>
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
                          </>
                        ) : (
                          <button
                            onClick={() => openDetail(item)}
                            className="px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded text-xs font-medium hover:bg-zinc-200"
                          >
                            {MSG.viewDetail}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded border border-zinc-300 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`dot-${idx}`} className="px-1 text-zinc-400 text-xs">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-[28px] h-7 rounded text-xs font-medium ${
                        page === p
                          ? 'bg-red-700 text-white'
                          : 'border border-zinc-300 text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded border border-zinc-300 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-sm font-semibold text-zinc-800 mb-3">
              {dialog.action === 'reject' ? MSG.dlgRejectTitle : MSG.dlgApproveTitle}
            </h2>
            <p className="text-xs text-zinc-500 mb-1">{dialog.request.subject_name}</p>
            <p className="text-xs text-zinc-400 mb-3 font-mono">
              {dialog.request.code} — {TYPE_LABELS[dialog.request.type] || dialog.request.type}
            </p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                {MSG.dlgNoteLabel}
                {dialog.action === 'reject' && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <textarea
                value={note}
                onChange={(e) => { setNote(e.target.value); setNoteError(''); }}
                placeholder={dialog.action === 'reject' ? MSG.dlgRejectHint : MSG.dlgApproveHint}
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
                  dialog.action === 'reject' ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
                }`}
              >
                {actionLoading ? '...' : dialog.action === 'reject' ? MSG.reject : MSG.approve}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestApprovalsPage;
