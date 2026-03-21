import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  ArrowLeft,
  FileText,
  Send,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/navigation/PageHeader';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/data-display/EmptyState';
import { useToast } from '@/components/ui/Toast';
import DatePicker from '@/components/ui/DatePicker';

import {
  fetchCases,
  fetchCaseDetail,
  createCase,
  closeCase,
  reopenCase,
  addCaseNote,
  exportCases,
} from '@/api/cases.api';
import { fetchSubjects } from '@/api/subjects.api';

import { getMessages } from '@/locales';

import type { AlertLevel } from '@/types/alert.types';
import type {
  CaseStatus,
  CaseSource,
  CaseListItem,
  CaseListResponse,
  CaseDetail,
  CaseNote,
  CaseListParams,
  CreateCasePayload,
  CloseCasePayload,
  CreateNotePayload,
} from '@/types/case.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MSG = getMessages().cases;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}


const SEVERITY_BADGE_MAP: Record<AlertLevel, 'info' | 'warning' | 'urgent' | 'processing'> = {
  THAP: 'info',
  TRUNG_BINH: 'warning',
  CAO: 'urgent',
  KHAN_CAP: 'processing',
};

const SEVERITY_LABEL: Record<AlertLevel, string> = {
  THAP: MSG.severityTHAP,
  TRUNG_BINH: MSG.severityTRUNG_BINH,
  CAO: MSG.severityCAO,
  KHAN_CAP: MSG.severityKHAN_CAP,
};

const SOURCE_LABEL: Record<CaseSource, string> = {
  AUTO: MSG.sourceAUTO,
  MANUAL_ESCALATE: MSG.sourceMANUAL_ESCALATE,
  MANUAL_NEW: MSG.sourceMANUAL_NEW,
};

const STATUS_LABEL: Record<CaseStatus, string> = {
  OPEN: MSG.statusOPEN,
  CLOSED: MSG.statusCLOSED,
};

