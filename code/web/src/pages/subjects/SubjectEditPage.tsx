import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import PageHeader from '@/components/navigation/PageHeader';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

import { fetchSubjectDetail, fetchAreas, updateSubject } from '@/api/subjects.api';
import { getMessages } from '@/locales';

import type { SubjectDetail, AreaOption, UpdateSubjectPayload } from '@/types/subject.types';

const MSG = getMessages().subjects;

// --- Form state shape ---
interface FormState {
  full_name: string;
  cccd: string;
  date_of_birth: string;
  gender: string;
  ethnicity: string;
  address: string;
  permanent_address: string;
  phone: string;
  area_id: string;
  family_contact_name: string;
  family_contact_phone: string;
  family_address: string;
  family_notes: string;
  legal_document_number: string;
  legal_document_date: string;
  legal_authority: string;
  legal_management_duration: string;
  legal_reason: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  full_name: '',
  cccd: '',
  date_of_birth: '',
  gender: '',
  ethnicity: '',
  address: '',
  permanent_address: '',
  phone: '',
  area_id: '',
  family_contact_name: '',
  family_contact_phone: '',
  family_address: '',
  family_notes: '',
  legal_document_number: '',
  legal_document_date: '',
  legal_authority: '',
  legal_management_duration: '',
  legal_reason: '',
  notes: '',
};

// --- Validation errors ---
interface FormErrors {
  full_name?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  phone?: string;
  area_id?: string;
}

// --- Helpers ---
function mapDetailToForm(detail: SubjectDetail): FormState {
  return {
    full_name: detail.full_name ?? '',
    cccd: detail.cccd ?? '',
    date_of_birth: detail.date_of_birth ? detail.date_of_birth.slice(0, 10) : '',
    gender: detail.gender ?? '',
    ethnicity: detail.ethnicity ?? '',
    address: detail.address ?? '',
    permanent_address: detail.permanent_address ?? '',
    phone: detail.phone ?? '',
    area_id: detail.area?.id ?? '',
    family_contact_name: detail.family?.father_name ?? detail.family?.mother_name ?? detail.family?.spouse_name ?? '',
    family_contact_phone: '',
    family_address: '',
    family_notes: detail.family?.notes ?? '',
    legal_document_number: detail.legal?.decision_number ?? '',
    legal_document_date: detail.legal?.decision_date ? detail.legal.decision_date.slice(0, 10) : '',
    legal_authority: detail.legal?.issuing_authority ?? '',
    legal_management_duration: '',
    legal_reason: '',
    notes: detail.notes ?? '',
  };
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.full_name.trim()) {
    errors.full_name = MSG.valRequired;
  } else if (form.full_name.trim().length < 2) {
    errors.full_name = MSG.valNameMin;
  } else if (form.full_name.trim().length > 200) {
    errors.full_name = MSG.valNameMax;
  }

  if (!form.date_of_birth) {
    errors.date_of_birth = MSG.valRequired;
  }

  if (!form.gender) {
    errors.gender = MSG.valSelectGender;
  }

  if (!form.address.trim()) {
    errors.address = MSG.valRequired;
  }

  if (form.phone && !/^0\d{9}$/.test(form.phone.trim())) {
    errors.phone = MSG.valPhoneFormat;
  }

  if (!form.area_id) {
    errors.area_id = MSG.valSelectArea;
  }

  return errors;
}

