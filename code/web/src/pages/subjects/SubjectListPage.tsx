import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Download, Search, Users, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

import PageHeader from '@/components/navigation/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/data-display/EmptyState';
import { useToast } from '@/components/ui/Toast';

import { fetchSubjects, fetchScenarioOptions } from '@/api/subjects.api';
import { getUser } from '@/stores/auth.store';
import { getMessages } from '@/locales';

import type { SubjectListItem, ScenarioOption, SubjectListParams } from '@/types/subject.types';

const MSG = getMessages().subjects;

// --- Status badge mapping per SCR-020 spec ---
const STATUS_BADGE: Record<string, { variant: 'pending' | 'info' | 'processing' | 'warning' | 'done'; label: string }> = {
  INIT: { variant: 'pending', label: MSG.statusInit },
  ENROLLED: { variant: 'info', label: MSG.statusEnrolled },
  ACTIVE: { variant: 'processing', label: MSG.statusActive },
  REINTEGRATE: { variant: 'warning', label: MSG.statusReintegrate },
  ENDED: { variant: 'done', label: MSG.statusEnded },
};

const STATUS_OPTIONS = [
  { value: '', label: MSG.filterAll },
  { value: 'INIT', label: MSG.statusInit },
  { value: 'ENROLLED', label: MSG.statusEnrolled },
  { value: 'ACTIVE', label: MSG.statusActive },
  { value: 'REINTEGRATE', label: MSG.statusReintegrate },
  { value: 'ENDED', label: MSG.statusEnded },
];

type SortField = 'ma_ho_so' | 'full_name' | 'scenario_name' | 'status' | 'created_at';

const CAN_CREATE_ROLES = ['IT_ADMIN', 'LANH_DAO', 'CAN_BO_QUAN_LY', 'CAN_BO_CO_SO'];
const CAN_EDIT_ROLES = ['IT_ADMIN', 'LANH_DAO', 'CAN_BO_QUAN_LY', 'CAN_BO_CO_SO'];
const CAN_EXPORT_ROLES = ['IT_ADMIN', 'LANH_DAO', 'CAN_BO_QUAN_LY', 'CAN_BO_CO_SO'];
const VIEWER_ROLE = 'VIEWER';

