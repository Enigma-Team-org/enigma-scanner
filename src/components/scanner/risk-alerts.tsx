'use client';

import { useAgents } from '@/hooks/use-agents';

export function RiskAlerts() {
  const { data: flagged } = useAgents({
    status: 'FLAGGED',
    limit: 5,
  });

  const { data: suspended } = useAgents({
    status: 'SUSPENDED',
    limit: 5,
  });

  const alerts = [
    ...(flagged?.agents || []).map((a) => ({
      address: a.address,
      name: a.name,
      severity: 'warning' as const,
      reason: 'Flagged for review',
    })),
    ...(suspended?.agents || []).map((a) => ({
      address: a.address,
      name: a.name,
      severity: 'critical' as const,
      reason: 'Suspended',
    })),
  ];

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="mb-3 text-sm font-medium text-zinc-400">Risk Alerts</h3>
        <p className="text-xs text-zinc-600">No active alerts</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="mb-3 text-sm font-medium text-zinc-400">
        Risk Alerts ({alerts.length})
      </h3>
      <ul className="space-y-2">
        {alerts.slice(0, 5).map((alert) => (
          <li
            key={alert.address}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
              }`}
            />
            <span className="truncate text-zinc-300">{alert.name}</span>
            <span className="ml-auto text-zinc-600">{alert.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