function buildPayload(original: FormState, current: FormState): UpdateSubjectPayload | null {
  const payload: UpdateSubjectPayload = {};
  let hasChange = false;

  // Simple top-level fields
  if (current.full_name !== original.full_name) {
    payload.full_name = current.full_name.trim();
    hasChange = true;
  }
  if (current.date_of_birth !== original.date_of_birth) {
    payload.date_of_birth = current.date_of_birth;
    hasChange = true;
  }
  if (current.gender !== original.gender) {
    payload.gender = current.gender;
    hasChange = true;
  }
  if (current.address !== original.address) {
    payload.address = current.address.trim();
    hasChange = true;
  }
  if (current.phone !== original.phone) {
    payload.phone = current.phone.trim() || undefined;
    hasChange = true;
  }
  if (current.area_id !== original.area_id) {
    payload.area_id = current.area_id;
    hasChange = true;
  }
  if (current.ethnicity !== original.ethnicity) {
    payload.ethnicity = current.ethnicity.trim() || undefined;
    hasChange = true;
  }
  if (current.permanent_address !== original.permanent_address) {
    payload.permanent_address = current.permanent_address.trim() || undefined;
    hasChange = true;
  }
  if (current.notes !== original.notes) {
    payload.notes = current.notes.trim() || undefined;
    hasChange = true;
  }

  // Family section — send if any family field changed
  const familyChanged =
    current.family_contact_name !== original.family_contact_name ||
    current.family_contact_phone !== original.family_contact_phone ||
    current.family_address !== original.family_address ||
    current.family_notes !== original.family_notes;

  if (familyChanged) {
    payload.family = {
      contact_name: current.family_contact_name.trim() || undefined,
      contact_phone: current.family_contact_phone.trim() || undefined,
      address: current.family_address.trim() || undefined,
      notes: current.family_notes.trim() || undefined,
    };
    hasChange = true;
  }

  // Legal section — send if any legal field changed
  const legalChanged =
    current.legal_document_number !== original.legal_document_number ||
    current.legal_document_date !== original.legal_document_date ||
    current.legal_authority !== original.legal_authority ||
    current.legal_management_duration !== original.legal_management_duration ||
    current.legal_reason !== original.legal_reason;

  if (legalChanged) {
    payload.legal = {
      document_number: current.legal_document_number.trim() || undefined,
      document_date: current.legal_document_date || undefined,
      authority: current.legal_authority.trim() || undefined,
      management_duration: current.legal_management_duration.trim() || undefined,
      reason: current.legal_reason.trim() || undefined,
    };
    hasChange = true;
  }

  return hasChange ? payload : null;
}

// --- Skeleton loader for form ---
function FormSkeleton() {
  return (
    <div className="space-y-4">
      {/* Card 1 - Personal */}
      <div className="bg-white border border-zinc-200 rounded p-4 space-y-4">
        <Skeleton className="h-5 w-[160px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>
      {/* Card 2 - Family */}
      <div className="bg-white border border-zinc-200 rounded p-4 space-y-4">
        <Skeleton className="h-5 w-[180px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
      {/* Card 3 - Legal */}
      <div className="bg-white border border-zinc-200 rounded p-4 space-y-4">
        <Skeleton className="h-5 w-[160px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
      {/* Card 4 - Notes */}
      <div className="bg-white border border-zinc-200 rounded p-4 space-y-4">
        <Skeleton className="h-5 w-[100px]" />
        <Skeleton className="h-20 w-full" />
      </div>
      {/* Action bar */}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-[90px]" />
        <Skeleton className="h-9 w-[130px]" />
      </div>
    </div>
  );
}

// --- Input style constants ---
const INPUT_CLASS =
  'w-full h-9 px-3 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700';
const INPUT_DISABLED_CLASS =
  'w-full h-9 px-3 text-[13px] border border-zinc-200 rounded bg-zinc-100 text-zinc-900 cursor-not-allowed focus:outline-none';
const SELECT_CLASS =
  'w-full h-9 px-3 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700';
const TEXTAREA_CLASS =
  'w-full px-3 py-2 text-[13px] border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-700/20 focus:border-red-700 resize-none';

