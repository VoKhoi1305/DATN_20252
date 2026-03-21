import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';

import PageHeader from '@/components/navigation/PageHeader';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

import { createUser } from '@/api/users.api';
import { fetchAreas, extractAreas } from '@/api/subjects.api';
import { getMessages } from '@/locales';

import type { AreaOption } from '@/types/subject.types';
import type { CreateUserPayload } from '@/types/user.types';

const MSG = getMessages().users;

const inputBase =
  'w-full h-9 px-3 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700';
const inputError = 'border-red-500';
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

function UserCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [areaId, setAreaId] = useState('');
  const [dataScope, setDataScope] = useState('');

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
    document.title = `${MSG.breadcrumbCreate} — ${MSG.pageTitle}`;
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) setAreaDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAreas()
      .then((res) => { if (!cancelled) setAreas(extractAreas(res)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingAreas(false); });
    return () => { cancelled = true; };
  }, []);

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    const trimUser = username.trim();
    if (!trimUser) errs.username = MSG.valRequired;
    else if (trimUser.length < 3) errs.username = MSG.valUsernameMin;
    else if (!/^[a-zA-Z0-9._]+$/.test(trimUser)) errs.username = MSG.valUsernameFormat;

    if (!password) errs.password = MSG.valRequired;
    else if (password.length < 8) errs.password = MSG.valPasswordMin;

    if (!fullName.trim()) errs.full_name = MSG.valRequired;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = MSG.valEmailFormat;

    if (!role) errs.role = MSG.valSelectRole;
    if (!dataScope) errs.data_scope_level = MSG.valSelectScope;

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: CreateUserPayload = {
        username: username.trim(),
        password,
        full_name: fullName.trim(),
        role,
        data_scope_level: dataScope,
      };
      if (email.trim()) payload.email = email.trim();
      if (phone.trim()) payload.phone = phone.trim();
      if (areaId) payload.area_id = areaId;

      await createUser(payload);
      showToast(MSG.createSuccess, 'success');
      navigate('/admin/tai-khoan', { replace: true });
    } catch (err: unknown) {
      const status = (err as any)?.response?.status;
      if (status === 409) {
        setErrors((prev) => ({ ...prev, username: MSG.usernameExists }));
      } else {
        showToast(MSG.errSystem, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: MSG.breadcrumbDashboard, href: '/dashboard' },
          { label: MSG.breadcrumbUsers, href: '/admin/tai-khoan' },
          { label: MSG.breadcrumbCreate },
        ]}
        title={MSG.breadcrumbCreate + ' tài khoản'}
      />

      {/* Account info */}
      <div className="bg-white border border-zinc-200 rounded p-4 mb-3">
        <h2 className="text-[14px] font-semibold text-zinc-900 mb-3">Thông tin tài khoản</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <Label text={MSG.lblUsername} required />
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); clearError('username'); }}
              placeholder={MSG.phUsername}
              className={`${inputBase} font-mono ${errors.username ? inputError : ''}`}
            />
            <FieldError message={errors.username} />
          </div>
          <div>
            <Label text={MSG.lblPassword} required />
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
              placeholder={MSG.phPassword}
              className={`${inputBase} ${errors.password ? inputError : ''}`}
            />
            <FieldError message={errors.password} />
          </div>
          <div>
            <Label text={MSG.lblFullName} required />
            <input
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); clearError('full_name'); }}
              placeholder={MSG.phFullName}
              className={`${inputBase} ${errors.full_name ? inputError : ''}`}
            />
            <FieldError message={errors.full_name} />
          </div>
          <div>
            <Label text={MSG.lblEmail} />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
              placeholder={MSG.phEmail}
              className={`${inputBase} ${errors.email ? inputError : ''}`}
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
              onChange={(e) => { setRole(e.target.value); clearError('role'); }}
              className={`${selectBase} ${errors.role ? inputError : ''} ${!role ? 'text-zinc-400' : ''}`}
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
              onChange={(e) => { setDataScope(e.target.value); clearError('data_scope_level'); }}
              className={`${selectBase} ${errors.data_scope_level ? inputError : ''} ${!dataScope ? 'text-zinc-400' : ''}`}
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
      <div className="flex items-center justify-end gap-2 pt-1 pb-4">
        <Button variant="ghost" size="md" leftIcon={<X size={14} />} onClick={() => navigate(-1)} disabled={submitting}>
          {MSG.btnCancel}
        </Button>
        <Button variant="primary" size="md" leftIcon={<Save size={14} />} loading={submitting} onClick={handleSubmit}>
          {submitting ? MSG.btnSaving : MSG.btnSave}
        </Button>
      </div>
    </>
  );
}

export default UserCreatePage;
