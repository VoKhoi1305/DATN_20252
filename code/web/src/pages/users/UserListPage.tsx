import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Users, RefreshCw, ChevronLeft, ChevronRight, Shield, ShieldOff, Unlock, KeyRound } from 'lucide-react';

import PageHeader from '@/components/navigation/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/data-display/EmptyState';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

import { fetchUsers, toggleUserStatus, unlockUser, resetUserPassword } from '@/api/users.api';
import { getUser } from '@/stores/auth.store';
import { getMessages } from '@/locales';

import type { UserListItem, UserListParams } from '@/types/user.types';

const MSG = getMessages().users;

const ROLE_LABEL: Record<string, string> = {
  IT_ADMIN: MSG.roleItAdmin,
  LANH_DAO: MSG.roleLanhDao,
  CAN_BO_QUAN_LY: MSG.roleCanBoQuanLy,
  CAN_BO_CO_SO: MSG.roleCanBoCoso,
  SUBJECT: MSG.roleSubject,
};

const ROLE_BADGE: Record<string, 'urgent' | 'info' | 'processing' | 'warning' | 'done'> = {
  IT_ADMIN: 'urgent',
  LANH_DAO: 'info',
  CAN_BO_QUAN_LY: 'processing',
  CAN_BO_CO_SO: 'done',
  SUBJECT: 'warning',
};

const STATUS_BADGE: Record<string, { variant: 'done' | 'urgent' | 'warning'; label: string }> = {
  ACTIVE: { variant: 'done', label: MSG.statusActive },
  LOCKED: { variant: 'urgent', label: MSG.statusLocked },
  DEACTIVATED: { variant: 'warning', label: MSG.statusDeactivated },
};

const ROLE_OPTIONS = [
  { value: '', label: MSG.filterAll },
  { value: 'IT_ADMIN', label: MSG.roleItAdmin },
  { value: 'LANH_DAO', label: MSG.roleLanhDao },
  { value: 'CAN_BO_QUAN_LY', label: MSG.roleCanBoQuanLy },
  { value: 'CAN_BO_CO_SO', label: MSG.roleCanBoCoso },
  { value: 'SUBJECT', label: MSG.roleSubject },
];

const STATUS_OPTIONS = [
  { value: '', label: MSG.filterAll },
  { value: 'ACTIVE', label: MSG.statusActive },
  { value: 'LOCKED', label: MSG.statusLocked },
  { value: 'DEACTIVATED', label: MSG.statusDeactivated },
];

type SortField = 'username' | 'full_name' | 'role' | 'status' | 'created_at';

