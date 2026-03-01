'use client';

import { type ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
  sparkline?: { v: number }[];
}

export function KpiCard({ title, value, change, icon, sparkline }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">{title}</span>
        {icon && <span className="text-zinc-600">{icon}</span>}
      </div>

      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-zinc-100">{value}</p>
          {change !== undefined && (
            <p
              className={`mt-1 text-xs font-medium ${
                change >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {change >= 0 ? '+' : ''}
              {change.toFixed(1)}%
            </p>
          )}
        </div>

        {sparkline && sparkline.length > 1 && (
          <MiniSparkline data={sparkline} />
        )}
      </div>
    </div>
  );
}

function MiniSparkline({ data }: { data: { v: number }[] }) {
  const values = data.map((d) => d.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 60;
  const h = 24;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  const trending = values[values.length - 1] >= values[0];

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={trending ? '#10b981' : '#ef4444'}
        strokeWidth="1.5"
      />
    </svg>
  );
}
