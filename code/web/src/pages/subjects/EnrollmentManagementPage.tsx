import { useState, useEffect } from 'react';
import { ClipboardList, Inbox } from 'lucide-react';

import PageHeader from '@/components/navigation/PageHeader';
import StatCard from '@/components/data-display/StatCard';
import EmptyState from '@/components/data-display/EmptyState';

import { getMessages } from '@/locales';

const MSG = getMessages().subjects;

const tabs = [
  { key: 'enrollments' as const, label: MSG.tabEnrollList },
  { key: 'device-requests' as const, label: MSG.tabDeviceRequests },
];

function EnrollmentManagementPage() {
  const [activeTab, setActiveTab] = useState<'enrollments' | 'device-requests'>('enrollments');

  // --- Set document title ---
  useEffect(() => {
    document.title = MSG.enrollDocTitle;
  }, []);

  return (
    <>
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: MSG.breadcrumbDashboard, href: '/dashboard' },
          { label: MSG.breadcrumbProfiles, href: '/ho-so' },
          { label: MSG.breadcrumbEnrollment },
        ]}
        title={MSG.enrollTitle}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard
          label={MSG.statTotal}
          value={0}
          change="—"
          changeType="neutral"
        />
        <StatCard
          label={MSG.statPending}
          value={0}
          change="—"
          changeType="neutral"
        />
        <StatCard
          label={MSG.statCompleted}
          value={0}
          change="—"
          changeType="neutral"
        />
        <StatCard
          label={MSG.statDeviceChange}
          value={0}
          change="—"
          changeType="neutral"
          variant="alert"
        />
      </div>

      {/* Tab Bar */}
      <div className="border-b border-zinc-200 mb-4">
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-red-700 text-red-700'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-zinc-200 rounded">
        {activeTab === 'enrollments' && (
          <EmptyState
            icon={<ClipboardList size={48} />}
            title={MSG.enrollEmpty}
            subtitle="API enrollment chưa sẵn sàng"
          />
        )}
        {activeTab === 'device-requests' && (
          <EmptyState
            icon={<Inbox size={48} />}
            title={MSG.deviceReqEmpty}
            subtitle="API yêu cầu đổi thiết bị chưa sẵn sàng"
          />
        )}
      </div>
    </>
  );
}

export default EnrollmentManagementPage;
