import React from 'react';

interface TrendPoint {
  label: string;
  value: number | null;
}

interface TrendChartProps {
  data: TrendPoint[];
  formatValue?: (v: number) => string;
  barClassName?: string;
  emptyLabel?: string;
}

// Small dependency-free bar chart for the dashboard's trend cards. Null
// values (a day/month with no records) render as a faint placeholder tick
// rather than a misleading zero-height bar.
const TrendChart: React.FC<TrendChartProps> = ({
  data,
  formatValue = (v) => String(v),
  barClassName = 'bg-primary',
  emptyLabel = 'No data yet',
}) => {
  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  if (values.length === 0) {
    return <p className="text-sm text-muted-foreground italic py-6 text-center">{emptyLabel}</p>;
  }
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((point, i) => {
        const heightPct = point.value !== null ? Math.max((point.value / max) * 100, 4) : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
            <div
              className={`w-full rounded-sm transition-all ${point.value !== null ? barClassName : 'bg-muted-foreground/15'}`}
              style={{ height: point.value !== null ? `${heightPct}%` : '3px' }}
            />
            <div className="absolute bottom-full mb-1 hidden group-hover:block whitespace-nowrap px-2 py-1 text-xs rounded bg-popover text-popover-foreground border shadow-md z-10">
              {point.label}: {point.value !== null ? formatValue(point.value) : 'no data'}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TrendChart;