// --- Main component ---
function SubjectEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<SubjectDetail | null>(null);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  // Track original form values to detect dirty fields
  const originalRef = useRef<FormState>(EMPTY_FORM);

  // --- Set document title ---
  useEffect(() => {
    document.title = MSG.editDocTitle;
  }, []);

  // --- Load data on mount ---
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [detailRes, areasRes] = await Promise.all([
          fetchSubjectDetail(id!),
          fetchAreas(),
        ]);

        if (cancelled) return;

        const subjectDetail = detailRes.data;
        setDetail(subjectDetail);

        // If status is ENDED, redirect to detail page
        if (subjectDetail.status === 'ENDED') {
          showToast('Hồ sơ đã kết thúc', 'info');
          navigate(`/ho-so/${id}`, { replace: true });
          return;
        }

        const areaList = areasRes.data?.data ?? (areasRes.data as unknown as AreaOption[]);
        setAreas(Array.isArray(areaList) ? areaList : []);

        const formValues = mapDetailToForm(subjectDetail);
        setForm(formValues);
        originalRef.current = formValues;
      } catch {
        showToast(MSG.errLoad, 'error');
        navigate(`/ho-so/${id}`, { replace: true });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [id, navigate, showToast]);

  // --- Field change handler ---
  const handleChange = useCallback(
    (field: keyof FormState) => (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      // Clear error for this field on change
      setErrors((prev) => {
        if (field in prev) {
          const next = { ...prev };
          delete next[field as keyof FormErrors];
          return next;
        }
        return prev;
      });
    },
    [],
  );

  // --- Submit ---
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!id) return;

      // Validate
      const validationErrors = validate(form);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Build diff payload
      const payload = buildPayload(originalRef.current, form);
      if (!payload) {
        showToast(MSG.noChanges, 'info');
        return;
      }

      setSubmitting(true);
      try {
        await updateSubject(id, payload);
        showToast(MSG.updateSuccess, 'success');
        navigate(`/ho-so/${id}`, { replace: true });
      } catch {
        showToast(MSG.updateError, 'error');
      } finally {
        setSubmitting(false);
      }
    },
    [id, form, navigate, showToast],
  );

  // --- Area search/filter state ---
  const [areaSearch, setAreaSearch] = useState('');
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  const filteredAreas = areaSearch.trim()
    ? areas.filter((a) => a.name.toLowerCase().includes(areaSearch.toLowerCase()))
    : areas;

  const selectedAreaName = areas.find((a) => a.id === form.area_id)?.name ?? '';

  // Close area dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) {
        setAreaDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Render ---
  return (
    <>
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: MSG.breadcrumbDashboard, href: '/dashboard' },
          { label: MSG.breadcrumbProfiles, href: '/ho-so' },
          ...(detail
            ? [{ label: detail.ma_ho_so, href: `/ho-so/${id}` }]
            : []),
          { label: MSG.breadcrumbEdit },
        ]}
        title={MSG.editTitle}
      />

      {loading ? (
        <FormSkeleton />
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            {/* ===== Card 1: Personal Information ===== */}
            <div className="bg-white border border-zinc-200 rounded">
              <div className="px-4 py-3 border-b border-zinc-100">
                <h2 className="text-[14px] font-semibold text-zinc-900">
                  {MSG.cardPersonal}
                </h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full name */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblFullName} <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={handleChange('full_name')}
                      placeholder={MSG.phFullName}
                      className={INPUT_CLASS}
                    />
                    {errors.full_name && (
                      <p className="mt-1 text-[12px] text-red-600">{errors.full_name}</p>
                    )}
                  </div>

                  {/* CCCD - disabled */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblCccd}
                    </label>
                    <input
                      type="text"
                      value={form.cccd}
                      disabled
                      className={INPUT_DISABLED_CLASS}
                    />
                    <p className="mt-1 text-[12px] text-zinc-400">{MSG.cccdReadonly}</p>
                  </div>

                  {/* Date of birth */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblDob} <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.date_of_birth}
                      onChange={handleChange('date_of_birth')}
                      className={INPUT_CLASS}
                    />
                    {errors.date_of_birth && (
                      <p className="mt-1 text-[12px] text-red-600">{errors.date_of_birth}</p>
                    )}
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblGender} <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={form.gender}
                      onChange={handleChange('gender')}
                      className={SELECT_CLASS}
                    >
                      <option value="">{MSG.phGender}</option>
                      <option value="MALE">{MSG.genderMale}</option>
                      <option value="FEMALE">{MSG.genderFemale}</option>
                    </select>
                    {errors.gender && (
                      <p className="mt-1 text-[12px] text-red-600">{errors.gender}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblPhone}
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={handleChange('phone')}
                      placeholder={MSG.phPhone}
                      className={INPUT_CLASS}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-[12px] text-red-600">{errors.phone}</p>
                    )}
                  </div>

                  {/* Area */}
                  <div ref={areaRef}>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblArea} <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={areaDropdownOpen ? areaSearch : selectedAreaName}
                        onChange={(e) => {
                          setAreaSearch(e.target.value);
                          if (!areaDropdownOpen) setAreaDropdownOpen(true);
                        }}
                        onFocus={() => {
                          setAreaDropdownOpen(true);
                          setAreaSearch('');
                        }}
                        placeholder={MSG.phArea}
                        className={INPUT_CLASS}
                        autoComplete="off"
                      />
                      {areaDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full max-h-[200px] overflow-y-auto bg-white border border-zinc-200 rounded shadow-lg">
                          {filteredAreas.length === 0 ? (
                            <div className="px-3 py-2 text-[13px] text-zinc-400">
                              Không tìm thấy
                            </div>
                          ) : (
                            filteredAreas.map((area) => (
                              <button
                                key={area.id}
                                type="button"
                                onClick={() => {
                                  setForm((prev) => ({ ...prev, area_id: area.id }));
                                  setAreaSearch('');
                                  setAreaDropdownOpen(false);
                                  setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.area_id;
                                    return next;
                                  });
                                }}
                                className={`w-full text-left px-3 py-2 text-[13px] hover:bg-zinc-50 transition-colors ${
                                  area.id === form.area_id
                                    ? 'bg-red-50 text-red-700 font-medium'
                                    : 'text-zinc-900'
                                }`}
                              >
                                {area.name}
                                <span className="ml-2 text-[11px] text-zinc-400">
                                  {area.level}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {errors.area_id && (
                      <p className="mt-1 text-[12px] text-red-600">{errors.area_id}</p>
                    )}
                  </div>
                </div>

                {/* Address - full width */}
                <div className="mt-4">
                  <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                    {MSG.lblAddress} <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={handleChange('address')}
                    placeholder={MSG.phAddress}
                    className={INPUT_CLASS}
                  />
                  {errors.address && (
                    <p className="mt-1 text-[12px] text-red-600">{errors.address}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ===== Card 2: Family Information ===== */}
            <div className="bg-white border border-zinc-200 rounded">
              <div className="px-4 py-3 border-b border-zinc-100">
                <h2 className="text-[14px] font-semibold text-zinc-900">
                  {MSG.cardFamilyForm}
                </h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Family contact name */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblFamilyContact}
                    </label>
                    <input
                      type="text"
                      value={form.family_contact_name}
                      onChange={handleChange('family_contact_name')}
                      placeholder={MSG.phFamilyName}
                      className={INPUT_CLASS}
                    />
                  </div>

                  {/* Family phone */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblFamilyPhone}
                    </label>
                    <input
                      type="tel"
                      value={form.family_contact_phone}
                      onChange={handleChange('family_contact_phone')}
                      placeholder={MSG.phFamilyPhone}
                      className={INPUT_CLASS}
                    />
                  </div>

                  {/* Family address */}
                  <div className="md:col-span-2">
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblFamilyAddr}
                    </label>
                    <input
                      type="text"
                      value={form.family_address}
                      onChange={handleChange('family_address')}
                      placeholder={MSG.phFamilyAddress}
                      className={INPUT_CLASS}
                    />
                  </div>

                  {/* Family notes */}
                  <div className="md:col-span-2">
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblFamilyNotesForm}
                    </label>
                    <textarea
                      value={form.family_notes}
                      onChange={handleChange('family_notes')}
                      placeholder={MSG.phFamilyNotes}
                      rows={3}
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Card 3: Legal Information ===== */}
            <div className="bg-white border border-zinc-200 rounded">
              <div className="px-4 py-3 border-b border-zinc-100">
                <h2 className="text-[14px] font-semibold text-zinc-900">
                  {MSG.cardLegalForm}
                </h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Document number */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblLegalDocNo}
                    </label>
                    <input
                      type="text"
                      value={form.legal_document_number}
                      onChange={handleChange('legal_document_number')}
                      placeholder={MSG.phLegalDocNo}
                      className={INPUT_CLASS}
                    />
                  </div>

                  {/* Document date */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblLegalDate}
                    </label>
                    <input
                      type="date"
                      value={form.legal_document_date}
                      onChange={handleChange('legal_document_date')}
                      className={INPUT_CLASS}
                    />
                  </div>

                  {/* Authority */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblLegalAuth}
                    </label>
                    <input
                      type="text"
                      value={form.legal_authority}
                      onChange={handleChange('legal_authority')}
                      placeholder={MSG.phLegalAuth}
                      className={INPUT_CLASS}
                    />
                  </div>

                  {/* Management duration */}
                  <div>
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblLegalDuration}
                    </label>
                    <input
                      type="text"
                      value={form.legal_management_duration}
                      onChange={handleChange('legal_management_duration')}
                      placeholder={MSG.phLegalDuration}
                      className={INPUT_CLASS}
                    />
                  </div>

                  {/* Reason */}
                  <div className="md:col-span-2">
                    <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                      {MSG.lblLegalReason}
                    </label>
                    <textarea
                      value={form.legal_reason}
                      onChange={handleChange('legal_reason')}
                      placeholder={MSG.phLegalReason}
                      rows={3}
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Card 4: Notes ===== */}
            <div className="bg-white border border-zinc-200 rounded">
              <div className="px-4 py-3 border-b border-zinc-100">
                <h2 className="text-[14px] font-semibold text-zinc-900">
                  {MSG.cardNotes}
                </h2>
              </div>
              <div className="p-4">
                <label className="block text-[13px] font-medium text-zinc-700 mb-1">
                  {MSG.lblNotesForm}
                </label>
                <textarea
                  value={form.notes}
                  onChange={handleChange('notes')}
                  placeholder={MSG.phNotes}
                  rows={4}
                  className={TEXTAREA_CLASS}
                />
              </div>
            </div>

            {/* ===== Action Bar ===== */}
            <div className="flex justify-end gap-2 pb-6">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => navigate(`/ho-so/${id}`)}
              >
                {MSG.btnCancel}
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                loading={submitting}
                disabled={submitting}
              >
                {submitting ? MSG.btnUpdating : MSG.btnUpdate}
              </Button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}

export default SubjectEditPage;