const SEVERITY_OPTIONS: AlertLevel[] = ['THAP', 'TRUNG_BINH', 'CAO', 'KHAN_CAP'];
const SOURCE_OPTIONS: CaseSource[] = ['AUTO', 'MANUAL_ESCALATE', 'MANUAL_NEW'];
const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Reusable internal components
// ---------------------------------------------------------------------------

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-zinc-200 rounded">
      {title && (
        <div className="px-4 py-2.5 border-b border-zinc-200">
          <h3 className="text-[14px] font-semibold text-zinc-900">{title}</h3>
        </div>
      )}
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function LabelValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex py-1">
      <span className="text-[12px] text-zinc-500 w-[140px] shrink-0">{label}</span>
      <span className="text-[13px] text-zinc-900">{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CasesPage() {
  const { showToast } = useToast();

  // ---- View state ----
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ---- List state ----
  const [activeTab, setActiveTab] = useState<CaseStatus>('OPEN');
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Filters
  const [filterSeverity, setFilterSeverity] = useState<AlertLevel | ''>('');
  const [filterSource, setFilterSource] = useState<CaseSource | ''>('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // ---- Detail state ----
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // ---- Modal state ----
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);

  // ---- Note state ----
  const [noteContent, setNoteContent] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // ---- Export ----
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const params: Partial<CaseListParams> = { status: activeTab };
      if (filterSeverity) params.severity = filterSeverity;
      if (filterSource) params.source = filterSource;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;

      const res = await exportCases(params);
      const blob = new Blob([res.data as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vu-viec-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast(MSG.errSystem, 'error');
    } finally {
      setExporting(false);
    }
  }, [activeTab, filterSeverity, filterSource, filterFrom, filterTo, showToast]);

  // ---- Load list ----
  const loadCases = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const params: CaseListParams = {
        page,
        limit: PAGE_SIZE,
        status: activeTab,
        sort: 'created_at',
        order: 'desc',
      };
      if (filterSeverity) params.severity = filterSeverity;
      if (filterSource) params.source = filterSource;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;

      const res = await fetchCases(params);
      const raw = res.data as any;
      const body = (raw?.data ?? raw) as CaseListResponse;
      setCases(body.data ?? []);
      setTotal(body.total ?? 0);
    } catch {
      setListError(MSG.errSystem);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, filterSeverity, filterSource, filterFrom, filterTo]);

  useEffect(() => {
    if (view === 'list') loadCases();
  }, [loadCases, view]);

  // Reset page when filters / tab change
  useEffect(() => {
    setPage(1);
  }, [activeTab, filterSeverity, filterSource, filterFrom, filterTo]);

  // ---- Load detail ----
  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetchCaseDetail(id);
      const raw = res.data as any;
      const body = (raw?.data ?? raw) as CaseDetail;
      setDetail(body);
    } catch {
      setDetailError(MSG.errNotFound);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openDetail = (id: string) => {
    setSelectedId(id);
    setView('detail');
    loadDetail(id);
  };

  const goBack = () => {
    setView('list');
    setSelectedId(null);
    setDetail(null);
    setNoteContent('');
  };

  // ---- Document title ----
  useEffect(() => {
    document.title = MSG.documentTitle;
  }, []);

  // ---- Pagination helpers ----
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paginationFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const paginationTo = Math.min(page * PAGE_SIZE, total);

  // ---- Clear filters ----
  const clearFilters = () => {
    setFilterSeverity('');
    setFilterSource('');
    setFilterFrom('');
    setFilterTo('');
  };

  const hasActiveFilters = filterSeverity || filterSource || filterFrom || filterTo;

  // ---- Add note ----
  const handleAddNote = async () => {
    if (!selectedId || !noteContent.trim()) return;
    setNoteSubmitting(true);
    try {
      const payload: CreateNotePayload = { content: noteContent.trim() };
      await addCaseNote(selectedId, payload);
      showToast(MSG.msgNoteSuccess, 'success');
      setNoteContent('');
      loadDetail(selectedId);
    } catch {
      showToast(MSG.msgError, 'error');
    } finally {
      setNoteSubmitting(false);
    }
  };

  // ---- Reopen ----
  const handleReopen = async () => {
    if (!selectedId) return;
    try {
      await reopenCase(selectedId);
      showToast(MSG.msgReopenSuccess, 'success');
      setShowReopenModal(false);
      loadDetail(selectedId);
    } catch {
      showToast(MSG.msgError, 'error');
    }
  };

  // ===========================================================================
  // RENDER — Detail view
  // ===========================================================================
  if (view === 'detail') {
    return (
      <div className="space-y-4">
        {/* Back + Breadcrumb header */}
        <div className="flex items-center gap-2 mb-1">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={15} />} onClick={goBack}>
            {MSG.back}
          </Button>
        </div>

        <PageHeader
          title={detail ? `${MSG.detailTitle} — ${detail.code}` : MSG.detailTitle}
          breadcrumbs={[
            { label: MSG.breadcrumbDashboard, href: '/' },
            { label: MSG.breadcrumbCases, href: '/cases' },
            { label: detail?.code ?? '...' },
          ]}
        />

        {detailLoading && (
          <div className="space-y-3">
            <Skeleton className="h-48 w-full rounded" />
            <Skeleton className="h-32 w-full rounded" />
            <Skeleton className="h-32 w-full rounded" />
          </div>
        )}

        {detailError && !detailLoading && (
          <EmptyState
            icon={<AlertTriangle size={40} className="text-zinc-400" />}
            title={MSG.errNotFound}
            subtitle={MSG.errSystem}
            action={
              <Button variant="outline" size="sm" onClick={() => selectedId && loadDetail(selectedId)}>
                {MSG.retry}
              </Button>
            }
          />
        )}

        {detail && !detailLoading && (
          <div className="space-y-4">
            {/* Main info */}
            <Card title={MSG.sectionInfo}>
              <div className="space-y-0.5">
                <LabelValue label={MSG.lblCode}>{detail.code}</LabelValue>
                <LabelValue label={MSG.lblSubject}>
                  {detail.subject.full_name} ({detail.subject.code})
                </LabelValue>
                <LabelValue label={MSG.lblSeverity}>
                  <Badge variant={SEVERITY_BADGE_MAP[detail.severity]}>
                    {SEVERITY_LABEL[detail.severity]}
                  </Badge>
                </LabelValue>
                <LabelValue label={MSG.lblStatus}>
                  <Badge variant={detail.status === 'OPEN' ? 'pending' : 'done'}>
                    {STATUS_LABEL[detail.status]}
                  </Badge>
                </LabelValue>
                <LabelValue label={MSG.lblSource}>{SOURCE_LABEL[detail.source]}</LabelValue>
                {detail.description && (
                  <LabelValue label={MSG.lblDescription}>
                    <span className="whitespace-pre-wrap">{detail.description}</span>
                  </LabelValue>
                )}
                <LabelValue label={MSG.lblAssignee}>{detail.assignee_name ?? '—'}</LabelValue>
                <LabelValue label={MSG.lblCreatedBy}>{detail.created_by_name}</LabelValue>
                <LabelValue label={MSG.lblCreatedAt}>{formatDateTime(detail.created_at)}</LabelValue>
                {detail.closed_at && (
                  <LabelValue label={MSG.lblClosedAt}>{formatDateTime(detail.closed_at)}</LabelValue>
                )}
              </div>
            </Card>

            {/* Escalation info */}
            {(detail.escalation_type || detail.escalated_from_alert_id) && (
              <Card title={MSG.sectionEscalation}>
                <div className="space-y-0.5">
                  {detail.escalation_type && (
                    <LabelValue label={MSG.lblEscalationType}>
                      {detail.escalation_type === 'AUTO' ? MSG.escalationAUTO : MSG.escalationMANUAL}
                    </LabelValue>
                  )}
                  {detail.escalation_reason && (
                    <LabelValue label={MSG.lblEscalationReason}>
                      <span className="whitespace-pre-wrap">{detail.escalation_reason}</span>
                    </LabelValue>
                  )}
                  {detail.escalation_rule_name && (
                    <LabelValue label={MSG.lblEscalationRule}>{detail.escalation_rule_name}</LabelValue>
                  )}
                  {detail.escalated_from_alert_id && (
                    <LabelValue label={MSG.lblFromAlert}>
                      <span className="text-red-700 cursor-pointer flex items-center gap-1">
                        {detail.escalated_from_alert_id}
                        <ExternalLink size={12} />
                      </span>
                    </LabelValue>
                  )}
                </div>
              </Card>
            )}

            {/* Closing info */}
            {detail.status === 'CLOSED' && detail.closing_note && (
              <Card title={MSG.lblClosingNote}>
                <div className="space-y-0.5">
                  <LabelValue label={MSG.lblClosingNote}>
                    <span className="whitespace-pre-wrap">{detail.closing_note}</span>
                  </LabelValue>
                  {detail.closed_at && (
                    <LabelValue label={MSG.lblClosedAt}>{formatDateTime(detail.closed_at)}</LabelValue>
                  )}
                </div>
              </Card>
            )}

            {/* Related case */}
            {detail.related_case_id && (
              <Card title={MSG.lblRelatedCase}>
                <div
                  className="text-[13px] text-red-700 cursor-pointer flex items-center gap-1"
                  onClick={() => openDetail(detail.related_case_id!)}
                >
                  {detail.related_case_id}
                  <ExternalLink size={12} />
                </div>
              </Card>
            )}

            {/* Linked events */}
            {detail.linked_event_ids && detail.linked_event_ids.length > 0 && (
              <Card title={MSG.sectionLinkedEvents}>
                <div className="flex flex-wrap gap-2">
                  {detail.linked_event_ids.map((eid) => (
                    <span
                      key={eid}
                      className="text-[12px] bg-zinc-100 text-zinc-700 px-2 py-1 rounded"
                    >
                      {eid}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Notes section */}
            <Card
              title={`${MSG.sectionNotes} (${detail.notes?.length ?? 0})`}
            >
              <div className="space-y-2">
                {(!detail.notes || detail.notes.length === 0) && (
                  <p className="text-[12px] text-zinc-400 py-2">{MSG.noteEmpty}</p>
                )}
                {detail.notes?.map((note: CaseNote) => (
                  <div key={note.id} className="bg-white border border-zinc-200 rounded p-3 mb-2">
                    <p className="text-[13px] text-zinc-900 whitespace-pre-wrap">{note.content}</p>
                    {note.image_url && (
                      <img
                        src={note.image_url}
                        alt=""
                        className="mt-2 max-h-48 rounded border border-zinc-200"
                      />
                    )}
                    <div className="flex justify-between mt-2 text-[11px] text-zinc-500">
                      <span>{note.created_by_name}</span>
                      <span>{formatDateTime(note.created_at)}</span>
                    </div>
                  </div>
                ))}

                {/* Add note form — only when OPEN */}
                {detail.status === 'OPEN' && (
                  <div className="mt-3 pt-3 border-t border-zinc-200">
                    <textarea
                      className="w-full border border-zinc-300 rounded px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-700 resize-none"
                      rows={3}
                      placeholder={MSG.notePlaceholder}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Send size={14} />}
                        onClick={handleAddNote}
                        disabled={!noteContent.trim() || noteSubmitting}
                      >
                        {noteSubmitting ? '...' : MSG.noteSubmit}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {detail.status === 'OPEN' && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowCloseModal(true)}
                >
                  {MSG.closeCase}
                </Button>
              )}
              {detail.status === 'CLOSED' && (
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<RefreshCw size={14} />}
                  onClick={() => setShowReopenModal(true)}
                >
                  {MSG.reopenCase}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Close modal */}
        {showCloseModal && (
          <CloseCaseModal
            onClose={() => setShowCloseModal(false)}
            onConfirm={async (note) => {
              if (!selectedId) return;
              try {
                const payload: CloseCasePayload = { closing_note: note };
                await closeCase(selectedId, payload);
                showToast(MSG.msgCloseSuccess, 'success');
                setShowCloseModal(false);
                loadDetail(selectedId);
              } catch {
                showToast(MSG.msgError, 'error');
              }
            }}
          />
        )}

        {/* Reopen modal */}
        {showReopenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-5">
              <h2 className="text-[14px] font-semibold text-zinc-900 mb-2">{MSG.reopenTitle}</h2>
              <p className="text-[13px] text-zinc-600 mb-4">{MSG.reopenDesc}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowReopenModal(false)}>
                  {MSG.reopenCancel}
                </Button>
                <Button variant="primary" size="sm" onClick={handleReopen}>
                  {MSG.reopenConfirm}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===========================================================================
  // RENDER — List view
  // ===========================================================================
  return (
    <div className="space-y-4">
      <PageHeader
        title={MSG.pageTitle}
        breadcrumbs={[
          { label: MSG.breadcrumbDashboard, href: '/' },
          { label: MSG.breadcrumbCases },
        ]}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download size={14} />}
              loading={exporting}
              onClick={handleExport}
            >
              Xuất Excel
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={15} />}
              onClick={() => setShowCreateModal(true)}
            >
              {MSG.createCase}
            </Button>
          </>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
            activeTab === 'OPEN'
              ? 'border-red-700 text-red-700'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
          onClick={() => setActiveTab('OPEN')}
        >
          {MSG.tabOpen}
        </button>
        <button
          className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
            activeTab === 'CLOSED'
              ? 'border-red-700 text-red-700'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
          onClick={() => setActiveTab('CLOSED')}
        >
          {MSG.tabClosed}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Severity filter */}
        <select
          className="h-8 px-2 text-[12px] border border-zinc-300 rounded bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-red-700"
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as AlertLevel | '')}
        >
          <option value="">{MSG.filterSeverity}</option>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABEL[s]}
            </option>
          ))}
        </select>

        {/* Source filter */}
        <select
          className="h-8 px-2 text-[12px] border border-zinc-300 rounded bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-red-700"
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value as CaseSource | '')}
        >
          <option value="">{MSG.filterSource}</option>
          {SOURCE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABEL[s]}
            </option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <DatePicker
            value={filterFrom}
            onChange={setFilterFrom}
            placeholder={MSG.filterFrom}
          />
          <span className="text-[12px] text-zinc-400">—</span>
          <DatePicker
            value={filterTo}
            onChange={setFilterTo}
            placeholder={MSG.filterTo}
          />
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" leftIcon={<X size={14} />} onClick={clearFilters}>
            {MSG.filterClear}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border border-zinc-200 rounded bg-white overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-3 py-2 text-[12px] font-medium text-zinc-500">{MSG.colTime}</th>
              <th className="px-3 py-2 text-[12px] font-medium text-zinc-500">{MSG.colCode}</th>
              <th className="px-3 py-2 text-[12px] font-medium text-zinc-500">{MSG.colSubject}</th>
              <th className="px-3 py-2 text-[12px] font-medium text-zinc-500">{MSG.colSeverity}</th>
              <th className="px-3 py-2 text-[12px] font-medium text-zinc-500">{MSG.colSource}</th>
              <th className="px-3 py-2 text-[12px] font-medium text-zinc-500">{MSG.colAssignee}</th>
              <th className="px-3 py-2 text-[12px] font-medium text-zinc-500 w-[80px]"></th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td className="px-3 py-2"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-3 py-2"><Skeleton className="h-4 w-12" /></td>
                </tr>
              ))}

            {!loading && listError && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle size={24} className="text-zinc-400" />
                    <p className="text-[13px] text-zinc-500">{listError}</p>
                    <Button variant="outline" size="sm" onClick={loadCases}>
                      {MSG.retry}
                    </Button>
                  </div>
                </td>
              </tr>
            )}

            {!loading && !listError && cases.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10">
                  <EmptyState
                    icon={<FileText size={40} className="text-zinc-300" />}
                    title={MSG.emptyTitle}
                    subtitle={MSG.emptySubtitle}
                  />
                </td>
              </tr>
            )}

            {!loading &&
              !listError &&
              cases.map((c) => (
                <tr
                  key={c.id}
                  className="h-10 border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors"
                  onClick={() => openDetail(c.id)}
                >
                  <td className="px-3 text-[12px] text-zinc-600 whitespace-nowrap">
                    {formatDateTime(c.created_at)}
                  </td>
                  <td className="px-3 text-[13px] text-zinc-900 font-medium whitespace-nowrap">
                    {c.code}
                  </td>
                  <td className="px-3 text-[12px] text-zinc-700 whitespace-nowrap">
                    {c.subject.full_name}
                  </td>
                  <td className="px-3">
                    <Badge variant={SEVERITY_BADGE_MAP[c.severity]}>
                      {SEVERITY_LABEL[c.severity]}
                    </Badge>
                  </td>
                  <td className="px-3 text-[12px] text-zinc-600 whitespace-nowrap">
                    {SOURCE_LABEL[c.source]}
                  </td>
                  <td className="px-3 text-[12px] text-zinc-600 whitespace-nowrap">
                    {c.assignee_name ?? '—'}
                  </td>
                  <td className="px-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        openDetail(c.id);
                      }}
                    >
                      {MSG.viewDetail}
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && !listError && total > 0 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[12px] text-zinc-500">
            {MSG.paginationInfo(paginationFrom, paginationTo, total)}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft size={14} />}
            >
              {''}
            </Button>
            <span className="text-[12px] text-zinc-600 px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              leftIcon={<ChevronRight size={14} />}
            >
              {''}
            </Button>
          </div>
        </div>
      )}

      {/* Create case modal */}
      {showCreateModal && (
        <CreateCaseModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            showToast(MSG.msgCreateSuccess, 'success');
            loadCases();
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// Create Case Modal
// =============================================================================

function CreateCaseModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();

  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectResults, setSubjectResults] = useState<{ id: string; code: string; full_name: string }[]>([]);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<{ id: string; code: string; full_name: string } | null>(null);
  const [severity, setSeverity] = useState<AlertLevel | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced subject search
  useEffect(() => {
    if (!subjectQuery.trim()) {
      setSubjectResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSubjectLoading(true);
      try {
        const res = await fetchSubjects({ page: 1, limit: 20, q: subjectQuery.trim() });
        const raw = res.data as any;
        const body = raw?.data ?? raw;
        const list = Array.isArray(body) ? body : body?.data ?? [];
        setSubjectResults(list);
      } catch {
        setSubjectResults([]);
      } finally {
        setSubjectLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [subjectQuery]);

  const handleCreate = async () => {
    if (!selectedSubject || !severity) return;
    setSubmitting(true);
    try {
      const payload: CreateCasePayload = {
        subject_id: selectedSubject.id,
        severity: severity as AlertLevel,
        description: description.trim() || undefined,
      };
      await createCase(payload);
      onSuccess();
    } catch {
      showToast(MSG.msgError, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-5">
        <h2 className="text-[14px] font-semibold text-zinc-900 mb-4">{MSG.createTitle}</h2>

        {/* Subject search */}
        <div className="mb-3">
          <label className="block text-[12px] text-zinc-600 mb-1">{MSG.createSubjectLabel}</label>
          {selectedSubject ? (
            <div className="flex items-center justify-between border border-zinc-300 rounded px-3 py-2 bg-zinc-50">
              <span className="text-[13px] text-zinc-900">
                {selectedSubject.full_name} ({selectedSubject.code})
              </span>
              <button
                className="text-zinc-400 hover:text-zinc-600"
                onClick={() => {
                  setSelectedSubject(null);
                  setSubjectQuery('');
                }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                className="w-full border border-zinc-300 rounded px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-700"
                placeholder={MSG.createSubjectPlaceholder}
                value={subjectQuery}
                onChange={(e) => setSubjectQuery(e.target.value)}
              />
              {subjectQuery.trim() && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-zinc-200 rounded shadow-lg max-h-48 overflow-y-auto">
                  {subjectLoading && (
                    <div className="px-3 py-2">
                      <Skeleton className="h-4 w-full" />
                    </div>
                  )}
                  {!subjectLoading && subjectResults.length === 0 && (
                    <div className="px-3 py-2 text-[12px] text-zinc-400">
                      {MSG.emptySubtitle}
                    </div>
                  )}
                  {!subjectLoading &&
                    subjectResults.map((s) => (
                      <div
                        key={s.id}
                        className="px-3 py-2 text-[13px] text-zinc-800 hover:bg-zinc-50 cursor-pointer"
                        onClick={() => {
                          setSelectedSubject(s);
                          setSubjectQuery('');
                          setSubjectResults([]);
                        }}
                      >
                        {s.full_name}{' '}
                        <span className="text-[11px] text-zinc-400">({s.code})</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Severity */}
        <div className="mb-3">
          <label className="block text-[12px] text-zinc-600 mb-1">{MSG.createSeverityLabel}</label>
          <select
            className="w-full h-9 px-3 text-[13px] border border-zinc-300 rounded bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-red-700"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as AlertLevel | '')}
          >
            <option value="">{MSG.filterAll}</option>
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-[12px] text-zinc-600 mb-1">{MSG.createDescLabel}</label>
          <textarea
            className="w-full border border-zinc-300 rounded px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-red-700 resize-none"
            rows={3}
            placeholder={MSG.createDescPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            {MSG.createCancel}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreate}
            disabled={!selectedSubject || !severity || submitting}
          >
            {submitting ? '...' : MSG.createConfirm}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Close Case Modal
// =============================================================================

function CloseCaseModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (note.trim().length < 10) {
      setError(MSG.closeNoteMin);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onConfirm(note.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-5">
        <h2 className="text-[14px] font-semibold text-zinc-900 mb-1">{MSG.closeTitle}</h2>
        <p className="text-[12px] text-zinc-500 mb-4">{MSG.closeDesc}</p>

        <label className="block text-[12px] text-zinc-600 mb-1">{MSG.closeNoteLabel}</label>
        <textarea
          className={`w-full border rounded px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 resize-none ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-zinc-300 focus:ring-red-700'
          }`}
          rows={4}
          placeholder={MSG.closeNotePlaceholder}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            if (error) setError('');
          }}
        />
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            {MSG.closeCancel}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '...' : MSG.closeConfirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
