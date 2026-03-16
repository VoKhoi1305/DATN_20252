import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';

import PageHeader from '@/components/navigation/PageHeader';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

import { createSubject, fetchAreas, checkCccd } from '@/api/subjects.api';
import { getMessages } from '@/locales';

import type { AreaOption, CreateSubjectPayload } from '@/types/subject.types';

const MSG = getMessages().subjects;

// --- Input styling ---
const inputBase =
  'w-full h-9 px-3 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700';
const inputError = 'border-red-500';
const selectBase =
  'w-full h-9 px-3 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700';
const textareaBase =
  'w-full px-3 py-2 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700 resize-none';

// --- Helper: field label ---
function Label({ text, required = false }: { text: string; required?: boolean }) {
  return (
    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
      {text}
      {required && <span className="text-red-600 ml-0.5">*</span>}
    </label>
  );
}

// --- Helper: error text ---
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-700 mt-1">{message}</p>;
}

// --- Area skeleton ---
function AreasSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

// --- Main Component ---
function SubjectCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // --- Form fields ---
  const [fullName, setFullName] = useState('');
  const [cccd, setCccd] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [areaId, setAreaId] = useState('');
  const [address, setAddress] = useState('');

  // Family
  const [familyContactName, setFamilyContactName] = useState('');
  const [familyContactPhone, setFamilyContactPhone] = useState('');
  const [familyAddress, setFamilyAddress] = useState('');
  const [familyNotes, setFamilyNotes] = useState('');

  // Legal
  const [legalDocNo, setLegalDocNo] = useState('');
  const [legalDate, setLegalDate] = useState('');
  const [legalAuthority, setLegalAuthority] = useState('');
  const [legalDuration, setLegalDuration] = useState('');
  const [legalReason, setLegalReason] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  // --- Validation errors ---
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- Loading states ---
  const [submitting, setSubmitting] = useState(false);
  const [checkingCccd, setCheckingCccd] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // --- Data ---
  const [areas, setAreas] = useState<AreaOption[]>([]);

  // --- Refs ---
  const cccdDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Set document title ---
  useEffect(() => {
    document.title = MSG.createDocTitle;
  }, []);

  // --- Load areas on mount ---
  useEffect(() => {
    let cancelled = false;
    fetchAreas()
      .then((res) => {
        if (!cancelled) {
          setAreas(res.data.data ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          showToast(MSG.createError, 'error');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAreas(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  // --- Clear a single field error ---
  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // --- CCCD check on blur with debounce ---
  const handleCccdBlur = useCallback(() => {
    if (cccdDebounceRef.current) clearTimeout(cccdDebounceRef.current);

    const trimmed = cccd.trim();
    if (!trimmed || !/^\d{12}$/.test(trimmed)) return;

    cccdDebounceRef.current = setTimeout(async () => {
      setCheckingCccd(true);
      try {
        const res = await checkCccd(trimmed);
        if (res.data.exists) {
          setErrors((prev) => ({ ...prev, cccd: MSG.cccdExists }));
        }
      } catch {
        // silent — validation will catch on submit
      } finally {
        setCheckingCccd(false);
      }
    }, 300);
  }, [cccd]);

  // --- Validate all fields ---
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // full_name
    const trimName = fullName.trim();
    if (!trimName) {
      errs.full_name = MSG.valRequired;
    } else if (trimName.length < 2) {
      errs.full_name = MSG.valNameMin;
    } else if (trimName.length > 200) {
      errs.full_name = MSG.valNameMax;
    }

    // cccd
    const trimCccd = cccd.trim();
    if (!trimCccd) {
      errs.cccd = MSG.valRequired;
    } else if (!/^\d{12}$/.test(trimCccd)) {
      errs.cccd = MSG.valCccd12;
    }

    // date_of_birth
    if (!dateOfBirth) {
      errs.date_of_birth = MSG.valRequired;
    }

    // gender
    if (!gender) {
      errs.gender = MSG.valSelectGender;
    }

    // address
    if (!address.trim()) {
      errs.address = MSG.valRequired;
    }

    // area_id
    if (!areaId) {
      errs.area_id = MSG.valSelectArea;
    }

    // phone (optional)
    const trimPhone = phone.trim();
    if (trimPhone && !/^0\d{9}$/.test(trimPhone)) {
      errs.phone = MSG.valPhoneFormat;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // --- Build payload ---
  const buildPayload = (): CreateSubjectPayload => {
    const payload: CreateSubjectPayload = {
      full_name: fullName.trim(),
      cccd: cccd.trim(),
      date_of_birth: dateOfBirth,
      gender,
      address: address.trim(),
      area_id: areaId,
    };

    const trimPhone = phone.trim();
    if (trimPhone) payload.phone = trimPhone;

    if (notes.trim()) payload.notes = notes.trim();

    // Family — only include if any field has a value
    const hasFamilyData =
      familyContactName.trim() ||
      familyContactPhone.trim() ||
      familyAddress.trim() ||
      familyNotes.trim();
    if (hasFamilyData) {
      payload.family = {};
      if (familyContactName.trim()) payload.family.contact_name = familyContactName.trim();
      if (familyContactPhone.trim()) payload.family.contact_phone = familyContactPhone.trim();
      if (familyAddress.trim()) payload.family.address = familyAddress.trim();
      if (familyNotes.trim()) payload.family.notes = familyNotes.trim();
    }

    // Legal — only include if any field has a value
    const hasLegalData =
      legalDocNo.trim() ||
      legalDate ||
      legalAuthority.trim() ||
      legalDuration.trim() ||
      legalReason.trim();
    if (hasLegalData) {
      payload.legal = {};
      if (legalDocNo.trim()) payload.legal.document_number = legalDocNo.trim();
      if (legalDate) payload.legal.document_date = legalDate;
      if (legalAuthority.trim()) payload.legal.authority = legalAuthority.trim();
      if (legalDuration.trim()) payload.legal.management_duration = legalDuration.trim();
      if (legalReason.trim()) payload.legal.reason = legalReason.trim();
    }

    return payload;
  };

  // --- Submit handler ---
  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = buildPayload();
      const res = await createSubject(payload);
      const data = res.data;
      showToast(MSG.createSuccess, 'success');
      navigate(`/ho-so/${data.id}`, { replace: true });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setErrors((prev) => ({ ...prev, cccd: MSG.cccdExists }));
      } else {
        showToast(MSG.createError, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: MSG.breadcrumbDashboard, href: '/dashboard' },
          { label: MSG.breadcrumbProfiles, href: '/ho-so' },
          { label: MSG.breadcrumbCreate },
        ]}
        title={MSG.createTitle}
      />

      {/* ===== Section 1: Thong tin nhan than ===== */}
      <div className="bg-white border border-zinc-200 rounded p-4 mb-3">
        <h2 className="text-[14px] font-semibold text-zinc-900 mb-3">{MSG.cardPersonal}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          {/* Ho va ten */}
          <div>
            <Label text={MSG.lblFullName} required />
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                clearError('full_name');
              }}
              placeholder={MSG.phFullName}
              className={`${inputBase} ${errors.full_name ? inputError : ''}`}
            />
            <FieldError message={errors.full_name} />
          </div>

          {/* CCCD */}
          <div>
            <Label text={MSG.lblCccd} required />
            <div className="relative">
              <input
                type="text"
                value={cccd}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setCccd(v);
                  clearError('cccd');
                }}
                onBlur={handleCccdBlur}
                placeholder={MSG.phCccd}
                maxLength={12}
                className={`${inputBase} font-mono ${errors.cccd ? inputError : ''}`}
              />
              {checkingCccd && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="h-3 w-3 border-2 border-red-700 border-t-transparent rounded-full animate-spin inline-block" />
                </span>
              )}
            </div>
            <FieldError message={errors.cccd} />
          </div>

          {/* Ngay sinh */}
          <div>
            <Label text={MSG.lblDob} required />
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => {
                setDateOfBirth(e.target.value);
                clearError('date_of_birth');
              }}
              className={`${inputBase} ${errors.date_of_birth ? inputError : ''}`}
            />
            <FieldError message={errors.date_of_birth} />
          </div>

          {/* Gioi tinh */}
          <div>
            <Label text={MSG.lblGender} required />
            <select
              value={gender}
              onChange={(e) => {
                setGender(e.target.value);
                clearError('gender');
              }}
              className={`${selectBase} ${errors.gender ? inputError : ''} ${!gender ? 'text-zinc-400' : ''}`}
            >
              <option value="" disabled>
                {MSG.phGender}
              </option>
              <option value="MALE">{MSG.genderMale}</option>
              <option value="FEMALE">{MSG.genderFemale}</option>
            </select>
            <FieldError message={errors.gender} />
          </div>

          {/* So dien thoai */}
          <div>
            <Label text={MSG.lblPhone} />
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearError('phone');
              }}
              placeholder={MSG.phPhone}
              className={`${inputBase} ${errors.phone ? inputError : ''}`}
            />
            <FieldError message={errors.phone} />
          </div>

          {/* Noi DKQL */}
          <div>
            {loadingAreas ? (
              <AreasSkeleton />
            ) : (
              <>
                <Label text={MSG.lblArea} required />
                <select
                  value={areaId}
                  onChange={(e) => {
                    setAreaId(e.target.value);
                    clearError('area_id');
                  }}
                  className={`${selectBase} ${errors.area_id ? inputError : ''} ${!areaId ? 'text-zinc-400' : ''}`}
                >
                  <option value="" disabled>
                    {MSG.phArea}
                  </option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.area_id} />
              </>
            )}
          </div>

          {/* Dia chi cu tru */}
          <div className="sm:col-span-2">
            <Label text={MSG.lblAddress} required />
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                clearError('address');
              }}
              placeholder={MSG.phAddress}
              className={`${inputBase} ${errors.address ? inputError : ''}`}
            />
            <FieldError message={errors.address} />
          </div>
        </div>
      </div>

      {/* ===== Section 2: Thong tin gia dinh ===== */}
      <div className="bg-white border border-zinc-200 rounded p-4 mb-3">
        <h2 className="text-[14px] font-semibold text-zinc-900 mb-3">{MSG.cardFamilyForm}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          {/* Ho ten cha/me */}
          <div>
            <Label text={MSG.lblFamilyContact} />
            <input
              type="text"
              value={familyContactName}
              onChange={(e) => setFamilyContactName(e.target.value)}
              placeholder={MSG.phFamilyName}
              className={inputBase}
            />
          </div>

          {/* SDT nguoi than */}
          <div>
            <Label text={MSG.lblFamilyPhone} />
            <input
              type="tel"
              value={familyContactPhone}
              onChange={(e) => setFamilyContactPhone(e.target.value)}
              placeholder={MSG.phFamilyPhone}
              className={inputBase}
            />
          </div>

          {/* Dia chi gia dinh */}
          <div className="sm:col-span-2">
            <Label text={MSG.lblFamilyAddr} />
            <input
              type="text"
              value={familyAddress}
              onChange={(e) => setFamilyAddress(e.target.value)}
              placeholder={MSG.phFamilyAddress}
              className={inputBase}
            />
          </div>

          {/* Ghi chu gia dinh */}
          <div className="sm:col-span-2">
            <Label text={MSG.lblFamilyNotesForm} />
            <textarea
              value={familyNotes}
              onChange={(e) => setFamilyNotes(e.target.value)}
              placeholder={MSG.phFamilyNotes}
              rows={3}
              className={textareaBase}
            />
          </div>
        </div>
      </div>

      {/* ===== Section 3: Thong tin phap ly ===== */}
      <div className="bg-white border border-zinc-200 rounded p-4 mb-3">
        <h2 className="text-[14px] font-semibold text-zinc-900 mb-3">{MSG.cardLegalForm}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          {/* So ban an */}
          <div>
            <Label text={MSG.lblLegalDocNo} />
            <input
              type="text"
              value={legalDocNo}
              onChange={(e) => setLegalDocNo(e.target.value)}
              placeholder={MSG.phLegalDocNo}
              className={`${inputBase} font-mono`}
            />
          </div>

          {/* Ngay ra QD */}
          <div>
            <Label text={MSG.lblLegalDate} />
            <input
              type="date"
              value={legalDate}
              onChange={(e) => setLegalDate(e.target.value)}
              className={inputBase}
            />
          </div>

          {/* Co quan ra QD */}
          <div>
            <Label text={MSG.lblLegalAuth} />
            <input
              type="text"
              value={legalAuthority}
              onChange={(e) => setLegalAuthority(e.target.value)}
              placeholder={MSG.phLegalAuth}
              className={inputBase}
            />
          </div>

          {/* Thoi han quan ly */}
          <div>
            <Label text={MSG.lblLegalDuration} />
            <input
              type="text"
              value={legalDuration}
              onChange={(e) => setLegalDuration(e.target.value)}
              placeholder={MSG.phLegalDuration}
              className={inputBase}
            />
          </div>

          {/* Toi danh / Ly do */}
          <div className="sm:col-span-2">
            <Label text={MSG.lblLegalReason} />
            <textarea
              value={legalReason}
              onChange={(e) => setLegalReason(e.target.value)}
              placeholder={MSG.phLegalReason}
              rows={3}
              className={textareaBase}
            />
          </div>
        </div>
      </div>

      {/* ===== Section 4: Ghi chu ===== */}
      <div className="bg-white border border-zinc-200 rounded p-4 mb-3">
        <h2 className="text-[14px] font-semibold text-zinc-900 mb-3">{MSG.cardNotes}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
          <div className="sm:col-span-2">
            <Label text={MSG.lblNotesForm} />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={MSG.phNotes}
              rows={4}
              className={textareaBase}
            />
          </div>
        </div>
      </div>

      {/* ===== Action bar ===== */}
      <div className="flex items-center justify-end gap-2 pt-1 pb-4">
        <Button
          variant="ghost"
          size="md"
          leftIcon={<X size={14} />}
          onClick={() => navigate(-1)}
          disabled={submitting}
        >
          {MSG.btnCancel}
        </Button>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Save size={14} />}
          loading={submitting}
          onClick={handleSubmit}
        >
          {submitting ? MSG.btnSaving : MSG.btnSave}
        </Button>
      </div>
    </>
  );
}

export default SubjectCreatePage;
