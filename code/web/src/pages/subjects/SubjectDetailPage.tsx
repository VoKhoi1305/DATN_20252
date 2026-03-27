import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Pencil,
  FileText,
  Smartphone,
  Clock,
  FolderOpen,
  UserCheck,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Upload,
  Trash2,
} from 'lucide-react';

import PageHeader from '@/components/navigation/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/data-display/EmptyState';
import { useToast } from '@/components/ui/Toast';

import {
  fetchSubjectDetail,
  fetchSubjectTimeline,
  fetchSubjectDevices,
  fetchSubjectDocuments,
  uploadSubjectDocument,
  deleteSubjectDocument,
  deleteSubject,
  assignScenario,
  unassignScenario,
  fetchScenarioOptions,
} from '@/api/subjects.api';
import { getUser } from '@/stores/auth.store';
import { getMessages } from '@/locales';

import type {
  SubjectDetail,
  TimelineEntry,
  TimelineResponse,
  DeviceInfo,
  DevicesResponse,
  DocumentInfo,
  DocumentsResponse,
  ScenarioOption,
} from '@/types/subject.types';

const MSG = getMessages().subjects;

// --- Status badge mapping ---
const STATUS_BADGE: Record<string, { variant: 'pending' | 'info' | 'processing' | 'warning' | 'done'; label: string }> = {
  INIT: { variant: 'pending', label: MSG.statusInit },
  ENROLLED: { variant: 'info', label: MSG.statusEnrolled },
  ACTIVE: { variant: 'processing', label: MSG.statusActive },
  REINTEGRATE: { variant: 'warning', label: MSG.statusReintegrate },
  ENDED: { variant: 'done', label: MSG.statusEnded },
};

const CAN_EDIT_ROLES = ['IT_ADMIN', 'LANH_DAO', 'CAN_BO_QUAN_LY', 'CAN_BO_CO_SO'];
const CAN_DELETE_ROLES = ['IT_ADMIN', 'LANH_DAO'];
const VIEWER_ROLE = 'VIEWER';

const TAB_KEYS = ['info', 'scenario', 'timeline', 'documents', 'devices', 'enrollment'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABELS: Record<TabKey, string> = {
  info: MSG.tabInfo,
  scenario: MSG.tabScenario,
  timeline: MSG.tabTimeline,
  documents: MSG.tabDocuments,
  devices: MSG.tabDevices,
  enrollment: MSG.tabEnrollment,
};

// --- Helpers ---

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Skeleton for detail page ---
function DetailSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="mb-4">
        <Skeleton className="h-3 w-[200px] mb-2" />
        <Skeleton className="h-5 w-[160px] mb-1" />
        <Skeleton className="h-3 w-[240px]" />
      </div>
      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-zinc-200 pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-[70px]" />
        ))}
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-zinc-200 rounded p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-3 w-[80px]" />
              <Skeleton className="h-3 w-[140px]" />
            </div>
          ))}
        </div>
        <div className="bg-white border border-zinc-200 rounded p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-3 w-[80px]" />
              <Skeleton className="h-3 w-[140px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Label-Value Row ---
function LabelValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="text-[12px] text-zinc-500 w-[120px] shrink-0">{label}</span>
      <span className="text-[13px] text-zinc-900 min-w-0 break-words">{children || <span className="text-zinc-400">&mdash;</span>}</span>
    </div>
  );
}

