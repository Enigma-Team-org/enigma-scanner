'use client';

import { useRouter } from 'next/navigation';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, Clock, Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type Agent } from '@/hooks/use-agents';
import { useCombinedScore } from '@/hooks/use-combined-score';
import { DOFGovernanceBadge } from '@/components/shared/dof-governance-badge';
import { cn } from '@/lib/utils/index';

interface AgentTableProps {
  agents: Agent[];
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

/**
 * Get trust score color based on value
 */
function getTrustScoreColor(score: number): string {
  if (score >= 90) return 'text-green-400 bg-green-400/10';
  if (score >= 70) return 'text-blue-400 bg-blue-400/10';
  if (score >= 50) return 'text-yellow-400 bg-yellow-400/10';
  return 'text-red-400 bg-red-400/10';
}

/**
 * Get status badge variant and icon
 */
function getStatusConfig(status: string) {
  const configs = {
    VERIFIED: {
      variant: 'default' as const,
      icon: ShieldCheck,
      className: 'bg-green-500/10 text-green-400 border-green-500/20',
    },
    PENDING: {
      variant: 'secondary' as const,
      icon: Clock,
      className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    },
    FLAGGED: {
      variant: 'destructive' as const,
      icon: ShieldAlert,
      className: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    },
    SUSPENDED: {
      variant: 'destructive' as const,
      icon: ShieldX,
      className: 'bg-red-500/10 text-red-400 border-red-500/20',
    },
  };

  return configs[status as keyof typeof configs] || {
    variant: 'secondary' as const,
    icon: Shield,
    className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Get color style for service badge
 */
function getServiceStyle(service: string): string {
  switch (service.toLowerCase()) {
    case 'mcp':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'a2a':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'web':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'oasf':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    default:
      return 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)]';
  }
}

/**
 * Truncate address for display
 */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * TrustScoreCell — renders trust score + DOF badge (if available)
 */
function TrustScoreCell({ address, score }: { address: string; score: number }) {
  const { data } = useCombinedScore(address);

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className={cn(
          'inline-flex items-center justify-center px-3 py-1.5 rounded-md font-bold text-sm',
          getTrustScoreColor(score)
        )}
      >
        {score}
      </div>
      {data?.dof && (
        <DOFGovernanceBadge
          governanceStatus={data.dof.status}
          z3Verified={data.dof.z3_verified}
          z3Theorems={data.dof.z3_theorems}
          size="sm"
        />
      )}
    </div>
  );
}

/**
 * Column definitions for the agent table
 */
const columns: ColumnDef<Agent>[] = [
  {
    id: 'rank',
    header: '#',
    cell: ({ row }) => (
      <span className="text-[rgba(255,255,255,0.5)] font-mono text-sm">
        {row.index + 1}
      </span>
    ),
    size: 60,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-white">{row.original.name}</span>
        <span className="text-xs text-[rgba(255,255,255,0.5)] font-mono">
          {truncateAddress(row.original.address)}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const services = row.original.services;
      if (services && services.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {services.map((svc) => (
              <Badge
                key={svc}
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0', getServiceStyle(svc))}
              >
                {svc}
              </Badge>
            ))}
          </div>
        );
      }
      return (
        <Badge
          variant="outline"
          className="bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)]"
        >
          {row.original.type}
        </Badge>
      );
    },
    size: 140,
  },
  {
    accessorKey: 'trust_score',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        Trust Score
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <TrustScoreCell address={row.original.address} score={row.original.trust_score} />
    ),
    size: 120,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const config = getStatusConfig(row.original.status);
      const Icon = config.icon;
      return (
        <Badge variant={config.variant} className={cn('gap-1', config.className)}>
          <Icon className="h-3 w-3" />
          {row.original.status}
        </Badge>
      );
    },
    size: 100,
  },
  {
    accessorKey: 'updated_at',
    header: 'Last Update',
    cell: ({ row }) => (
      <span className="text-sm text-[rgba(255,255,255,0.6)]">
        {formatRelativeTime(row.original.updated_at)}
      </span>
    ),
    size: 120,
  },
];

/**
 * AgentTable component with TanStack Table
 * Displays list of agents with sorting and navigation
 */
export function AgentTable({ agents, onSortChange }: AgentTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: agents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSorting);

      // Notify parent of sort change
      if (onSortChange && newSorting.length > 0) {
        const { id, desc } = newSorting[0];
        onSortChange(id, desc ? 'desc' : 'asc');
      }
    },
    state: {
      sorting,
    },
  });

  const handleRowClick = (address: string) => {
    router.push(`/agents/${address}`);
  };

  return (
    <div className="rounded-md border border-[rgba(255,255,255,0.06)] overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-b border-[rgba(255,255,255,0.06)] hover:bg-transparent bg-[rgba(255,255,255,0.02)]"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className="text-[rgba(255,255,255,0.7)]"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row, index) => (
            <TableRow
              key={row.id}
              onClick={() => handleRowClick(row.original.address)}
              className="border-b border-[rgba(255,255,255,0.06)] cursor-pointer hover:bg-[rgba(59,130,246,0.08)] transition-all duration-200 animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
