import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  X,
} from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/navigation/PageHeader';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/data-display/EmptyState';
import { useToast } from '@/components/ui/Toast';
import DatePicker from '@/components/ui/DatePicker';

import {
  fetchAlerts,
  fetchAlertDetail,
  acknowledgeAlert,
  resolveAlert,
  escalateAlert,
  exportAlerts,
} from '@/api/alerts.api';

import type {
  AlertLevel,
  AlertStatus,
  AlertSource,
  AlertListItem,
  AlertListResponse,
  AlertDetail,
  AlertListParams,
} from '@/types/alert.types';

import { getMessages } from '@/locales';

// ---------------------------------------------------------------------------
// Locale
// ---------------------------------------------------------------------------
const MSG = getMessages().alerts;

// ---------------------------------------------------------------------------
// Badge mappings
// ---------------------------------------------------------------------------
const LEVEL_BADGE: Record<AlertLevel, { variant: string; label: string }> = {
  THAP: { variant: 'info', label: MSG.levelTHAP },
  TRUNG_BINH: { variant: 'warning', label: MSG.levelTRUNG_BINH },
  CAO: { variant: 'urgent', label: MSG.levelCAO },
  KHAN_CAP: { variant: 'processing', label: MSG.levelKHAN_CAP },
};

const STATUS_BADGE: Record<AlertStatus, { variant: string; label: string }> = {
  OPEN: { variant: 'pending', label: MSG.statusOPEN },
  ACKNOWLEDGED: { variant: 'info', label: MSG.statusACKNOWLEDGED },
  RESOLVED: { variant: 'done', label: MSG.statusRESOLVED },
  ESCALATED: { variant: 'warning', label: MSG.statusESCALATED },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDate(v?: string | null): string {
  if (!v) return '—';
  return new Date(v).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeLabel(type: string): string {
  const key = `type${type}` as keyof typeof MSG;
  return (MSG[key] as string) ?? type;
}

function getSourceLabel(source: AlertSource): string {
  const key = `source${source}` as keyof typeof MSG;
  return (MSG[key] as string) ?? source;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded">
      <div className="px-4 py-2.5 border-b border-zinc-200 flex items-center gap-2">
        {icon}
        <span className="text-[14px] font-semibold text-zinc-900">{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function LabelValue({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start py-1">
      <span className="text-[12px] text-zinc-500 w-[140px] shrink-0">{label}</span>
      <span className="text-[13px] text-zinc-900">{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AlertsPage() {
  const { showToast } = useToast();

  // ---- View state ----
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ---- List state ----
  const [items, setItems] = useState<AlertListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Filters ----
  const [filterStatus, setFilterStatus] = useState<AlertStatus | ''>('');
  const [filterLevel, setFilterLevel] = useState<AlertLevel | ''>('');
  const [filterSource, setFilterSource] = useState<AlertSource | ''>('');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');

  // ---- Detail state ----
  const [detail, setDetail] = useState<AlertDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // ---- Escalation modal ----
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalating, setEscalating] = useState(false);

  // ---- Action loading states ----
  const [acknowledging, setAcknowledging] = useState(false);
  const [resolving, setResolving] = useState(false);

  // ---- Document title ----
  useEffect(() => {
    document.title = MSG.documentTitle;
  }, []);

  // --------------------------------------------------------------------------
  // Export
  // --------------------------------------------------------------------------
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const params: Partial<AlertListParams> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterLevel) params.level = filterLevel;
      if (filterSource) params.source = filterSource;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;

      const res = await exportAlerts(params);
      const blob = new Blob([res.data as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `canh-bao-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast(MSG.errSystem, 'error');
    } finally {
      setExporting(false);
    }
  }, [filterStatus, filterLevel, filterSource, filterFrom, filterTo, showToast]);

  // --------------------------------------------------------------------------
  // Fetch list
  // --------------------------------------------------------------------------
  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: AlertListParams = { page, limit };
      if (filterStatus) params.status = filterStatus;
      if (filterLevel) params.level = filterLevel;
      if (filterSource) params.source = filterSource;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;

      const res = await fetchAlerts(params);
      const raw = res.data as any;
      const body = (raw?.data ?? raw) as AlertListResponse;

      setItems(body.data);
      setTotal(body.total);
    } catch {
      setError(MSG.errSystem);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filterStatus, filterLevel, filterSource, filterFrom, filterTo]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // --------------------------------------------------------------------------
  // Fetch detail
  // --------------------------------------------------------------------------
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetchAlertDetail(id);
      const raw = res.data as any;
      const body = (raw?.data ?? raw) as AlertDetail;
      setDetail(body);
    } catch {
      setDetailError(MSG.errNotFound);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openDetail = useCallback(
    (id: string) => {
      setSelectedId(id);
      setView('detail');
      loadDetail(id);
    },
    [loadDetail],
  );

  const goBackToList = useCallback(() => {
    setView('list');
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    loadList();
  }, [loadList]);

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------
  const handleAcknowledge = async () => {
    if (!selectedId) return;
    setAcknowledging(true);
    try {
      await acknowledgeAlert(selectedId);
      showToast(MSG.msgAckSuccess, 'success');
      await loadDetail(selectedId);
    } catch {
      showToast(MSG.msgError, 'error');
    } finally {
      setAcknowledging(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedId) return;
    setResolving(true);
    try {
      await resolveAlert(selectedId);
      showToast(MSG.msgResolveSuccess, 'success');
      await loadDetail(selectedId);
    } catch {
      showToast(MSG.msgError, 'error');
    } finally {
      setResolving(false);
    }
  };

  const handleEscalateConfirm = async () => {
    if (!selectedId) return;
    setEscalating(true);
    try {
      await escalateAlert(selectedId, escalateReason || undefined);
      showToast(MSG.msgEscalateSuccess, 'success');
      setShowEscalateModal(false);
      setEscalateReason('');
      goBackToList();
    } catch {
      showToast(MSG.msgError, 'error');
    } finally {
      setEscalating(false);
    }
  };

  // --------------------------------------------------------------------------
  // Clear filters
  // --------------------------------------------------------------------------
  const clearFilters = () => {
    setFilterStatus('');
    setFilterLevel('');
    setFilterSource('');
    setFilterFrom('');
    setFilterTo('');
    setPage(1);
  };

  const hasFilters = filterStatus || filterLevel || filterSource || filterFrom || filterTo;

  // --------------------------------------------------------------------------
  // Pagination
  // --------------------------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  const fromItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const toItem = Math.min(page * limit, total);

  // ==========================================================================
  // DETAIL VIEW
  // ==========================================================================
  if (view === 'detail') {
    return (
      <div className="space-y-4">
        {/* Escalation Modal */}
        {showEscalateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-zinc-900">
                  {MSG.escalateTitle}
                </h3>
                <button
                  onClick={() => {
                    setShowEscalateModal(false);
                    setEscalateReason('');
                  }}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-[13px] text-zinc-600">{MSG.escalateDesc}</p>
                <div>
                  <label className="block text-[12px] text-zinc-500 mb-1">
                    {MSG.escalateReason}
                  </label>
                  <textarea
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    placeholder={MSG.escalateReasonPlaceholder}
                    rows={3}
                    className="w-full border border-zinc-300 rounded px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-700 focus:border-red-700 resize-none"
                  />
                </div>
              </div>
              <div className="px-5 py-3 border-t border-zinc-200 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowEscalateModal(false);
                    setEscalateReason('');
                  }}
                  disabled={escalating}
                >
                  {MSG.escalateCancel}
                </Button>
                <Button
                  variant="danger-ghost"
                  size="sm"
                  onClick={handleEscalateConfirm}
                  disabled={escalating}
                >
                  {escalating ? '...' : MSG.escalateConfirm}
                </Button>
              </div>
            </div>
          </div>
        )}

        <PageHeader
          title={MSG.detailTitle}
          breadcrumbs={[
            { label: MSG.breadcrumbDashboard, href: '/' },
            { label: MSG.breadcrumbAlerts, href: '/alerts' },
            { label: MSG.breadcrumbDetail },
          ]}
        />

        <Button variant="ghost" size="sm" onClick={goBackToList}>
          <ChevronLeft size={14} className="mr-1" />
          {MSG.back}
        </Button>

        {detailLoading && (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[160px] w-full" />
          </div>
        )}

        {detailError && !detailLoading && (
          <EmptyState
            title={MSG.errNotFound}
            subtitle={MSG.errSystem}
            action={
              <Button variant="outline" size="sm" onClick={() => selectedId && loadDetail(selectedId)}>
                {MSG.retry}
              </Button>
            }
          />
        )}

        {detail && !detailLoading && !detailError && (
          <div className="space-y-4">
            {/* Info Card */}
            <Card title={MSG.sectionInfo} icon={<ShieldAlert size={15} className="text-red-700" />}>
              <div className="space-y-0.5">
                <LabelValue label={MSG.lblCode}>
                  <span className="font-mono">{detail.code}</span>
                </LabelValue>
                <LabelValue label={MSG.lblType}>{getTypeLabel(detail.type)}</LabelValue>
                <LabelValue label={MSG.lblLevel}>
                  <Badge variant={LEVEL_BADGE[detail.level]?.variant as any}>
                    {LEVEL_BADGE[detail.level]?.label ?? detail.level}
                  </Badge>
                </LabelValue>
                <LabelValue label={MSG.lblStatus}>
                  <Badge variant={STATUS_BADGE[detail.status]?.variant as any}>
                    {STATUS_BADGE[detail.status]?.label ?? detail.status}
                  </Badge>
                </LabelValue>
                <LabelValue label={MSG.lblSource}>{getSourceLabel(detail.source)}</LabelValue>
                <LabelValue label={MSG.lblSubject}>
                  {detail.subject ? (
                    <span className="text-red-700 hover:underline cursor-pointer">
                      {detail.subject.full_name} ({detail.subject.code})
                    </span>
                  ) : (
                    '—'
                  )}
                </LabelValue>
                <LabelValue label={MSG.lblCreatedAt}>{fmtDate(detail.created_at)}</LabelValue>
                <LabelValue label={MSG.lblResolvedAt}>{fmtDate(detail.resolved_at)}</LabelValue>
                <LabelValue label={MSG.lblEscalatedAt}>{fmtDate(detail.escalated_at)}</LabelValue>
                {detail.case_id && (
                  <LabelValue label={MSG.lblCaseId}>
                    <span className="text-red-700 hover:underline cursor-pointer font-mono">
                      {detail.case_id}
                    </span>
                  </LabelValue>
                )}
              </div>
            </Card>

            {/* Trigger Event Card */}
            <Card
              title={MSG.sectionTrigger}
              icon={<AlertTriangle size={15} className="text-amber-600" />}
            >
              {detail.trigger_event ? (
                <div className="space-y-0.5">
                  <LabelValue label={MSG.lblCode}>
                    <span className="font-mono">{detail.trigger_event.code}</span>
                  </LabelValue>
                  <LabelValue label={MSG.lblType}>{detail.trigger_event.type}</LabelValue>
                  <LabelValue label="Result">{detail.trigger_event.result ?? '—'}</LabelValue>
                  <LabelValue label={MSG.lblCreatedAt}>
                    {fmtDate(detail.trigger_event.created_at)}
                  </LabelValue>
                </div>
              ) : (
                <p className="text-[12px] text-zinc-400 italic">—</p>
              )}
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              {detail.status === 'OPEN' && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAcknowledge}
                    disabled={acknowledging}
                  >
                    <CheckCircle2 size={14} className="mr-1" />
                    {acknowledging ? '...' : MSG.acknowledge}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResolve}
                    disabled={resolving}
                  >
                    {resolving ? '...' : MSG.resolve}
                  </Button>
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    onClick={() => setShowEscalateModal(true)}
                  >
                    <ArrowUpRight size={14} className="mr-1" />
                    {MSG.escalate}
                  </Button>
                </>
              )}

              {detail.status === 'ACKNOWLEDGED' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResolve}
                    disabled={resolving}
                  >
                    {resolving ? '...' : MSG.resolve}
                  </Button>
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    onClick={() => setShowEscalateModal(true)}
                  >
                    <ArrowUpRight size={14} className="mr-1" />
                    {MSG.escalate}
                  </Button>
                </>
              )}

              {detail.status === 'ESCALATED' && detail.case_id && (
                <span className="text-[12px] text-zinc-500">
                  {MSG.lblCaseId}: {detail.case_id}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // LIST VIEW
  // ==========================================================================
  return (
    <div className="space-y-4">
      <PageHeader
        title={MSG.pageTitle}
        breadcrumbs={[
          { label: MSG.breadcrumbDashboard, href: '/' },
          { label: MSG.breadcrumbAlerts },
        ]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download size={14} />}
            loading={exporting}
            onClick={handleExport}
          >
            Xuất Excel
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Status */}
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">{MSG.filterStatus}</label>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as AlertStatus | '');
              setPage(1);
            }}
            className="h-8 border border-zinc-300 rounded px-2 text-[12px] text-zinc-700 bg-white focus:outline-none focus:ring-1 focus:ring-red-700 focus:border-red-700"
          >
            <option value="">{MSG.filterAll}</option>
            <option value="OPEN">{MSG.statusOPEN}</option>
            <option value="ACKNOWLEDGED">{MSG.statusACKNOWLEDGED}</option>
            <option value="RESOLVED">{MSG.statusRESOLVED}</option>
            <option value="ESCALATED">{MSG.statusESCALATED}</option>
          </select>
        </div>

        {/* Level */}
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">{MSG.filterLevel}</label>
          <select
            value={filterLevel}
            onChange={(e) => {
              setFilterLevel(e.target.value as AlertLevel | '');
              setPage(1);
            }}
            className="h-8 border border-zinc-300 rounded px-2 text-[12px] text-zinc-700 bg-white focus:outline-none focus:ring-1 focus:ring-red-700 focus:border-red-700"
          >
            <option value="">{MSG.filterAll}</option>
            <option value="THAP">{MSG.levelTHAP}</option>
            <option value="TRUNG_BINH">{MSG.levelTRUNG_BINH}</option>
            <option value="CAO">{MSG.levelCAO}</option>
            <option value="KHAN_CAP">{MSG.levelKHAN_CAP}</option>
          </select>
        </div>

        {/* Source */}
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">{MSG.filterSource}</label>
          <select
            value={filterSource}
            onChange={(e) => {
              setFilterSource(e.target.value as AlertSource | '');
              setPage(1);
            }}
            className="h-8 border border-zinc-300 rounded px-2 text-[12px] text-zinc-700 bg-white focus:outline-none focus:ring-1 focus:ring-red-700 focus:border-red-700"
          >
            <option value="">{MSG.filterAll}</option>
            <option value="DEFAULT">{MSG.sourceDEFAULT}</option>
            <option value="CUSTOM">{MSG.sourceCUSTOM}</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">{MSG.filterFrom}</label>
          <DatePicker
            value={filterFrom}
            onChange={(v: string) => {
              setFilterFrom(v);
              setPage(1);
            }}
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">{MSG.filterTo}</label>
          <DatePicker
            value={filterTo}
            onChange={(v: string) => {
              setFilterTo(v);
              setPage(1);
            }}
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X size={14} className="mr-1" />
            {MSG.filterClear}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded overflow-hidden">
        {loading && (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="p-8">
            <EmptyState
              title={MSG.errSystem}
              subtitle={MSG.emptySubtitle}
              action={
                <Button variant="outline" size="sm" onClick={loadList}>
                  {MSG.retry}
                </Button>
              }
            />
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="p-8">
            <EmptyState title={MSG.emptyTitle} subtitle={MSG.emptySubtitle} />
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">
                  {MSG.colTime}
                </th>
                <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">
                  {MSG.colCode}
                </th>
                <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">
                  {MSG.colSubject}
                </th>
                <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">
                  {MSG.colType}
                </th>
                <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">
                  {MSG.colLevel}
                </th>
                <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">
                  {MSG.colStatus}
                </th>
                <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">
                  {MSG.colSource}
                </th>
                <th className="text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-4 py-2">
                  {MSG.colActions}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const levelBadge = LEVEL_BADGE[item.level];
                const statusBadge = STATUS_BADGE[item.status];
                return (
                  <tr
                    key={item.id}
                    className="h-10 border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors"
                    onClick={() => openDetail(item.id)}
                  >
                    <td className="px-4 text-[12px] text-zinc-600 whitespace-nowrap">
                      {fmtDate(item.created_at)}
                    </td>
                    <td className="px-4 text-[12px] text-zinc-900 font-mono whitespace-nowrap">
                      {item.code}
                    </td>
                    <td className="px-4 text-[12px] text-zinc-700 whitespace-nowrap max-w-[180px] truncate">
                      {item.subject
                        ? `${item.subject.full_name} (${item.subject.code})`
                        : '—'}
                    </td>
                    <td className="px-4 text-[12px] text-zinc-700 whitespace-nowrap">
                      {getTypeLabel(item.type)}
                    </td>
                    <td className="px-4">
                      <Badge variant={levelBadge?.variant as any}>
                        {levelBadge?.label ?? item.level}
                      </Badge>
                    </td>
                    <td className="px-4">
                      <Badge variant={statusBadge?.variant as any}>
                        {statusBadge?.label ?? item.status}
                      </Badge>
                    </td>
                    <td className="px-4 text-[12px] text-zinc-600 whitespace-nowrap">
                      {getSourceLabel(item.source)}
                    </td>
                    <td className="px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          openDetail(item.id);
                        }}
                        title={MSG.viewDetail}
                      >
                        <Eye size={14} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-zinc-500">
            {MSG.paginationInfo(fromItem, toItem, total)}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 flex items-center justify-center rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            {pageNumbers.map((pn, idx) =>
              pn === '...' ? (
                <span key={`dots-${idx}`} className="px-1 text-[12px] text-zinc-400">
                  ...
                </span>
              ) : (
                <button
                  key={pn}
                  onClick={() => setPage(pn as number)}
                  className={`h-8 min-w-[32px] px-2 flex items-center justify-center rounded border text-[12px] transition-colors ${
                    page === pn
                      ? 'bg-red-700 text-white border-red-700'
                      : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {pn}
                </button>
              ),
            )}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 flex items-center justify-center rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