// --- Card Wrapper ---
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-zinc-200 rounded">
      <div className="px-4 py-2.5 border-b border-zinc-100">
        <h3 className="text-[13px] font-semibold text-zinc-900">{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

// ============================
// Tab Components
// ============================

// --- Tab: Thong tin ---
function TabInfo({ detail }: { detail: SubjectDetail }) {
  const badge = STATUS_BADGE[detail.status] ?? { variant: 'neutral' as const, label: detail.status };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Nhan than */}
      <Card title={MSG.lblFullName}>
        <LabelValue label={MSG.lblFullName}>{detail.full_name}</LabelValue>
        <LabelValue label={MSG.lblCccd}>
          <span className="font-mono tracking-wide">{detail.cccd}</span>
        </LabelValue>
        <LabelValue label={MSG.lblDob}>{formatDate(detail.date_of_birth)}</LabelValue>
        <LabelValue label={MSG.lblGender}>
          {detail.gender === 'MALE' ? MSG.genderMale : detail.gender === 'FEMALE' ? MSG.genderFemale : detail.gender}
        </LabelValue>
        <LabelValue label={MSG.lblPhone}>
          {detail.phone ? <span className="font-mono">{detail.phone}</span> : null}
        </LabelValue>
        <LabelValue label={MSG.lblAddress}>{detail.address}</LabelValue>
        <LabelValue label={MSG.lblArea}>{detail.area?.name}</LabelValue>
        <LabelValue label={MSG.lblOfficer}>{detail.officer?.full_name}</LabelValue>
        <LabelValue label={MSG.lblStatus}>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </LabelValue>
      </Card>

      <div className="space-y-4">
        {/* Gia dinh */}
        <Card title={MSG.cardFamily}>
          <LabelValue label={MSG.lblFather}>{detail.family?.father_name}</LabelValue>
          <LabelValue label={MSG.lblMother}>{detail.family?.mother_name}</LabelValue>
          <LabelValue label={MSG.lblSpouse}>{detail.family?.spouse_name}</LabelValue>
          <LabelValue label={MSG.lblFamilyNotes}>{detail.family?.notes}</LabelValue>
        </Card>

        {/* Phap ly */}
        <Card title={MSG.cardLegal}>
          <LabelValue label={MSG.lblDecisionNo}>
            {detail.legal?.decision_number ? (
              <span className="font-mono">{detail.legal.decision_number}</span>
            ) : null}
          </LabelValue>
          <LabelValue label={MSG.lblDecisionDate}>
            {detail.legal?.decision_date ? formatDate(detail.legal.decision_date) : null}
          </LabelValue>
          <LabelValue label={MSG.lblLegalDuration}>{detail.legal?.management_type}</LabelValue>
          <LabelValue label={MSG.lblLegalStartDate}>
            {detail.legal?.start_date ? formatDate(detail.legal.start_date) : null}
          </LabelValue>
          <LabelValue label={MSG.lblLegalEndDate}>
            {detail.legal?.end_date ? formatDate(detail.legal.end_date) : null}
          </LabelValue>
          <LabelValue label={MSG.lblAuthority}>{detail.legal?.issuing_authority}</LabelValue>
          <LabelValue label={MSG.lblLegalNotes}>{detail.legal?.notes}</LabelValue>
        </Card>
      </div>
    </div>
  );
}

