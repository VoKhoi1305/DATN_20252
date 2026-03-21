import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

import PageHeader from '@/components/navigation/PageHeader';
import StatCard from '@/components/data-display/StatCard';
import DataCard from '@/components/data-display/DataCard';
import EmptyState from '@/components/data-display/EmptyState';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import ComplianceChart from '@/components/domain/ComplianceChart';

import {
  fetchDashboardSummary,
  fetchDashboardCharts,
  fetchRecentEvents,
  fetchOpenAlerts,
} from '@/api/dashboard.api';
import { formatEventTime, formatWeekday } from '@/utils/format-date';

import type {
  DashboardStats,
  DashboardEvent,
  DashboardAlert,
  ComplianceTrendItem,
  ChartItem,
  EventsPerDayItem,
} from '@/types/dashboard.types';

import { getMessages } from '@/locales';

const MSG = getMessages().dashboard;

// --- Chart colors ---
const PIE_COLORS = ['#b91c1c', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
const SEVERITY_COLORS: Record<string, string> = {
  KHAN_CAP: '#b91c1c',
  CAO: '#f97316',
  TRUNG_BINH: '#eab308',
  THAP: '#3b82f6',
};
const STATUS_COLORS: Record<string, string> = {
  KHOI_TAO: '#a1a1aa',
  ENROLLMENT: '#3b82f6',
  DANG_QUAN_LY: '#22c55e',
  TAI_HOA_NHAP: '#f97316',
  KET_THUC: '#71717a',
};

// --- Badge mappings per spec ---

const eventResultBadge: Record<string, { variant: 'done' | 'urgent' | 'warning' | 'processing' | 'pending'; label: string }> = {
  VALID: { variant: 'done', label: MSG.eventResultValid },
  VIOLATION: { variant: 'urgent', label: MSG.eventResultViolation },
  OVERDUE: { variant: 'warning', label: MSG.eventResultOverdue },
  PROCESSING: { variant: 'processing', label: MSG.eventResultProcessing },
  PENDING_VERIFICATION: { variant: 'pending', label: MSG.eventResultPending },
};

const alertSeverityBadge: Record<string, { variant: 'processing' | 'urgent' | 'warning' | 'info'; label: string }> = {
  KHAN_CAP: { variant: 'processing', label: MSG.alertSeverityKhanCap },
  CAO: { variant: 'urgent', label: MSG.alertSeverityCao },
  TRUNG_BINH: { variant: 'warning', label: MSG.alertSeverityTrungBinh },
  THAP: { variant: 'info', label: MSG.alertSeverityThap },
};

// --- Skeleton components ---

function TableSkeleton() {
  return (
    <div className="divide-y divide-zinc-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 h-9">
          <Skeleton className="h-3 w-[50px]" />
          <Skeleton className="h-3 w-[80px]" />
          <Skeleton className="h-3 w-[120px]" />
          <Skeleton className="h-3 w-[80px]" />
          <Skeleton className="h-3 w-[60px]" />
        </div>
      ))}
    </div>
  );
}

function ErrorSection({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
      <AlertTriangle size={24} className="text-zinc-300 mb-2" />
      <p className="text-[13px] text-zinc-500 mb-2">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} leftIcon={<RefreshCw size={12} />}>
        {MSG.retry}
      </Button>
    </div>
  );
}

// --- Main component ---