function TableSkeleton() {
  return (
    <div className="divide-y divide-zinc-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 h-10">
          <Skeleton className="h-3 w-[100px]" />
          <Skeleton className="h-3 w-[120px]" />
          <Skeleton className="h-3 w-[80px]" />
          <Skeleton className="h-3 w-[80px]" />
          <Skeleton className="h-3 w-[100px]" />
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

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

function UserListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const currentUser = getUser();
  const isAdmin = currentUser?.role === 'IT_ADMIN';

  const getParamInt = (key: string, def: number) => {
    const v = searchParams.get(key);
    return v ? parseInt(v, 10) || def : def;
  };

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(getParamInt('page', 1));
  const [sortField, setSortField] = useState<SortField>((searchParams.get('sort') as SortField) || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('order') as 'asc' | 'desc') || 'desc');

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [filterRole, setFilterRole] = useState(searchParams.get('role') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isFirstLoad = useRef(true);
  const appliedSearchRef = useRef(searchQuery);

  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  useEffect(() => {
    document.title = MSG.documentTitle;
  }, []);

  const syncUrl = useCallback((params: Record<string, string | number>) => {
    const newParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && v !== null) newParams.set(k, String(v));
    });
    setSearchParams(newParams, { replace: true });
  }, [setSearchParams]);

  const doFetch = useCallback(async (showSkeleton = false) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    if (showSkeleton) setLoading(true);
    else setRefreshing(true);
    setError(null);

    const params: UserListParams = {
      page: currentPage,
      limit: itemsPerPage,
      sort: sortField,
      order: sortOrder,
    };
    const q = appliedSearchRef.current;
    if (q) params.q = `~${q}`;
    if (filterRole) params.role = filterRole;
    if (filterStatus) params.status = filterStatus;

    try {
      const res = await fetchUsers(params);
      const body = res.data.data ?? (res.data as unknown as { data: UserListItem[]; total: number });
      setUsers(body.data);
      setTotal(body.total);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if ((err as { name?: string })?.name === 'CanceledError') return;
      if (status === 401) return;
      if (status === 403) setError(MSG.errForbidden);
      else setError(MSG.errSystem);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFirstLoad.current = false;
    }
  }, [currentPage, sortField, sortOrder, filterRole, filterStatus]);

  useEffect(() => {
    doFetch(isFirstLoad.current);
    syncUrl({
      page: currentPage,
      sort: sortField,
      order: sortOrder,
      q: appliedSearchRef.current,
      role: filterRole,
      status: filterStatus,
    });
  }, [doFetch, syncUrl, currentPage, sortField, sortOrder, filterRole, filterStatus]);

  useEffect(() => {
    if (isFirstLoad.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      appliedSearchRef.current = searchQuery;
      setCurrentPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else { setSortField('created_at'); setSortOrder('desc'); }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleToggleStatus = async (u: UserListItem) => {
    const msg = u.status === 'ACTIVE' ? MSG.confirmToggleDeactivate : MSG.confirmToggleActivate;
    if (!confirm(msg)) return;
    try {
      await toggleUserStatus(u.id);
      showToast(MSG.toggleStatusSuccess, 'success');
      doFetch(false);
    } catch { showToast(MSG.errSystem, 'error'); }
  };

  const handleUnlock = async (id: string) => {
    try {
      await unlockUser(id);
      showToast(MSG.unlockSuccess, 'success');
      doFetch(false);
    } catch { showToast(MSG.errSystem, 'error'); }
  };

  const handleResetPassword = async () => {
    if (!resetUserId || resetPassword.length < 8) return;
    setResetting(true);
    try {
      await resetUserPassword(resetUserId, resetPassword);
      showToast(MSG.resetPasswordSuccess, 'success');
      setResetModalOpen(false);
      setResetPassword('');
      setResetUserId(null);
    } catch { showToast(MSG.errSystem, 'error'); }
    finally { setResetting(false); }
  };

  const hasActiveFilters = searchQuery || filterRole || filterStatus;

  const SortIcon = ({ field }: { field: SortField }) => {
    const isActive = sortField === field;
    const isAsc = isActive && sortOrder === 'asc';
    return (
      <span className={`inline-block ml-1 text-[10px] ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`}>
        {isActive ? (isAsc ? '▲' : '▼') : '▲'}
      </span>
    );
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: MSG.breadcrumbDashboard, href: '/dashboard' },
          { label: MSG.breadcrumbUsers },
        ]}
        title={MSG.pageTitle}
        subtitle={!loading ? MSG.subtitleCount(total) : undefined}
        actions={
          isAdmin ? (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus size={14} />}
              onClick={() => navigate('/admin/tai-khoan/them-moi')}
            >
              {MSG.addUser}
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="bg-white border border-zinc-200 rounded p-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-[260px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={MSG.searchPlaceholder}
              className="w-full h-[30px] pl-8 pr-3 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
            className="h-[30px] px-2 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700 w-[160px]"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.value === '' ? MSG.filterRole : o.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="h-[30px] px-2 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700 w-[160px]"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.value === '' ? MSG.filterStatus : o.label}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearchQuery(''); setFilterRole(''); setFilterStatus(''); setCurrentPage(1); }}
              className="text-[12px] text-red-700 hover:text-red-800 hover:underline"
            >
              {MSG.clearFilters}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : error && users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <p className="text-[13px] text-zinc-500 mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={() => doFetch(true)} leftIcon={<RefreshCw size={12} />}>
              Thử lại
            </Button>
          </div>
        ) : users.length === 0 && !hasActiveFilters ? (
          <EmptyState
            icon={<Users size={48} />}
            title={MSG.emptyTitle}
            subtitle={MSG.emptySubtitle}
          />
        ) : users.length === 0 && hasActiveFilters ? (
          <EmptyState
            icon={<Search size={48} />}
            title={MSG.noResultsTitle}
            subtitle={MSG.noResultsSubtitle}
          />
        ) : (
          <div className={`overflow-x-auto ${refreshing ? 'opacity-50' : ''}`}>
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] text-zinc-500 uppercase tracking-wider">
                  <th className="px-3 py-2 font-medium cursor-pointer select-none" onClick={() => handleSort('username')}>
                    {MSG.colUsername}<SortIcon field="username" />
                  </th>
                  <th className="px-3 py-2 font-medium cursor-pointer select-none" onClick={() => handleSort('full_name')}>
                    {MSG.colFullName}<SortIcon field="full_name" />
                  </th>
                  <th className="px-3 py-2 font-medium w-[130px] cursor-pointer select-none" onClick={() => handleSort('role')}>
                    {MSG.colRole}<SortIcon field="role" />
                  </th>
                  <th className="px-3 py-2 font-medium w-[110px] cursor-pointer select-none" onClick={() => handleSort('status')}>
                    {MSG.colStatus}<SortIcon field="status" />
                  </th>
                  <th className="px-3 py-2 font-medium w-[60px]">{MSG.colOtp}</th>
                  <th className="px-3 py-2 font-medium w-[130px]">{MSG.colLastLogin}</th>
                  <th className="px-3 py-2 font-medium w-[100px] cursor-pointer select-none" onClick={() => handleSort('created_at')}>
                    {MSG.colCreatedAt}<SortIcon field="created_at" />
                  </th>
                  <th className="px-3 py-2 font-medium w-[180px] text-right">{MSG.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((u) => {
                  const badge = STATUS_BADGE[u.status] ?? { variant: 'warning' as const, label: u.status };
                  const roleBadgeVariant = ROLE_BADGE[u.role] ?? 'info';
                  return (
                    <tr key={u.id} className="h-10 hover:bg-zinc-50 transition-colors">
                      <td className="px-3">
                        <span className="font-mono text-[12px] text-zinc-900 tracking-wide">{u.username}</span>
                      </td>
                      <td className="px-3 text-[13px] text-zinc-900 font-medium">{u.full_name}</td>
                      <td className="px-3">
                        <Badge variant={roleBadgeVariant}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                      </td>
                      <td className="px-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-3 text-[12px] text-zinc-500">
                        {u.otp_enabled ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-3 text-[12px] text-zinc-500 tabular-nums">
                        {formatDateTime(u.last_login_at)}
                      </td>
                      <td className="px-3 text-[12px] text-zinc-500 tabular-nums">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/tai-khoan/${u.id}/chinh-sua`)}>
                            {MSG.btnEdit}
                          </Button>
                          {u.status === 'LOCKED' && (
                            <button
                              onClick={() => handleUnlock(u.id)}
                              className="h-7 w-7 flex items-center justify-center text-zinc-400 hover:text-green-600 transition-colors rounded hover:bg-zinc-100"
                              title={MSG.btnUnlock}
                            >
                              <Unlock size={14} />
                            </button>
                          )}
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => { setResetUserId(u.id); setResetPassword(''); setResetModalOpen(true); }}
                                className="h-7 w-7 flex items-center justify-center text-zinc-400 hover:text-amber-600 transition-colors rounded hover:bg-zinc-100"
                                title={MSG.btnResetPassword}
                              >
                                <KeyRound size={14} />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className="h-7 w-7 flex items-center justify-center text-zinc-400 hover:text-blue-600 transition-colors rounded hover:bg-zinc-100"
                                title={MSG.btnToggleStatus}
                              >
                                {u.status === 'ACTIVE' ? <ShieldOff size={14} /> : <Shield size={14} />}
                              </button>
                            </>
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
        {!loading && users.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-200">
            <p className="text-[12px] text-zinc-500">
              {MSG.paginationInfo(
                (currentPage - 1) * itemsPerPage + 1,
                Math.min(currentPage * itemsPerPage, total),
                total,
              )}
            </p>
            <nav className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-[28px] w-[28px] flex items-center justify-center rounded text-zinc-600 hover:bg-zinc-100 disabled:text-zinc-300 disabled:cursor-not-allowed"
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
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('ellipsis');
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
                      className={`h-[28px] min-w-[28px] px-1.5 flex items-center justify-center rounded text-[12px] font-medium ${
                        currentPage === item ? 'bg-red-700 text-white' : 'text-zinc-600 hover:bg-zinc-100'
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
              >
                <ChevronRight size={14} />
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      <Modal
        open={resetModalOpen}
        onClose={() => { setResetModalOpen(false); setResetPassword(''); }}
        title={MSG.btnResetPassword}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setResetModalOpen(false)}>{MSG.btnCancel}</Button>
            <Button
              variant="primary"
              size="sm"
              loading={resetting}
              onClick={handleResetPassword}
              disabled={resetPassword.length < 8}
            >
              {MSG.btnResetPassword}
            </Button>
          </>
        }
      >
        <div>
          <label className="block text-[13px] font-medium text-zinc-700 mb-1">{MSG.lblNewPassword}</label>
          <input
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder={MSG.phNewPassword}
            className="w-full h-9 px-3 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700"
          />
          {resetPassword && resetPassword.length < 8 && (
            <p className="text-xs text-red-700 mt-1">{MSG.valPasswordMin}</p>
          )}
        </div>
      </Modal>
    </>
  );
}

export default UserListPage;
