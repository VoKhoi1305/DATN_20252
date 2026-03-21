export type SubjectStatus = 'INIT' | 'ENROLLED' | 'ACTIVE' | 'REINTEGRATE' | 'ENDED';

export interface SubjectListItem {
  id: string;
  ma_ho_so: string;
  full_name: string;
  cccd: string;
  date_of_birth: string;
  address: string;
  phone: string | null;
  status: SubjectStatus;
  scenario_id: string | null;
  scenario_name: string | null;
  area_name: string | null;
  officer_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubjectListResponse {
  data: SubjectListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ScenarioOption {
  id: string;
  code: string;
  name: string;
}

export interface ScenarioListResponse {
  data: ScenarioOption[];
}

export interface SubjectListParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  q?: string;
  status?: string;
  scenario_id?: string;
  from?: string;
  to?: string;
  scope?: 'local' | 'all';
  advanced?: string;
  conditions?: string;
}

// --- SCR-021: Subject Detail ---

export interface SubjectDetail {
  id: string;
  ma_ho_so: string;
  full_name: string;
  cccd: string;
  date_of_birth: string;
  gender: string;
  ethnicity: string | null;
  address: string;
  permanent_address: string | null;
  phone: string | null;
  photo_url: string | null;
  area: { id: string; name: string; level: string } | null;
  status: SubjectStatus;
  lifecycle: string;
  compliance_rate: number | null;
  enrollment_date: string | null;
  notes: string | null;
  custom_fields: Record<string, unknown>;
  officer: { id: string; full_name: string } | null;
  scenario: {
    id: string;
    name: string;
    checkin_frequency: string;
    assigned_at: string;
  } | null;
  family: {
    father_name: string | null;
    mother_name: string | null;
    spouse_name: string | null;
    dependents: number;
    notes: string | null;
  } | null;
  legal: {
    decision_number: string | null;
    decision_date: string | null;
    management_type: string;
    start_date: string;
    end_date: string | null;
    issuing_authority: string | null;
    notes: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEntry {
  id: string;
  code: string;
  source: 'EVENT' | 'ALERT';
  type: string;
  detail: string;
  created_at: string;
}

export interface TimelineResponse {
  data: TimelineEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface DeviceInfo {
  id: string;
  device_id: string;
  device_model: string | null;
  os_version: string | null;
  status: string;
  enrolled_at: string;
  replaced_at: string | null;
}

export interface DevicesResponse {
  current: DeviceInfo | null;
  history: DeviceInfo[];
}

export interface DocumentInfo {
  id: string;
  original_name: string;
  stored_path: string;
  mime_type: string;
  size: number;
  file_type: string;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface DocumentsResponse {
  data: DocumentInfo[];
}

// --- SCR-022/023: Create/Edit Subject ---

export interface AreaOption {
  id: string;
  name: string;
  level: string;
}

export interface CreateSubjectPayload {
  full_name: string;
  cccd: string;
  date_of_birth: string;
  gender: string;
  address: string;
  phone?: string;
  area_id: string;
  ethnicity?: string;
  permanent_address?: string;
  notes?: string;
  family?: {
    contact_name?: string;
    contact_phone?: string;
    address?: string;
    notes?: string;
  };
  legal?: {
    document_number?: string;
    document_date?: string;
    authority?: string;
    management_duration?: string;
    start_date?: string;
    end_date?: string;
    reason?: string;
  };
}

export interface UpdateSubjectPayload {
  full_name?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  phone?: string;
  area_id?: string;
  ethnicity?: string;
  permanent_address?: string;
  notes?: string;
  family?: {
    contact_name?: string;
    contact_phone?: string;
    address?: string;
    notes?: string;
  };
  legal?: {
    document_number?: string;
    document_date?: string;
    authority?: string;
    management_duration?: string;
    start_date?: string;
    end_date?: string;
    reason?: string;
  };
}

export interface CccdCheckResponse {
  exists: boolean;
  subject_id?: string;
  full_name?: string;
}

export interface CreateSubjectResponse {
  id: string;
  ma_ho_so: string;
  full_name: string;
  status: string;
  created_at: string;
}
