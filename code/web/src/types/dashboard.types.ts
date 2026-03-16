export interface DashboardStats {
  totalSubjects: number;
  totalSubjectsChange: string;
  totalSubjectsChangePeriod: string;
  complianceRate: number;
  complianceRateChange: string;
  complianceRateChangePeriod: string;
  openAlerts: number;
  openAlertsToday: number;
  openCases: number;
  openCasesToday: number;
}

export interface ComplianceTrendItem {
  date: string;
  rate: number;
}

export interface DashboardScope {
  label: string;
  level: string;
  id: string;
}

export interface DashboardSummaryResponse {
  stats: DashboardStats;
  complianceTrend: ComplianceTrendItem[];
  scope: DashboardScope;
}

export interface DashboardEventSubject {
  id: string;
  name: string;
  code: string;
}

export interface DashboardEvent {
  id: string;
  code: string;
  timestamp: string;
  subject: DashboardEventSubject;
  type: string;
  typeLabel: string;
  result: string;
  resultLabel: string;
}

export interface DashboardAlert {
  id: string;
  code: string;
  subject: DashboardEventSubject;
  type: string;
  typeLabel: string;
  severity: string;
  severityLabel: string;
  timestamp: string;
}