// --- Tab: Kich ban ---
function TabScenario({ detail, onRefresh }: { detail: SubjectDetail; onRefresh: () => void }) {
  const { showToast } = useToast();
  const [scenarios, setScenarios] = useState<ScenarioOption[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);

  useEffect(() => {
    fetchScenarioOptions()
      .then((res) => {
        const d = res.data as any;
        const list = d?.data?.data ?? d?.data ?? [];
        setScenarios(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  const handleAssign = async () => {
    if (!selectedScenarioId) return;
    setAssigning(true);
    try {
      await assignScenario(detail.id, selectedScenarioId);
      showToast('Gán kịch bản thành công', 'success');
      setShowAssignForm(false);
      setSelectedScenarioId('');
      onRefresh();
    } catch {
      showToast('Có lỗi khi gán kịch bản', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async () => {
    setUnassigning(true);
    try {
      await unassignScenario(detail.id);
      showToast('Huỷ gán kịch bản thành công', 'success');
      onRefresh();
    } catch {
      showToast('Có lỗi khi huỷ gán kịch bản', 'error');
    } finally {
      setUnassigning(false);
    }
  };

  return (
    <div className="space-y-4">
      {detail.scenario ? (
        <Card title={MSG.cardScenarioActive}>
          <LabelValue label={MSG.lblScenarioName}>{detail.scenario.name}</LabelValue>
          <LabelValue label={MSG.lblAssignedAt}>{formatDate(detail.scenario.assigned_at)}</LabelValue>
          <LabelValue label={MSG.lblCheckinFreq}>{detail.scenario.checkin_frequency}</LabelValue>
          <div className="mt-3 pt-3 border-t border-zinc-100 flex gap-2">
            <button
              onClick={() => setShowAssignForm(true)}
              className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 rounded hover:bg-zinc-200 transition-colors"
            >
              Đổi kịch bản
            </button>
            <button
              onClick={handleUnassign}
              disabled={unassigning}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {unassigning ? '...' : 'Huỷ gán'}
            </button>
          </div>
        </Card>
      ) : (
        <div className="text-center py-10">
          <FileText size={48} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-500">{MSG.noScenarioTitle}</p>
          <p className="text-xs text-zinc-400 mt-1 mb-4">{MSG.noScenarioSub}</p>
          <button
            onClick={() => setShowAssignForm(true)}
            className="px-4 py-2 bg-red-700 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Gán kịch bản
          </button>
        </div>
      )}

      {showAssignForm && (
        <Card title="Gán kịch bản quản lý">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Chọn kịch bản</label>
              <select
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="">-- Chọn kịch bản --</option>
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAssign}
                disabled={!selectedScenarioId || assigning}
                className="px-4 py-2 bg-red-700 text-white rounded-md text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {assigning ? '...' : 'Xác nhận gán'}
              </button>
              <button
                onClick={() => { setShowAssignForm(false); setSelectedScenarioId(''); }}
                className="px-4 py-2 border border-zinc-300 text-zinc-600 rounded-md text-sm hover:bg-zinc-50 transition-colors"
              >
                Huỷ
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// --- Tab: Timeline ---
function TabTimeline({ subjectId }: { subjectId: string }) {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const loadTimeline = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetchSubjectTimeline(subjectId, { page: p, limit });
      const raw = res.data as any;
      const body = (raw?.data ?? raw) as TimelineResponse;
      setEntries(body.data ?? []);
      setTotal(body.total ?? 0);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) return;
      showToast(MSG.errSystem, 'error');
    } finally {
      setLoading(false);
    }
  }, [subjectId, showToast]);

  useEffect(() => {
    loadTimeline(page);
  }, [page, loadTimeline]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 h-10">
            <Skeleton className="h-3 w-[80px]" />
            <Skeleton className="h-3 w-[60px]" />
            <Skeleton className="h-3 w-[100px]" />
            <Skeleton className="h-3 w-[200px]" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Clock size={48} />}
        title={MSG.noTimelineTitle}
        subtitle={MSG.noTimelineSub}
      />
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded overflow-hidden">
      {/* Visual timeline */}
      <div className="px-4 py-3">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-0 bottom-0 w-px bg-zinc-200" />
          <div className="space-y-0">
            {entries.map((entry) => (
              <div key={entry.id} className="relative flex items-start gap-3 py-2.5 group">
                {/* Dot */}
                <div className={`relative z-10 mt-0.5 h-[15px] w-[15px] rounded-full border-2 shrink-0 ${
                  entry.source === 'ALERT'
                    ? 'border-red-500 bg-red-50'
                    : 'border-blue-500 bg-blue-50'
                }`} />
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={entry.source === 'ALERT' ? 'urgent' : 'info'}>
                      {entry.source}
                    </Badge>
                    <span className="text-[13px] font-medium text-zinc-900">{entry.type}</span>
                    <span className="text-[11px] text-zinc-400 tabular-nums ml-auto">{formatDate(entry.created_at)}</span>
                  </div>
                  {entry.detail && (
                    <p className="text-[12px] text-zinc-600 mt-0.5">{entry.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-200">
          <p className="text-[12px] text-zinc-500">
            {MSG.paginationInfo((page - 1) * limit + 1, Math.min(page * limit, total), total)}
          </p>
          <nav aria-label="Phân trang timeline" className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-[28px] w-[28px] flex items-center justify-center rounded text-zinc-600 hover:bg-zinc-100 disabled:text-zinc-300 disabled:cursor-not-allowed"
              aria-label="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 7) return true;
                if (p === 1 || p === totalPages) return true;
                if (Math.abs(p - page) <= 1) return true;
                return false;
              })
              .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push('ellipsis');
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="px-1 text-zinc-400 text-[12px]">&hellip;</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    aria-current={page === item ? 'page' : undefined}
                    className={`h-[28px] min-w-[28px] px-1.5 flex items-center justify-center rounded text-[12px] font-medium ${
                      page === item ? 'bg-red-700 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-[28px] w-[28px] flex items-center justify-center rounded text-zinc-600 hover:bg-zinc-100 disabled:text-zinc-300 disabled:cursor-not-allowed"
              aria-label="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

// --- Tab: Tai lieu ---
function TabDocuments({ subjectId }: { subjectId: string }) {
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(() => {
    setLoading(true);
    fetchSubjectDocuments(subjectId)
      .then((res) => {
        const raw = res.data as any;
        const body = (raw?.data ?? raw) as DocumentsResponse;
        setDocuments(body.data ?? []);
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) return;
        showToast(MSG.errSystem, 'error');
      })
      .finally(() => setLoading(false));
  }, [subjectId, showToast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadSubjectDocument(subjectId, file, 'OTHER');
      showToast('Tải file lên thành công', 'success');
      loadDocuments();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message ?? 'Không thể tải file lên';
      showToast(msg, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Xoá tài liệu "${docName}"?`)) return;
    try {
      await deleteSubjectDocument(subjectId, docId);
      showToast('Đã xoá tài liệu', 'success');
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      showToast('Không thể xoá tài liệu', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 h-10">
            <Skeleton className="h-3 w-[30px]" />
            <Skeleton className="h-3 w-[180px]" />
            <Skeleton className="h-3 w-[60px]" />
            <Skeleton className="h-3 w-[80px]" />
            <Skeleton className="h-3 w-[50px]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Upload button */}
      <div className="flex justify-end">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-700 text-white rounded-md text-[12px] font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          <Upload size={13} />
          {uploading ? 'Đang tải...' : 'Tải tài liệu lên'}
        </button>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={48} />}
          title={MSG.noDocsTitle}
          subtitle={MSG.noDocsSub}
        />
      ) : (
        <div className="bg-white border border-zinc-200 rounded overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-100">
            <h3 className="text-[13px] font-semibold text-zinc-900">{MSG.cardDocuments}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]" role="table">
              <caption className="sr-only">{MSG.cardDocuments}</caption>
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] text-zinc-500 uppercase tracking-wider">
                  <th className="px-3 py-2 font-medium w-[50px]">#</th>
                  <th className="px-3 py-2 font-medium">Tên file</th>
                  <th className="px-3 py-2 font-medium w-[80px]">Loại</th>
                  <th className="px-3 py-2 font-medium w-[80px]">Kích thước</th>
                  <th className="px-3 py-2 font-medium w-[110px]">Ngày tạo</th>
                  <th className="px-3 py-2 font-medium w-[120px] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {documents.map((doc, index) => (
                  <tr key={doc.id} className="h-10 hover:bg-zinc-50 transition-colors">
                    <td className="px-3 text-[12px] text-zinc-500">{index + 1}</td>
                    <td className="px-3 text-[13px] text-zinc-900 truncate max-w-[300px]" title={doc.original_name}>
                      {doc.original_name}
                    </td>
                    <td className="px-3">
                      <span className="text-[11px] font-medium text-zinc-600 uppercase">
                        {doc.file_type}
                      </span>
                    </td>
                    <td className="px-3 text-[12px] text-zinc-500 tabular-nums">
                      {formatFileSize(doc.size)}
                    </td>
                    <td className="px-3 text-[12px] text-zinc-500 tabular-nums">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-3 text-right space-x-2">
                      <a
                        href={doc.stored_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] text-red-700 hover:text-red-800 hover:underline"
                      >
                        <Download size={12} />
                        Tải
                      </a>
                      <button
                        onClick={() => handleDelete(doc.id, doc.original_name)}
                        className="inline-flex items-center gap-1 text-[12px] text-zinc-500 hover:text-red-700"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Tab: Thiet bi ---
function TabDevices({ subjectId }: { subjectId: string }) {
  const { showToast } = useToast();
  const [current, setCurrent] = useState<DeviceInfo | null>(null);
  const [history, setHistory] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSubjectDevices(subjectId)
      .then((res) => {
        if (cancelled) return;
        const raw = res.data as any;
        const body = (raw?.data ?? raw) as DevicesResponse;
        setCurrent(body.current ?? null);
        setHistory(body.history ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) return;
        showToast(MSG.errSystem, 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [subjectId, showToast]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-3 w-[80px]" />
            <Skeleton className="h-3 w-[140px]" />
          </div>
        ))}
      </div>
    );
  }

  if (!current && history.length === 0) {
    return (
      <EmptyState
        icon={<Smartphone size={48} />}
        title={MSG.noDeviceTitle}
        subtitle={MSG.noDeviceSub}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Current device */}
      {current && (
        <Card title={MSG.cardDeviceCurrent}>
          <LabelValue label={MSG.lblDeviceId}>
            <span className="font-mono tracking-wide">{current.device_id}</span>
          </LabelValue>
          <LabelValue label={MSG.lblModel}>{current.device_model}</LabelValue>
          <LabelValue label={MSG.lblOs}>{current.os_version}</LabelValue>
          <LabelValue label={MSG.lblBindDate}>{formatDate(current.enrolled_at)}</LabelValue>
          <LabelValue label={MSG.lblStatus}>
            <Badge variant={current.status === 'ACTIVE' ? 'processing' : 'pending'}>
              {current.status}
            </Badge>
          </LabelValue>
        </Card>
      )}

      {/* Device history */}
      {history.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-100">
            <h3 className="text-[13px] font-semibold text-zinc-900">{MSG.cardDeviceHistory}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]" role="table">
              <caption className="sr-only">{MSG.cardDeviceHistory}</caption>
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] text-zinc-500 uppercase tracking-wider">
                  <th className="px-3 py-2 font-medium">Device ID</th>
                  <th className="px-3 py-2 font-medium">Model</th>
                  <th className="px-3 py-2 font-medium w-[110px]">Ngày gắn</th>
                  <th className="px-3 py-2 font-medium w-[110px]">Ngày thay</th>
                  <th className="px-3 py-2 font-medium w-[90px]">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {history.map((device) => (
                  <tr key={device.id} className="h-10 hover:bg-zinc-50 transition-colors">
                    <td className="px-3 font-mono text-[12px] text-zinc-600 tracking-wide">
                      {device.device_id}
                    </td>
                    <td className="px-3 text-[13px] text-zinc-900">{device.device_model ?? '—'}</td>
                    <td className="px-3 text-[12px] text-zinc-500 tabular-nums">
                      {formatDate(device.enrolled_at)}
                    </td>
                    <td className="px-3 text-[12px] text-zinc-500 tabular-nums">
                      {device.replaced_at ? formatDate(device.replaced_at) : '—'}
                    </td>
                    <td className="px-3">
                      <Badge variant={device.status === 'ACTIVE' ? 'processing' : 'pending'}>
                        {device.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Tab: Enrollment ---
function TabEnrollment({ detail }: { detail: SubjectDetail }) {
  if (detail.status === 'INIT') {
    return (
      <EmptyState
        icon={<UserCheck size={48} />}
        title={MSG.noEnrollTitle}
        subtitle={MSG.noEnrollSub}
      />
    );
  }

  return (
    <Card title={MSG.cardEnrollment}>
      <LabelValue label={MSG.lblStatus}>
        <Badge variant={STATUS_BADGE[detail.status]?.variant ?? 'neutral'}>
          {STATUS_BADGE[detail.status]?.label ?? detail.status}
        </Badge>
      </LabelValue>
      {detail.enrollment_date && (
        <LabelValue label={MSG.lblBindDate}>{formatDate(detail.enrollment_date)}</LabelValue>
      )}
      {detail.compliance_rate !== null && detail.compliance_rate !== undefined && (
        <LabelValue label="Tỉ lệ tuân thủ">{`${detail.compliance_rate}%`}</LabelValue>
      )}
      {detail.notes && (
        <LabelValue label={MSG.lblLegalNotes}>{detail.notes}</LabelValue>
      )}
    </Card>
  );
}

// ============================
// Main Page Component
// ============================

function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const user = getUser();
  const userRole = user?.role ?? VIEWER_ROLE;

  // --- Active tab from URL ---
  const rawTab = searchParams.get('tab') ?? 'info';
  const activeTab: TabKey = TAB_KEYS.includes(rawTab as TabKey) ? (rawTab as TabKey) : 'info';

  const setActiveTab = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams);
    if (tab === 'info') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    setSearchParams(params, { replace: true });
  };

  // --- State ---
  const [detail, setDetail] = useState<SubjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Fetch detail ---
  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSubjectDetail(id);
      const raw = res.data as any;
      setDetail((raw?.data ?? raw) as SubjectDetail);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) return;
      if (status === 403) {
        setError(MSG.errForbidden);
      } else if (status === 404) {
        setError('Không tìm thấy hồ sơ.');
      } else {
        setError(MSG.errSystem);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // --- Set document title ---
  useEffect(() => {
    document.title = detail
      ? `${detail.ma_ho_so} — ${MSG.detailTitle} — SMTTS`
      : MSG.detailDocTitle;
  }, [detail]);

  // --- Delete handler ---
  const handleDelete = useCallback(async () => {
    if (!id || !detail) return;
    setIsDeleting(true);
    try {
      await deleteSubject(id);
      setDeleteDialogOpen(false);
      navigate('/ho-so', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Không thể xóa hồ sơ. Vui lòng thử lại.';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [id, detail, navigate]);

  // --- Permission checks ---
  const canEdit = CAN_EDIT_ROLES.includes(userRole) && detail?.status !== 'ENDED';
  const canDelete = CAN_DELETE_ROLES.includes(userRole);

  // --- Loading state ---
  if (loading) {
    return <DetailSkeleton />;
  }

  // --- Error state ---
  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center py-16" role="status">
        <p className="text-[13px] text-zinc-500 mb-3">{error ?? MSG.errSystem}</p>
        <Button variant="outline" size="sm" onClick={loadDetail} leftIcon={<RefreshCw size={12} />}>
          {MSG.retry}
        </Button>
      </div>
    );
  }

  const badge = STATUS_BADGE[detail.status] ?? { variant: 'neutral' as const, label: detail.status };

  // --- Render tab content ---
  function renderTab() {
    if (!detail || !id) return null;
    switch (activeTab) {
      case 'info':
        return <TabInfo detail={detail} />;
      case 'scenario':
        return <TabScenario detail={detail} onRefresh={loadDetail} />;
      case 'timeline':
        return <TabTimeline subjectId={id} />;
      case 'documents':
        return <TabDocuments subjectId={id} />;
      case 'devices':
        return <TabDevices subjectId={id} />;
      case 'enrollment':
        return <TabEnrollment detail={detail} />;
      default:
        return <TabInfo detail={detail} />;
    }
  }

  return (
    <>
      {/* Delete confirmation dialog */}
      {deleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => !isDeleting && setDeleteDialogOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <h3 className="text-[15px] font-semibold text-zinc-900">Xóa hồ sơ</h3>
            </div>
            <p className="text-[13px] text-zinc-600 mb-1">
              Bạn có chắc muốn xóa hồ sơ{' '}
              <strong className="text-zinc-900">{detail.full_name}</strong>?
            </p>
            <p className="text-[12px] text-zinc-400 mb-5">
              Hồ sơ sẽ bị ẩn khỏi hệ thống. Số CCCD này có thể được đăng ký lại sau khi xóa.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Hủy
              </Button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded text-[13px] font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 size={13} />
                {isDeleting ? 'Đang xóa…' : 'Xóa hồ sơ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: MSG.breadcrumbDashboard, href: '/dashboard' },
          { label: MSG.breadcrumbProfiles, href: '/ho-so' },
          { label: detail.ma_ho_so },
        ]}
        title={detail.ma_ho_so}
        subtitle={detail.full_name}
        actions={
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Pencil size={14} />}
                onClick={() => navigate(`/ho-so/${id}/chinh-sua`)}
              >
                {MSG.editBtn}
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Trash2 size={14} />}
                onClick={() => setDeleteDialogOpen(true)}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                Xóa hồ sơ
              </Button>
            )}
          </div>
        }
      />

      {/* Title font-mono + badge alongside subtitle */}
      <div className="flex items-center gap-2 -mt-3 mb-4">
        <span className="font-mono text-lg font-semibold text-zinc-900 sr-only">{detail.ma_ho_so}</span>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 mb-4">
        <nav className="flex gap-0 -mb-px" aria-label="Tabs chi tiết hồ sơ">
          {TAB_KEYS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-red-700 text-red-700'
                    : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300'
                }`}
                aria-selected={isActive}
                role="tab"
              >
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div role="tabpanel">{renderTab()}</div>
    </>
  );
}

export default SubjectDetailPage;
