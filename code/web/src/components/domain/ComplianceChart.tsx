import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import { formatWeekday } from '@/utils/format-date';
import type { ComplianceTrendItem } from '@/types/dashboard.types';
import Skeleton from '@/components/ui/Skeleton';
import { getMessages } from '@/locales';

const MSG = getMessages().dashboard;

interface ComplianceChartProps {
  data: ComplianceTrendItem[];
  loading?: boolean;
}

function ComplianceChart({ data, loading = false }: ComplianceChartProps) {
  if (loading) {
    return <Skeleton className="h-[120px] w-full" />;
  }

  if (data.length === 0) {
    return (
      <div className="h-[120px] flex items-center justify-center text-[12px] text-zinc-400">
        {MSG.chartNoData}
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    label: formatWeekday(item.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={chartData} margin={{ top: 16, right: 4, bottom: 0, left: 4 }}>
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#71717a' }}
        />
        <YAxis hide domain={[0, 100]} />
        <Bar dataKey="rate" radius={[2, 2, 0, 0]} maxBarSize={32}>
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.rate >= 90 ? '#166534' : '#b91c1c'}
            />
          ))}
          <LabelList
            dataKey="rate"
            position="top"
            formatter={(v) => `${v}%`}
            style={{ fontSize: 11, fill: '#52525b' }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default ComplianceChart;