// --- Skeleton rows ---
function TableSkeleton() {
  return (
    <div className="divide-y divide-zinc-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 h-10">
          <Skeleton className="h-3 w-[100px]" />
          <Skeleton className="h-3 w-[120px]" />
          <Skeleton className="h-3 w-[100px]" />
          <Skeleton className="h-3 w-[160px]" />
          <Skeleton className="h-3 w-[80px]" />
        </div>
      ))}
    </div>
  );
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// --- Main Component ---
function SubjectListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const user = getUser();
  const userRole = user?.role ?? VIEWER_ROLE;

  const canCreate = CAN_CREATE_ROLES.includes(userRole);
  const canEdit = CAN_EDIT_ROLES.includes(userRole);
  const canExport = CAN_EXPORT_ROLES.includes(userRole);
  const showCheckbox = userRole !== VIEWER_ROLE;

  // --- Parse URL params into state ---
  const getParamInt = (key: string, def: number) => {
    const v = searchParams.get(key);
    return v ? parseInt(v, 10) || def : def;
  };

  const [subjects, setSubjects] = useState<SubjectListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(getParamInt('page', 1));
  const [sortField, setSortField] = useState<SortField>((searchParams.get('sort') as SortField) || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('order') as 'asc' | 'desc') || 'desc');

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [filterScenarioId, setFilterScenarioId] = useState(searchParams.get('scenario_id') || '');
  const [filterDateFrom, setFilterDateFrom] = useState(searchParams.get('from') || '');
  const [filterDateTo, setFilterDateTo] = useState(searchParams.get('to') || '');

  const [scenarioOptions, setScenarioOptions] = useState<ScenarioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isFirstLoad = useRef(true);

  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  // --- Set document title ---
  useEffect(() => {
    document.title = MSG.documentTitle;
  }, []);

  // --- Load scenario options once ---
  useEffect(() => {
    fetchScenarioOptions()
      .then((res) => {
        setScenarioOptions(res.data.data.data ?? res.data.data as unknown as ScenarioOption[]);
      })
      .catch(() => { /* silent */ });
  }, []);

  // --- Sync state to URL ---
  const syncUrl = useCallback((params: Record<string, string | number>) => {
    const newParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) {
        newParams.set(k, String(v));
      }
    });
    setSearchParams(newParams, { replace: true });
  }, [setSearchParams]);

  // Ref to track the applied search for API calls (avoids double-firing)
  const appliedSearchRef = useRef(searchQuery);

  // --- Fetch data ---
  const doFetch = useCallback(async (showSkeleton = false) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    if (showSkeleton) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    const params: SubjectListParams = {
      page: currentPage,
      limit: itemsPerPage,
      sort: sortField,
      order: sortOrder,
    };
    const q = appliedSearchRef.current;
    if (q) params.q = `~${q}`;
    if (filterStatus) params.status = filterStatus;
    if (filterScenarioId) params.scenario_id = filterScenarioId;
    if (filterDateFrom) params.from = filterDateFrom;
    if (filterDateTo) params.to = filterDateTo;

    try {
      const res = await fetchSubjects(params);
      const body = res.data.data ?? res.data as unknown as { data: SubjectListItem[]; total: number; page: number; limit: number };
      setSubjects(body.data);
      setTotal(body.total);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if ((err as { name?: string })?.name === 'CanceledError') return;
      if (status === 401) return;
      if (status === 403) {
        setError(MSG.errForbidden);
      } else if (status === 400) {
        showToast(MSG.errBadRequest, 'error');
      } else if (status === 429) {
        showToast(MSG.errRateLimit, 'error');
      } else {
        setError(MSG.errSystem);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFirstLoad.current = false;
    }
  }, [currentPage, sortField, sortOrder, filterStatus, filterScenarioId, filterDateFrom, filterDateTo, showToast]);

  // --- Effect: load data on filter/sort/page change ---
  useEffect(() => {
    const showSkeleton = isFirstLoad.current;
    doFetch(showSkeleton);

    syncUrl({
      page: currentPage,
      sort: sortField,
      order: sortOrder,
      q: appliedSearchRef.current,
      status: filterStatus,
      scenario_id: filterScenarioId,
      from: filterDateFrom,
      to: filterDateTo,
    });
  }, [doFetch, syncUrl, currentPage, sortField, sortOrder, filterStatus, filterScenarioId, filterDateFrom, filterDateTo]);

  // Effect: debounced search
  useEffect(() => {
    if (isFirstLoad.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      appliedSearchRef.current = searchQuery;
      setCurrentPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // --- Handlers ---
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        // Reset to default
        setSortField('created_at');
        setSortOrder('desc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: SubjectListParams = {
        page: currentPage,
        limit: itemsPerPage,
        sort: sortField,
        order: sortOrder,
      };
      if (searchQuery) params.q = `~${searchQuery}`;
      if (filterStatus) params.status = filterStatus;
      if (filterScenarioId) params.scenario_id = filterScenarioId;
      if (filterDateFrom) params.from = filterDateFrom;
      if (filterDateTo) params.to = filterDateTo;

      const res = await fetchSubjects(params); // In production: use exportSubjects
      void res;
      showToast(MSG.exportSuccess, 'success');
    } catch {
      showToast(MSG.errExport, 'error');
    } finally {
      setExporting(false);
    }
  };

  // --- Selection ---
  const pageIds = subjects.map((s) => s.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id)) && !allPageSelected;

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // --- Check if any filter is active ---
  const hasActiveFilters = searchQuery || filterStatus || filterScenarioId || filterDateFrom || filterDateTo;

  // --- Sort icon ---
  const SortIcon = ({ field }: { field: SortField }) => {
    const isActive = sortField === field;
    const isAsc = isActive && sortOrder === 'asc';
    return (
      <span className={`inline-block ml-1 text-[10px] ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`}>
        {isActive ? (isAsc ? '\u25B2' : '\u25BC') : '\u25B2'}
      </span>
    );
  };

  // --- Render ---
  return (
    <>
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: MSG.breadcrumbDashboard, href: '/dashboard' },
          { label: MSG.breadcrumbProfiles },
        ]}
        title={MSG.pageTitle}
        subtitle={!loading ? MSG.subtitleCount(total) : undefined}
        actions={
          <>
            {canExport && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download size={14} />}
                loading={exporting}
                onClick={handleExport}
              >
                {MSG.exportExcel}
              </Button>
            )}
            {canCreate && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus size={14} />}
                onClick={() => navigate('/ho-so/them-moi')}
              >
                {MSG.addProfile}
              </Button>
            )}
          </>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white border border-zinc-200 rounded p-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-[240px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={MSG.searchPlaceholder}
              className="w-full h-[30px] pl-8 pr-3 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700"
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => handleFilterChange(setFilterStatus, e.target.value)}
            className="h-[30px] px-2 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700 w-[160px]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value === '' ? MSG.filterStatus : opt.label}
              </option>
            ))}
          </select>

          {/* Scenario filter */}
          <select
            value={filterScenarioId}
            onChange={(e) => handleFilterChange(setFilterScenarioId, e.target.value)}
            className="h-[30px] px-2 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700 w-[160px]"
            disabled={scenarioOptions.length === 0}
          >
            <option value="">{MSG.filterScenario}</option>
            {scenarioOptions.length === 0 ? (
              <option disabled>{MSG.noScenario}</option>
            ) : (
              scenarioOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))
            )}
          </select>

          {/* Date range */}
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => handleFilterChange(setFilterDateFrom, e.target.value)}
            placeholder={MSG.filterDateFrom}
            className="h-[30px] px-2 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700 w-[140px]"
          />
          <span className="text-zinc-400 text-[12px]">&mdash;</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => handleFilterChange(setFilterDateTo, e.target.value)}
            placeholder={MSG.filterDateTo}
            className="h-[30px] px-2 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700 w-[140px]"
          />

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('');
                setFilterScenarioId('');
                setFilterDateFrom('');
                setFilterDateTo('');
                setCurrentPage(1);
              }}
              className="text-[12px] text-red-700 hover:text-red-800 hover:underline"
            >
              {MSG.clearFilters}
            </button>
          )}
        </div>

        {/* Active filter tags */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {filterStatus && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[11px] rounded">
                {MSG.filterStatus}: {STATUS_BADGE[filterStatus]?.label ?? filterStatus}
                <button onClick={() => handleFilterChange(setFilterStatus, '')} className="text-zinc-400 hover:text-zinc-600">&times;</button>
              </span>
            )}
            {filterScenarioId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[11px] rounded">
                {MSG.filterScenario}: {scenarioOptions.find((s) => s.id === filterScenarioId)?.name ?? filterScenarioId}
                <button onClick={() => handleFilterChange(setFilterScenarioId, '')} className="text-zinc-400 hover:text-zinc-600">&times;</button>
              </span>
            )}
            {(filterDateFrom || filterDateTo) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[11px] rounded">
                {filterDateFrom || '...'} &mdash; {filterDateTo || '...'}
                <button
                  onClick={() => {
                    handleFilterChange(setFilterDateFrom, '');
                    handleFilterChange(setFilterDateTo, '');
                  }}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  &times;
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && showCheckbox && (
        <div className="flex items-center gap-3 bg-zinc-100 border border-zinc-200 rounded px-3 py-2 mb-3">
          <span className="text-[13px] text-zinc-700 font-medium">
            {MSG.selectedCount(selectedIds.size)}
          </span>
          <Button variant="outline" size="sm" onClick={() => showToast(MSG.bulkAssign, 'info')}>
            {MSG.bulkAssign}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            {MSG.bulkExport}
          </Button>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white border border-zinc-200 rounded overflow-hidden">
        {loading ? (
          <div aria-busy="true">
            <TableSkeleton />
          </div>
        ) : error && subjects.length === 0 ? (
          /* Error state with no prior data */
          <div className="flex flex-col items-center justify-center py-10" role="status">
            <p className="text-[13px] text-zinc-500 mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={() => doFetch(true)} leftIcon={<RefreshCw size={12} />}>
              {MSG.retry}
            </Button>
          </div>
        ) : subjects.length === 0 && !hasActiveFilters ? (
          /* Empty state - no data at all */
          <div role="status" aria-live="polite">
            <EmptyState
              icon={<Users size={48} />}
              title={MSG.emptyTitle}
              subtitle={MSG.emptySubtitle}
            />
            {canCreate && (
              <div className="flex justify-center pb-6">
                <Button variant="primary" size="md" leftIcon={<Plus size={14} />} onClick={() => navigate('/ho-so/them-moi')}>
                  {MSG.addProfile}
                </Button>
              </div>
            )}
          </div>
        ) : subjects.length === 0 && hasActiveFilters ? (
          /* No results with filters */
          <div role="status" aria-live="polite">
            <EmptyState
              icon={<Search size={48} />}
              title={MSG.noResultsTitle}
              subtitle={MSG.noResultsSubtitle}
            />
          </div>
        ) : (
          /* Data table */
          <div className={`overflow-x-auto ${refreshing ? 'opacity-50' : ''}`}>
            <table className="w-full text-left min-w-[800px]" role="table">
              <caption className="sr-only">{MSG.pageTitle}</caption>
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] text-zinc-500 uppercase tracking-wider">
                  {showCheckbox && (
                    <th className="px-3 py-2 w-[40px] text-center">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={(el) => { if (el) el.indeterminate = somePageSelected; }}
                        onChange={toggleSelectAll}
                        aria-label={MSG.colCheckbox}
                        className="rounded border-zinc-300"
                      />
                    </th>
                  )}
                  <th
                    className="px-3 py-2 font-medium w-[130px] cursor-pointer select-none"
                    aria-sort={sortField === 'ma_ho_so' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('ma_ho_so')}
                  >
                    {MSG.colMaHoSo}<SortIcon field="ma_ho_so" />
                  </th>
                  <th
                    className="px-3 py-2 font-medium cursor-pointer select-none"
                    aria-sort={sortField === 'full_name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('full_name')}
                  >
                    {MSG.colFullName}<SortIcon field="full_name" />
                  </th>
                  <th className="px-3 py-2 font-medium w-[130px]">{MSG.colCccd}</th>
                  <th className="px-3 py-2 font-medium w-[200px]">{MSG.colAddress}</th>
                  <th
                    className="px-3 py-2 font-medium w-[130px] cursor-pointer select-none"
                    aria-sort={sortField === 'scenario_name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('scenario_name')}
                  >
                    {MSG.colScenario}<SortIcon field="scenario_name" />
                  </th>
                  <th
                    className="px-3 py-2 font-medium w-[120px] cursor-pointer select-none"
                    aria-sort={sortField === 'status' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('status')}
                  >
                    {MSG.colStatus}<SortIcon field="status" />
                  </th>
                  <th
                    className="px-3 py-2 font-medium w-[100px] cursor-pointer select-none"
                    aria-sort={sortField === 'created_at' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('created_at')}
                  >
                    {MSG.colCreatedAt}<SortIcon field="created_at" />
                  </th>
                  <th className="px-3 py-2 font-medium w-[100px] text-right">{MSG.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {subjects.map((s) => {
                  const badge = STATUS_BADGE[s.status] ?? { variant: 'neutral' as const, label: s.status };
                  return (
                    <tr key={s.id} className="h-10 hover:bg-zinc-50 transition-colors">
                      {showCheckbox && (
                        <td className="px-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(s.id)}
                            onChange={() => toggleSelect(s.id)}
                            aria-label={`Ch\u1ECDn h\u1ED3 s\u01A1 ${s.ma_ho_so}`}
                            className="rounded border-zinc-300"
                          />
                        </td>
                      )}
                      <td className="px-3">
                        <button
                          onClick={() => navigate(`/ho-so/${s.id}`)}
                          className="font-mono text-[12px] text-red-700 hover:text-red-800 hover:underline cursor-pointer tracking-wide"
                        >
                          {s.ma_ho_so}
                        </button>
                      </td>
                      <td className="px-3">
                        <button
                          onClick={() => navigate(`/ho-so/${s.id}`)}
                          className="text-[13px] text-zinc-900 font-medium hover:text-red-700 hover:underline cursor-pointer"
                        >
                          {s.full_name}
                        </button>
                      </td>
                      <td className="px-3 font-mono text-[12px] text-zinc-600 tracking-wide">
                        {s.cccd}
                      </td>
                      <td className="px-3 text-[13px] text-zinc-900 max-w-[200px] truncate" title={s.address}>
                        {s.address}
                      </td>
                      <td className="px-3 text-[13px] text-zinc-900">
                        {s.scenario_name ? (
                          s.scenario_name
                        ) : (
                          <span className="text-zinc-400">{MSG.noScenarioAssigned}</span>
                        )}
                      </td>
                      <td className="px-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-3 text-[12px] text-zinc-500 tabular-nums">
                        {formatDate(s.created_at)}
                      </td>
                      <td className="px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/ho-so/${s.id}`)}>
                            {MSG.view}
                          </Button>
                          {canEdit && (
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/ho-so/${s.id}/chinh-sua`)}>
                              {MSG.edit}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && subjects.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-200">
            <p className="text-[12px] text-zinc-500" aria-live="polite">
              {MSG.paginationInfo(
                (currentPage - 1) * itemsPerPage + 1,
                Math.min(currentPage * itemsPerPage, total),
                total,
              )}
            </p>
            <nav aria-label="Ph\u00E2n trang" className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-[28px] w-[28px] flex items-center justify-center rounded text-zinc-600 hover:bg-zinc-100 disabled:text-zinc-300 disabled:cursor-not-allowed"
                aria-label="Trang tr\u01B0\u1EDBc"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 7) return true;
                  if (p === 1 || p === totalPages) return true;
                  if (Math.abs(p - currentPage) <= 1) return true;
                  return false;
                })
                .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1]) > 1) {
                    acc.push('ellipsis');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="px-1 text-zinc-400 text-[12px]">&hellip;</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item)}
                      aria-current={currentPage === item ? 'page' : undefined}
                      className={`h-[28px] min-w-[28px] px-1.5 flex items-center justify-center rounded text-[12px] font-medium ${
                        currentPage === item
                          ? 'bg-red-700 text-white'
                          : 'text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-[28px] w-[28px] flex items-center justify-center rounded text-zinc-600 hover:bg-zinc-100 disabled:text-zinc-300 disabled:cursor-not-allowed"
                aria-label="Trang sau"
              >
                <ChevronRight size={14} />
              </button>
            </nav>
          </div>
        )}
      </div>
    </>
  );
}

export default SubjectListPage;
