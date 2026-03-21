import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Filter,
  MapPin,
  ScanFace,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';

import { fetchEventDetail, fetchEvents, exportEvents } from '@/api/events.api';
import PageHeader from '@/components/navigation/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/ui/DatePicker';
import Skeleton from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import EmptyState from '@/components/data-display/EmptyState';
import { getMessages } from '@/locales';

import type {
  EventDetail,
  EventListItem,
  EventListParams,
  EventListResponse,
  EventResult,
} from '@/types/event.types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

const RESULT_VARIANT: Record<EventResult, 'done' | 'urgent' | 'warning'> = {
  SUCCESS: 'done',
  FAILED: 'urgent',
  WARNING: 'warning',
};

const EVENT_TYPES = [
  'CHECK_IN',
  'FACE_MISMATCH',
  'NFC_FAIL',
  'CHECKIN_OVERDUE',
  'SEVERE_OVERDUE',
  'GEOFENCE_VIOLATION',
  'CURFEW_VIOLATION',
  'OTHER',
] as const;

const EVENT_RESULTS: EventResult[] = ['SUCCESS', 'FAILED', 'WARNING'];

const PAGE_SIZE = 20;

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function LabelValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start py-1.5">
      <span className="w-[140px] shrink-0 text-[12px] text-zinc-500">{label}</span>
      <span className="text-[13px] text-zinc-900">{value ?? '—'}</span>
    </div>
  );
}

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
    <div className="rounded border border-zinc-200 bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-2.5">
        {icon}
        <span className="text-[14px] font-semibold text-zinc-900">{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="h-10 border-b border-zinc-100">
          {Array.from({ length: 8 }).map((__, j) => (
            <td key={j} className="px-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function EventsPage() {
  const MSG = getMessages().events;
  const { showToast } = useToast();

  /* ----- state: list view ----- */
  const [items, setItems] = useState<EventListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [filterType, setFilterType] = useState<string>('');
  const [filterResult, setFilterResult] = useState<string>('');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');

  const [exporting, setExporting] = useState(false);

  /* ----- state: detail view ----- */
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  /* ----- derived ----- */
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hasFilters = filterType || filterResult || filterFrom || filterTo;

  /* ----- helpers ----- */
  const typeLabel = useCallback(
    (type: string): string => {
      const key = `type${type}` as keyof typeof MSG;
      return (MSG[key] as string) ?? type;
    },
    [MSG],
  );

  const resultLabel = useCallback(
    (result: EventResult): string => {
      const key = `result${result}` as keyof typeof MSG;
      return (MSG[key] as string) ?? result;
    },
    [MSG],
  );

  /* ----- fetch list ----- */
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params: EventListParams = {
        page,
        limit: PAGE_SIZE,
        sort: 'created_at',
        order: 'desc',
      };
      if (filterType) params.type = filterType;
      if (filterResult) params.result = filterResult as EventResult;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;

      const res = await fetchEvents(params);
      const raw = res.data as any;
      const body = (raw?.data ?? raw) as EventListResponse;

      setItems(body.data);
      setTotal(body.total);
    } catch {
      showToast(MSG.errSystem, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterResult, filterFrom, filterTo, showToast, MSG]);

  useEffect(() => {
    if (viewMode === 'list') {
      loadList();
    }
  }, [loadList, viewMode]);

  /* ----- fetch detail ----- */
  const openDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      setViewMode('detail');
      try {
        const res = await fetchEventDetail(id);
        const raw = res.data as any;
        const body = (raw?.data ?? raw) as EventDetail;
        setDetail(body);
      } catch {
        showToast(MSG.errSystem, 'error');
        setViewMode('list');
      } finally {
        setDetailLoading(false);
      }
    },
    [showToast, MSG],
  );

  const goBackToList = useCallback(() => {
    setDetail(null);
    setViewMode('list');
  }, []);

  /* ----- clear filters ----- */
  const clearFilters = useCallback(() => {
    setFilterType('');
    setFilterResult('');
    setFilterFrom('');
    setFilterTo('');
    setPage(1);
  }, []);

  /* ----- export ----- */
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const params: Partial<EventListParams> = { sort: 'created_at', order: 'desc' };
      if (filterType) params.type = filterType;
      if (filterResult) params.result = filterResult as EventResult;
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;

      const res = await exportEvents(params);
      const blob = new Blob([res.data as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `su-kien-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast(MSG.errSystem, 'error');
    } finally {
      setExporting(false);
    }
  }, [filterType, filterResult, filterFrom, filterTo, showToast, MSG]);

  /* ----- document title ----- */
  useEffect(() => {
    document.title = MSG.documentTitle;
  }, [MSG]);

  /* ----- pagination helpers ----- */
  const paginationPages = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  const fromItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toItem = Math.min(page * PAGE_SIZE, total);

  /* ================================================================ */
  /*  Detail View                                                     */
  /* ================================================================ */

  if (viewMode === 'detail') {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          breadcrumbs={[
            { label: MSG.breadcrumbDashboard, href: '/' },
            { label: MSG.breadcrumbEvents, href: '/events' },
            { label: MSG.breadcrumbDetail },
          ]}
          title={MSG.detailTitle}
        />

        <Button variant="outline" size="sm" onClick={goBackToList} className="self-start">
          <ChevronLeft className="mr-1 h-4 w-4" />
          {MSG.back}
        </Button>

        {detailLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded border border-zinc-200 bg-white p-4">
                <Skeleton className="mb-3 h-5 w-40" />
                {Array.from({ length: 5 }).map((__, j) => (
                  <Skeleton key={j} className="mb-2 h-4 w-full" />
                ))}
              </div>
            ))}
          </div>
        ) : detail ? (
          <div className="flex flex-col gap-4">
            {/* 2-column grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Left: General */}
              <Card
                title={MSG.sectionGeneral}
                icon={<Clock className="h-4 w-4 text-zinc-500" />}
              >
                <LabelValue label={MSG.lblCode} value={detail.code} />
                <LabelValue label={MSG.lblType} value={typeLabel(detail.type)} />
                <LabelValue
                  label={MSG.lblResult}
                  value={
                    <Badge variant={RESULT_VARIANT[detail.result]}>
                      {resultLabel(detail.result)}
                    </Badge>
                  }
                />
                <LabelValue
                  label={MSG.lblSubject}
                  value={
                    detail.subject
                      ? `${detail.subject.full_name} (${detail.subject.code})`
                      : '—'
                  }
                />
                <LabelValue label={MSG.lblTime} value={formatDateTime(detail.created_at)} />
                <LabelValue
                  label={MSG.lblClientTime}
                  value={
                    detail.client_timestamp ? formatDateTime(detail.client_timestamp) : '—'
                  }
                />
                <LabelValue
                  label={MSG.lblVoluntary}
                  value={detail.is_voluntary ? MSG.yes : MSG.no}
                />
              </Card>

              {/* Right top: Biometric */}
              <div className="flex flex-col gap-4">
                <Card
                  title={MSG.sectionBiometric}
                  icon={<ScanFace className="h-4 w-4 text-zinc-500" />}
                >
                  <LabelValue
                    label={MSG.lblFaceScore}
                    value={
                      detail.face_match_score != null
                        ? `${(detail.face_match_score * 100).toFixed(1)}%`
                        : '—'
                    }
                  />
                  <LabelValue
                    label={MSG.lblLiveness}
                    value={
                      detail.liveness_score != null
                        ? `${(detail.liveness_score * 100).toFixed(1)}%`
                        : '—'
                    }
                  />
                  <LabelValue
                    label={MSG.lblNfcVerified}
                    value={detail.nfc_verified ? MSG.yes : MSG.no}
                  />
                  <LabelValue
                    label={MSG.lblNfcCccdMatch}
                    value={detail.nfc_cccd_match ? MSG.yes : MSG.no}
                  />
                </Card>

                {/* Right bottom: Location */}
                <Card
                  title={MSG.sectionLocation}
                  icon={<MapPin className="h-4 w-4 text-zinc-500" />}
                >
                  <LabelValue
                    label={MSG.lblGpsLat}
                    value={detail.gps_lat != null ? String(detail.gps_lat) : '—'}
                  />
                  <LabelValue
                    label={MSG.lblGpsLng}
                    value={detail.gps_lng != null ? String(detail.gps_lng) : '—'}
                  />
                  <LabelValue
                    label={MSG.lblGpsAccuracy}
                    value={
                      detail.gps_accuracy != null ? `${detail.gps_accuracy} m` : '—'
                    }
                  />
                  <LabelValue
                    label={MSG.lblInGeofence}
                    value={detail.in_geofence ? MSG.yes : MSG.no}
                  />
                  <LabelValue
                    label={MSG.lblGeofenceDistance}
                    value={
                      detail.geofence_distance != null
                        ? `${detail.geofence_distance} m`
                        : '—'
                    }
                  />
                </Card>
              </div>
            </div>

            {/* Device section */}
            <Card
              title={MSG.sectionDevice}
              icon={<Smartphone className="h-4 w-4 text-zinc-500" />}
            >
              <LabelValue label={MSG.lblDeviceId} value={detail.device_id ?? '—'} />
              <LabelValue
                label={MSG.lblDeviceInfo}
                value={
                  detail.device_info ? (
                    <pre className="max-w-full overflow-x-auto whitespace-pre-wrap text-[12px] text-zinc-700">
                      {typeof detail.device_info === 'string'
                        ? detail.device_info
                        : JSON.stringify(detail.device_info, null, 2)}
                    </pre>
                  ) : (
                    '—'
                  )
                }
              />
            </Card>
          </div>
        ) : null}
      </div>
    );
  }

  /* ================================================================ */
  /*  List View                                                       */
  /* ================================================================ */

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[
          { label: MSG.breadcrumbDashboard, href: '/' },
          { label: MSG.breadcrumbEvents },
        ]}
        title={MSG.pageTitle}
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

      {/* ----- Filter bar ----- */}
      <div className="flex flex-wrap items-center gap-3 rounded border border-zinc-200 bg-white px-4 py-3">
        <Filter className="h-4 w-4 text-zinc-400" />

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(1);
          }}
          className="h-8 rounded border border-zinc-300 bg-white px-2 text-[13px] text-zinc-700 outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
        >
          <option value="">{MSG.filterType}: {MSG.filterAll}</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {typeLabel(t)}
            </option>
          ))}
        </select>

        {/* Result filter */}
        <select
          value={filterResult}
          onChange={(e) => {
            setFilterResult(e.target.value);
            setPage(1);
          }}
          className="h-8 rounded border border-zinc-300 bg-white px-2 text-[13px] text-zinc-700 outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"
        >
          <option value="">{MSG.filterResult}: {MSG.filterAll}</option>
          {EVENT_RESULTS.map((r) => (
            <option key={r} value={r}>
              {resultLabel(r)}
            </option>
          ))}
        </select>

        {/* Date from */}
        <DatePicker
          value={filterFrom}
          onChange={(v: string) => {
            setFilterFrom(v);
            setPage(1);
          }}
          placeholder={MSG.filterFrom}
          className="h-8 w-[140px] text-[13px]"
        />

        {/* Date to */}
        <DatePicker
          value={filterTo}
          onChange={(v: string) => {
            setFilterTo(v);
            setPage(1);
          }}
          placeholder={MSG.filterTo}
          className="h-8 w-[140px] text-[13px]"
        />

        {/* Clear */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3.5 w-3.5" />
            {MSG.filterClear}
          </Button>
        )}
      </div>

      {/* ----- Data table ----- */}
      <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
        <table className="w-full min-w-[900px] table-auto">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-zinc-600">
                {MSG.colTime}
              </th>
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-zinc-600">
                {MSG.colCode}
              </th>
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-zinc-600">
                {MSG.colSubject}
              </th>
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-zinc-600">
                {MSG.colType}
              </th>
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-zinc-600">
                {MSG.colResult}
              </th>
              <th className="px-3 py-2 text-center text-[12px] font-semibold text-zinc-600">
                {MSG.colGps}
              </th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-zinc-600">
                {MSG.colFace}
              </th>
              <th className="px-3 py-2 text-center text-[12px] font-semibold text-zinc-600">
                {MSG.colNfc}
              </th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12">
                  <EmptyState icon={<Clock size={48} />} title={MSG.emptyTitle} subtitle={MSG.emptySubtitle} />
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => openDetail(item.id)}
                  className="h-10 cursor-pointer border-b border-zinc-100 hover:bg-zinc-50"
                >
                  <td className="whitespace-nowrap px-3 text-[12px] text-zinc-600">
                    {formatDateTime(item.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-3 text-[12px] font-medium text-zinc-900">
                    {item.code}
                  </td>
                  <td className="max-w-[200px] truncate px-3 text-[12px] text-zinc-700">
                    {item.subject?.full_name ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 text-[12px] text-zinc-700">
                    {typeLabel(item.type)}
                  </td>
                  <td className="px-3">
                    <Badge variant={RESULT_VARIANT[item.result]}>
                      {resultLabel(item.result)}
                    </Badge>
                  </td>
                  <td className="px-3 text-center">
                    {item.in_geofence ? (
                      <ShieldCheck className="mx-auto h-4 w-4 text-emerald-600" />
                    ) : (
                      <ShieldCheck className="mx-auto h-4 w-4 text-zinc-300" />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 text-right text-[12px] text-zinc-700">
                    {item.face_match_score != null
                      ? `${(item.face_match_score * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                  <td className="px-3 text-center">
                    {item.nfc_verified ? (
                      <ShieldCheck className="mx-auto h-4 w-4 text-emerald-600" />
                    ) : (
                      <ShieldCheck className="mx-auto h-4 w-4 text-zinc-300" />
                    )}
                  </td>
                  <td className="px-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(item.id);
                      }}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-700"
                      title={MSG.viewDetail}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ----- Pagination ----- */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-zinc-500">
            {MSG.paginationInfo(fromItem, toItem, total)}
          </span>

          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex h-8 w-8 items-center justify-center rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {paginationPages.map((p, idx) =>
              p === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-[12px] text-zinc-400">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded border text-[12px] ${
                    p === page
                      ? 'border-red-700 bg-red-700 text-white'
                      : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {p}
                </button>
              ),
            )}

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-8 w-8 items-center justify-center rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
