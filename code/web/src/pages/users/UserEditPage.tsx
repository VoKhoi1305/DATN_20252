import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Trash2 } from 'lucide-react';

import PageHeader from '@/components/navigation/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

import { fetchUserDetail, updateUser, deleteUser } from '@/api/users.api';
import { fetchAreas, extractAreas } from '@/api/subjects.api';
import { getUser } from '@/stores/auth.store';
import { getMessages } from '@/locales';

import type { AreaOption } from '@/types/subject.types';
import type { UserDetail, UpdateUserPayload } from '@/types/user.types';

const MSG = getMessages().users;

const inputBase =
  'w-full h-9 px-3 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700';
const selectBase =
  'w-full h-9 px-3 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700';

function Label({ text, required = false }: { text: string; required?: boolean }) {
  return (
    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
      {text}
      {required && <span className="text-red-600 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-700 mt-1">{message}</p>;
}

const ROLE_OPTIONS = [
  { value: 'IT_ADMIN', label: MSG.roleItAdmin },
  { value: 'LANH_DAO', label: MSG.roleLanhDao },
  { value: 'CAN_BO_QUAN_LY', label: MSG.roleCanBoQuanLy },
  { value: 'CAN_BO_CO_SO', label: MSG.roleCanBoCoso },
];

const SCOPE_OPTIONS = [
  { value: 'DISTRICT', label: MSG.scopeDistrict },
  { value: 'PROVINCE', label: MSG.scopeProvince },
  { value: 'SYSTEM', label: MSG.scopeSystem },
];

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: MSG.statusActive,
  LOCKED: MSG.statusLocked,
  DEACTIVATED: MSG.statusDeactivated,
};

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

function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentUser = getUser();
  const isAdmin = currentUser?.role === 'IT_ADMIN';

  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [areaId, setAreaId] = useState('');
  const [dataScope, setDataScope] = useState('');
  const [status, setStatus] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [areas, setAreas] = useState<AreaOption[]>([]);

  const [areaSearch, setAreaSearch] = useState('');
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  const filteredAreas = areaSearch.trim()
    ? areas.filter((a) => a.name.toLowerCase().includes(areaSearch.toLowerCase()))
    : areas;
  const selectedAreaName = areas.find((a) => a.id === areaId)?.name ?? '';

  useEffect(() => {
    document.title = `${MSG.breadcrumbEdit} — ${MSG.pageTitle}`;
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) setAreaDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [userRes, areaRes] = await Promise.all([
          fetchUserDetail(id),
          fetchAreas(),
        ]);
        if (cancelled) return;

        const u = (userRes.data as any)?.data ?? userRes.data;
        setDetail(u);
        setFullName(u.full_name ?? '');
        setEmail(u.email ?? '');
        setPhone(u.phone ?? '');
        setRole(u.role ?? '');
        setAreaId(u.area_id ?? '');
        setDataScope(u.data_scope_level ?? '');
        setStatus(u.status ?? '');

        setAreas(extractAreas(areaRes));
      } catch {
        showToast(MSG.errNotFound, 'error');
        navigate('/admin/tai-khoan', { replace: true });
      } finally {
        if (!cancelled) { setLoading(false); setLoadingAreas(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [id, navigate, showToast]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.full_name = MSG.valRequired;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = MSG.valEmailFormat;
    if (!role) errs.role = MSG.valSelectRole;
    if (!dataScope) errs.data_scope_level = MSG.valSelectScope;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!id || !validate()) return;
    setSubmitting(true);
    try {
      const payload: UpdateUserPayload = {};
      if (fullName.trim() !== detail?.full_name) payload.full_name = fullName.trim();
      if ((email.trim() || null) !== detail?.email) payload.email = email.trim() || undefined;
      if ((phone.trim() || null) !== detail?.phone) payload.phone = phone.trim() || undefined;
      if (role !== detail?.role) payload.role = role;
      if ((areaId || null) !== detail?.area_id) payload.area_id = areaId || undefined;
      if (dataScope !== detail?.data_scope_level) payload.data_scope_level = dataScope;
      if (status !== detail?.status) payload.status = status;

      await updateUser(id, payload);
      showToast(MSG.updateSuccess, 'success');
      navigate('/admin/tai-khoan', { replace: true });
    } catch {
      showToast(MSG.errSystem, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm(MSG.confirmDelete)) return;
    try {
      await deleteUser(id);
      showToast(MSG.deleteSuccess, 'success');
      navigate('/admin/tai-khoan', { replace: true });
    } catch {
      showToast(MSG.errSystem, 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (!detail) return null;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: MSG.breadcrumbDashboard, href: '/dashboard' },
          { label: MSG.breadcrumbUsers, href: '/admin/tai-khoan' },
          { label: MSG.breadcrumbEdit },
        ]}
        title={`${MSG.breadcrumbEdit}: ${detail.username}`}
      />

      {/* Account info (read-only) */}
      <div className="bg-white border border-zinc-200 rounded p-4 mb-3">
        <h2 className="text-[14px] font-semibold text-zinc-900 mb-3">Thông tin tài khoản</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-[13px]">
          <div>
            <span className="text-zinc-500">Username:</span>{' '}
            <span className="font-mono text-zinc-900">{detail.username}</span>
          </div>
          <div>
            <span className="text-zinc-500">{MSG.colStatus}:</span>{' '}
            <Badge variant={detail.status === 'ACTIVE' ? 'done' : detail.status === 'LOCKED' ? 'urgent' : 'warning'}>
              {STATUS_LABEL[detail.status] ?? detail.status}
            </Badge>
          </div>
          <div>
            <span className="text-zinc-500">{MSG.colOtp}:</span>{' '}
            <span className={detail.otp_enabled ? 'text-green-600' : 'text-zinc-400'}>
              {detail.otp_enabled ? MSG.detailOtpEnabled : MSG.detailOtpDisabled}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">{MSG.colLastLogin}:</span>{' '}
            <span className="text-zinc-700">{formatDateTime(detail.last_login_at)}</span>
          </div>
          <div>
            <span className="text-zinc-500">{MSG.detailFailedLogins}:</span>{' '}
            <span className={detail.failed_login_count > 0 ? 'text-red-600 font-medium' : 'text-zinc-700'}>
              {detail.failed_login_count}
            </span>
          </div>
          {detail.locked_until && (
            <div>
              <span className="text-zinc-500">{MSG.detailLocked}:</span>{' '}
              <span className="text-red-600">{formatDateTime(detail.locked_until)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Editable fields */}
      <div className="bg-white border border-zinc-200 rounded p-4 mb-3">
        <h2 className="text-[14px] font-semibold text-zinc-900 mb-3">Thông tin cá nhân</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <Label text={MSG.lblFullName} required />
            <input
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setErrors((p) => { const n = { ...p }; delete n.full_name; return n; }); }}
              placeholder={MSG.phFullName}
              className={`${inputBase} ${errors.full_name ? 'border-red-500' : ''}`}
            />
            <FieldError message={errors.full_name} />
          </div>
          <div>
            <Label text={MSG.lblEmail} />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => { const n = { ...p }; delete n.email; return n; }); }}
              placeholder={MSG.phEmail}
              className={`${inputBase} ${errors.email ? 'border-red-500' : ''}`}
            />
            <FieldError message={errors.email} />
          </div>
          <div>
            <Label text={MSG.lblPhone} />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={MSG.phPhone}
              className={inputBase}
            />
          </div>
          <div>
            <Label text={MSG.lblStatus} />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectBase}
            >
              <option value="ACTIVE">{MSG.statusActive}</option>
              <option value="DEACTIVATED">{MSG.statusDeactivated}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Role & scope */}
      <div className="bg-white border border-zinc-200 rounded p-4 mb-3">
        <h2 className="text-[14px] font-semibold text-zinc-900 mb-3">Phân quyền</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <Label text={MSG.lblRole} required />
            <select
              value={role}
              onChange={(e) => { setRole(e.target.value); setErrors((p) => { const n = { ...p }; delete n.role; return n; }); }}
              className={`${selectBase} ${errors.role ? 'border-red-500' : ''}`}
            >
              <option value="" disabled>Chọn vai trò...</option>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <FieldError message={errors.role} />
          </div>
          <div>
            <Label text={MSG.lblDataScope} required />
            <select
              value={dataScope}
              onChange={(e) => { setDataScope(e.target.value); setErrors((p) => { const n = { ...p }; delete n.data_scope_level; return n; }); }}
              className={`${selectBase} ${errors.data_scope_level ? 'border-red-500' : ''}`}
            >
              <option value="" disabled>Chọn phạm vi...</option>
              {SCOPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <FieldError message={errors.data_scope_level} />
          </div>
          <div ref={areaRef}>
            {loadingAreas ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <>
                <Label text={MSG.lblArea} />
                <div className="relative">
                  <input
                    type="text"
                    value={areaDropdownOpen ? areaSearch : selectedAreaName}
                    onChange={(e) => {
                      setAreaSearch(e.target.value);
                      if (!areaDropdownOpen) setAreaDropdownOpen(true);
                    }}
                    onFocus={() => { setAreaDropdownOpen(true); setAreaSearch(''); }}
                    placeholder={MSG.phArea}
                    className={inputBase}
                    autoComplete="off"
                  />
                  {areaDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full max-h-[200px] overflow-y-auto bg-white border border-zinc-200 rounded shadow-lg">
                      {filteredAreas.length === 0 ? (
                        <div className="px-3 py-2 text-[13px] text-zinc-400">Không tìm thấy</div>
                      ) : (
                        filteredAreas.map((area) => (
                          <button
                            key={area.id}
                            type="button"
                            onClick={() => { setAreaId(area.id); setAreaSearch(''); setAreaDropdownOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-[13px] hover:bg-zinc-50 transition-colors ${
                              area.id === areaId ? 'bg-red-50 text-red-700 font-medium' : 'text-zinc-900'
                            }`}
                          >
                            {area.name}
                            <span className="ml-2 text-[11px] text-zinc-400">{area.level}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 pb-4">
        <div>
          {isAdmin && (
            <Button variant="ghost" size="md" leftIcon={<Trash2 size={14} />} onClick={handleDelete} className="text-red-600 hover:text-red-700">
              {MSG.btnDelete}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="md" leftIcon={<X size={14} />} onClick={() => navigate(-1)} disabled={submitting}>
            {MSG.btnCancel}
          </Button>
          <Button variant="primary" size="md" leftIcon={<Save size={14} />} loading={submitting} onClick={handleSubmit}>
            {submitting ? MSG.btnSaving : MSG.btnSave}
          </Button>
        </div>
      </div>
    </>
  );
}

export default UserEditPage;
