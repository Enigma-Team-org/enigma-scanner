'use client';

import { useAgents } from '@/hooks/use-agents';

export function RecentActivity() {
  const { data, isLoading } = useAgents({
    sortBy: 'created_at',
    sortOrder: 'desc',
    limit: 5,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="mb-3 text-sm font-medium text-zinc-400">Recent Activity</h3>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  const agents = data?.agents || [];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="mb-3 text-sm font-medium text-zinc-400">Recent Activity</h3>
      <ul className="space-y-2">
        {agents.map((agent) => (
          <li
            key={agent.address}
            className="flex items-center justify-between text-xs"
          >
            <span className="truncate text-zinc-300">{agent.name}</span>
            <span className="ml-2 shrink-0 rounded bg-blue-900/30 px-1.5 py-0.5 text-blue-400">
              {agent.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