function DashboardPage() {
  const navigate = useNavigate();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complianceTrend, setComplianceTrend] = useState<ComplianceTrendItem[]>([]);
  const [scopeLabel, setScopeLabel] = useState('');
  const [recentEvents, setRecentEvents] = useState<DashboardEvent[]>([]);
  const [openAlerts, setOpenAlerts] = useState<DashboardAlert[]>([]);
  const [eventsByType, setEventsByType] = useState<ChartItem[]>([]);
  const [alertsBySeverity, setAlertsBySeverity] = useState<ChartItem[]>([]);
  const [subjectsByStatus, setSubjectsByStatus] = useState<ChartItem[]>([]);
  const [eventsPerDay, setEventsPerDay] = useState<EventsPerDayItem[]>([]);

  const [loading, setLoading] = useState({ stats: true, events: true, alerts: true, charts: true });
  const [error, setError] = useState<{ stats: string | null; events: string | null; alerts: string | null; charts: string | null }>({
    stats: null,
    events: null,
    alerts: null,
    charts: null,
  });

  // --- Data fetching ---

  const loadSummary = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, stats: true }));
      setError((prev) => ({ ...prev, stats: null }));
      const res = await fetchDashboardSummary();
      const data = res.data.data;
      setStats(data.stats);
      setComplianceTrend(data.complianceTrend);
      setScopeLabel(data.scope.label);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setError((prev) => ({ ...prev, stats: MSG.errForbidden }));
      } else if (status !== 401) {
        setError((prev) => ({ ...prev, stats: MSG.errLoadSummary }));
      }
    } finally {
      setLoading((prev) => ({ ...prev, stats: false }));
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, events: true }));
      setError((prev) => ({ ...prev, events: null }));
      const res = await fetchRecentEvents();
      setRecentEvents(res.data.data.data ?? res.data.data as unknown as DashboardEvent[]);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 401) {
        setError((prev) => ({ ...prev, events: MSG.errLoadEvents }));
      }
    } finally {
      setLoading((prev) => ({ ...prev, events: false }));
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, alerts: true }));
      setError((prev) => ({ ...prev, alerts: null }));
      const res = await fetchOpenAlerts();
      setOpenAlerts(res.data.data.data ?? res.data.data as unknown as DashboardAlert[]);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 401) {
        setError((prev) => ({ ...prev, alerts: MSG.errLoadAlerts }));
      }
    } finally {
      setLoading((prev) => ({ ...prev, alerts: false }));
    }
  }, []);

  const loadCharts = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, charts: true }));
      setError((prev) => ({ ...prev, charts: null }));
      const res = await fetchDashboardCharts();
      const data = res.data.data;
      setEventsByType(data.eventsByType);
      setAlertsBySeverity(data.alertsBySeverity);
      setSubjectsByStatus(data.subjectsByStatus);
      setEventsPerDay(data.eventsPerDay);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 401) {
        setError((prev) => ({ ...prev, charts: MSG.errLoadCharts }));
      }
    } finally {
      setLoading((prev) => ({ ...prev, charts: false }));
    }
  }, []);

  const loadAll = useCallback(() => {
    loadSummary();
    loadEvents();
    loadAlerts();
    loadCharts();
  }, [loadSummary, loadEvents, loadAlerts, loadCharts]);

  // Initial load + polling
  useEffect(() => {
    loadAll();

    pollingRef.current = setInterval(() => {
      loadSummary();
      loadAlerts();
      loadCharts();
    }, 60_000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadAll, loadSummary, loadAlerts, loadCharts]);

  // --- Stats row helpers ---

  function getSubjectsChangeType(): 'positive' | 'negative' | 'neutral' {
    if (!stats) return 'neutral';
    const val = parseFloat(stats.totalSubjectsChange);
    return val > 0 ? 'positive' : val < 0 ? 'negative' : 'neutral';
  }

  function getComplianceChangeType(): 'positive' | 'negative' | 'neutral' {
    if (!stats) return 'neutral';
    const val = parseFloat(stats.complianceRateChange);
    return val >= 0 ? 'positive' : 'negative';
  }

  function getCaseChangeType(): 'positive' | 'negative' | 'neutral' {
    if (!stats) return 'neutral';
    return stats.openCasesToday > 2 ? 'negative' : 'neutral';
  }

  // --- Render ---

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: MSG.breadcrumb }]}
        title={MSG.pageTitle}
        subtitle={scopeLabel || undefined}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard
          label={MSG.statTotalSubjects}
          value={stats?.totalSubjects ?? 0}
          change={
            stats
              ? `${stats.totalSubjectsChange.startsWith('-') ? '' : '↑ '}${stats.totalSubjectsChange} ${MSG.statComparedTo} ${stats.totalSubjectsChangePeriod}`
              : ''
          }
          changeType={getSubjectsChangeType()}
          loading={loading.stats}
        />
        <StatCard
          label={MSG.statComplianceRate}
          value={stats ? `${stats.complianceRate}%` : '0%'}
          change={
            stats
              ? `${parseFloat(stats.complianceRateChange) < 0 ? '↓' : '↑'} ${stats.complianceRateChange}% ${MSG.statComparedTo} ${stats.complianceRateChangePeriod}`
              : ''
          }
          changeType={getComplianceChangeType()}
          loading={loading.stats}
        />
        <StatCard
          label={MSG.statOpenAlerts}
          value={stats?.openAlerts ?? 0}
          change={stats ? `↑ ${stats.openAlertsToday} ${MSG.statToday}` : ''}
          changeType={stats && stats.openAlertsToday > 0 ? 'negative' : 'neutral'}
          variant="alert"
          onClick={() => navigate('/alerts')}
          loading={loading.stats}
        />
        <StatCard
          label={MSG.statOpenCases}
          value={stats?.openCases ?? 0}
          change={stats ? `${stats.openCasesToday} ${MSG.statNewToday}` : ''}
          changeType={getCaseChangeType()}
          variant="alert"
          onClick={() => navigate('/cases')}
          loading={loading.stats}
        />
      </div>

      {/* Error for stats */}
      {error.stats && !loading.stats && (
        <div className="mb-4">
          <ErrorSection message={error.stats} onRetry={loadSummary} />
        </div>
      )}

      {/* Event Table */}
      <div className="mb-4">
        <DataCard
          title={MSG.eventTitle}
          titleAction={
            <Button variant="ghost" size="sm" onClick={() => navigate('/events')}>
              {MSG.viewAll}
            </Button>
          }
          noPadding
        >
          {loading.events ? (
            <TableSkeleton />
          ) : error.events ? (
            <ErrorSection message={error.events} onRetry={loadEvents} />
          ) : recentEvents.length === 0 ? (
            <EmptyState
              icon={<Activity size={32} />}
              title={MSG.eventEmptyTitle}
              subtitle={MSG.eventEmptySubtitle}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-100 text-[11px] text-zinc-500 uppercase tracking-wider">
                    <th className="px-3 py-1.5 font-medium w-[90px]">{MSG.eventColTime}</th>
                    <th className="px-3 py-1.5 font-medium w-[110px]">{MSG.eventColCode}</th>
                    <th className="px-3 py-1.5 font-medium">{MSG.eventColSubject}</th>
                    <th className="px-3 py-1.5 font-medium w-[120px]">{MSG.eventColType}</th>
                    <th className="px-3 py-1.5 font-medium w-[100px]">{MSG.eventColResult}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {recentEvents.map((evt) => {
                    const badge = eventResultBadge[evt.result] ?? { variant: 'neutral' as const, label: evt.resultLabel };
                    return (
                      <tr key={evt.id} className="h-9 hover:bg-zinc-50 transition-colors">
                        <td className="px-3 text-[12px] text-zinc-500 tabular-nums">
                          {formatEventTime(evt.timestamp)}
                        </td>
                        <td className="px-3">
                          <button
                            onClick={() => navigate(`/events/${evt.id}`)}
                            className="font-mono text-[12px] text-zinc-600 tracking-wide hover:text-red-700 hover:underline"
                          >
                            {evt.code}
                          </button>
                        </td>
                        <td className="px-3">
                          <button
                            onClick={() => navigate(`/ho-so/${evt.subject.id}`)}
                            className="text-[13px] text-red-700 hover:text-red-800 hover:underline cursor-pointer"
                          >
                            {evt.subject.name}
                          </button>
                        </td>
                        <td className="px-3 text-[13px] text-zinc-900">{evt.typeLabel}</td>
                        <td className="px-3">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DataCard>
      </div>

      {/* Alert Table */}
      <div className="mb-4">
        <DataCard
          title={MSG.alertTitle}
          titleAction={
            <Button variant="ghost" size="sm" onClick={() => navigate('/alerts')}>
              {MSG.viewAll}
            </Button>
          }
          noPadding
        >
          {loading.alerts ? (
            <TableSkeleton />
          ) : error.alerts ? (
            <ErrorSection message={error.alerts} onRetry={loadAlerts} />
          ) : openAlerts.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle size={32} />}
              title={MSG.alertEmptyTitle}
              subtitle={MSG.alertEmptySubtitle}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-100 text-[11px] text-zinc-500 uppercase tracking-wider">
                    <th className="px-3 py-1.5 font-medium w-[110px]">{MSG.alertColCode}</th>
                    <th className="px-3 py-1.5 font-medium">{MSG.alertColSubject}</th>
                    <th className="px-3 py-1.5 font-medium w-[140px]">{MSG.alertColType}</th>
                    <th className="px-3 py-1.5 font-medium w-[100px]">{MSG.alertColSeverity}</th>
                    <th className="px-3 py-1.5 font-medium w-[90px]">{MSG.alertColTime}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {openAlerts.map((alt) => {
                    const badge = alertSeverityBadge[alt.severity] ?? { variant: 'info' as const, label: alt.severityLabel };
                    return (
                      <tr key={alt.id} className="h-9 hover:bg-zinc-50 transition-colors">
                        <td className="px-3">
                          <button
                            onClick={() => navigate(`/alerts/${alt.id}`)}
                            className="font-mono text-[12px] text-zinc-600 tracking-wide hover:text-red-700 hover:underline"
                          >
                            {alt.code}
                          </button>
                        </td>
                        <td className="px-3">
                          <button
                            onClick={() => navigate(`/ho-so/${alt.subject.id}`)}
                            className="text-[13px] text-red-700 hover:text-red-800 hover:underline cursor-pointer"
                          >
                            {alt.subject.name}
                          </button>
                        </td>
                        <td className="px-3 text-[13px] text-zinc-900">{alt.typeLabel}</td>
                        <td className="px-3">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="px-3 text-[12px] text-zinc-500 tabular-nums">
                          {formatEventTime(alt.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DataCard>
      </div>

      {/* Charts Row: Events per Day + Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <DataCard title={MSG.chartEventsPerDay}>
          {loading.charts ? (
            <Skeleton className="h-[200px] w-full" />
          ) : error.charts ? (
            <ErrorSection message={error.charts} onRetry={loadCharts} />
          ) : eventsPerDay.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-[12px] text-zinc-400">{MSG.chartNoData}</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={eventsPerDay.map((d) => ({ ...d, label: formatWeekday(d.date) }))} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e4e4e7' }}
                  formatter={(value: unknown, name: unknown) => [String(value), name === 'success' ? MSG.chartSuccess : name === 'failed' ? MSG.chartFailed : MSG.chartTotal]}
                />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value: string) => (value === 'success' ? MSG.chartSuccess : value === 'failed' ? MSG.chartFailed : MSG.chartTotal)}
                />
                <Bar dataKey="success" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} maxBarSize={28} />
                <Bar dataKey="failed" stackId="a" fill="#b91c1c" radius={[2, 2, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DataCard>

        <DataCard title={MSG.chartTitle}>
          <ComplianceChart data={complianceTrend} loading={loading.stats} />
        </DataCard>
      </div>

      {/* Charts Row: Pie charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Subject by Status */}
        <DataCard title={MSG.chartSubjectsByStatus}>
          {loading.charts ? (
            <Skeleton className="h-[200px] w-full" />
          ) : subjectsByStatus.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-[12px] text-zinc-400">{MSG.chartNoData}</div>
          ) : (
            <div className="flex items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={subjectsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {subjectsByStatus.map((entry, index) => (
                      <Cell key={index} fill={STATUS_COLORS[entry.key ?? ''] ?? PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e4e4e7' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 min-w-[110px]">
                {subjectsByStatus.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px]">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[item.key ?? ''] ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-zinc-600 truncate">{item.name}</span>
                    <span className="text-zinc-900 font-medium ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DataCard>

        {/* Events by Type */}
        <DataCard title={MSG.chartEventsByType}>
          {loading.charts ? (
            <Skeleton className="h-[200px] w-full" />
          ) : eventsByType.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-[12px] text-zinc-400">{MSG.chartNoData}</div>
          ) : (
            <div className="flex items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={eventsByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {eventsByType.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e4e4e7' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 min-w-[110px]">
                {eventsByType.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px]">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-zinc-600 truncate">{item.name}</span>
                    <span className="text-zinc-900 font-medium ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DataCard>

        {/* Alerts by Severity */}
        <DataCard title={MSG.chartAlertsBySeverity}>
          {loading.charts ? (
            <Skeleton className="h-[200px] w-full" />
          ) : alertsBySeverity.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-[12px] text-zinc-400">{MSG.chartNoData}</div>
          ) : (
            <div className="flex items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={alertsBySeverity}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {alertsBySeverity.map((entry, index) => (
                      <Cell key={index} fill={SEVERITY_COLORS[entry.key ?? ''] ?? PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e4e4e7' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 min-w-[110px]">
                {alertsBySeverity.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px]">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: SEVERITY_COLORS[item.key ?? ''] ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-zinc-600 truncate">{item.name}</span>
                    <span className="text-zinc-900 font-medium ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DataCard>
      </div>
    </>
  );
}

export default DashboardPage;
