'use client';

import { useAgents } from '@/hooks/use-agents';

export function TopAgentsList() {
  const { data, isLoading } = useAgents({
    sortBy: 'trust_score',
    sortOrder: 'desc',
    limit: 5,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="mb-3 text-sm font-medium text-zinc-400">Top Agents</h3>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  const agents = data?.agents || [];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="mb-3 text-sm font-medium text-zinc-400">Top Agents</h3>
      <ul className="space-y-2">
        {agents.map((agent, i) => (
          <li
            key={agent.address}
            className="flex items-center gap-2 text-xs"
          >
            <span className="w-4 text-zinc-600">#{i + 1}</span>
            <span className="truncate text-zinc-300">{agent.name}</span>
            <span className="ml-auto font-mono text-emerald-400">
              {agent.trust_score}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
