'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Plus, TrendingUp, Shield, Activity, RefreshCw, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgents, type AgentFilters } from '@/hooks/use-agents';
import { useAgentStats } from '@/hooks/use-agent-stats';
import { AgentTable } from '@/components/scanner/agent-table';
import { EmptyState } from '@/components/scanner/empty-state';
import { ErrorState } from '@/components/scanner/error-state';
import { Filters, type FilterValues } from '@/components/scanner/filters';
import { SearchBar } from '@/components/scanner/search-bar';
import { ActivityChart } from '@/components/scanner/activity-chart';
import { RiskAlerts } from '@/components/scanner/risk-alerts';
import { TopAgentsList } from '@/components/scanner/top-agents-list';
import { RecentActivity } from '@/components/scanner/recent-activity';
import { cn } from '@/lib/utils/index';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

const MIN_LOADING_TIME = 800; // Minimum loading time in ms for smooth animation

/**
 * Stats card component
 */
function StatCard({
  icon: Icon,
  label,
  value,
  className,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg',
        'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]',
        'interactive-card animate-fade-in-up',
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-sm text-[rgba(255,255,255,0.6)]">{label}</p>
        <p className="text-xl font-bold text-white number-animate">{value}</p>
      </div>
    </div>
  );
}

/**
 * Pagination component
 */
function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={page <= 1}
        title="First page"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        Previous
      </Button>
      <span className="text-sm text-[rgba(255,255,255,0.6)] px-4">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={page >= totalPages}
        title="Last page"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * Scanner Page - Main agent directory
 * Combines filters, search, and agent table for discovering agents
 */
export default function ScannerPage() {
  // Filter state
  const [filters, setFilters] = useState<FilterValues>({
    type: undefined,
    status: undefined,
    minTrustScore: 0,
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showContent, setShowContent] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Build query filters
  const queryFilters: AgentFilters = {
    ...(filters.type && { type: filters.type as AgentFilters['type'] }),
    ...(filters.status && { status: filters.status as AgentFilters['status'] }),
    ...(filters.minTrustScore > 0 && { minTrustScore: filters.minTrustScore }),
    ...(search && { search }),
    page,
    limit: 20,
  };

  // Fetch agents and stats
  const { data, isLoading, isError, error, refetch } = useAgents(queryFilters);
  const { data: stats } = useAgentStats();

  const agents = data?.agents || [];
  const pagination = data?.pagination;

  // Handle loading with minimum time
  useEffect(() => {
    if (isLoading) {
      setShowContent(false);
      return;
    }

    // When loading completes, wait minimum time before showing content
    const timer = setTimeout(() => {
      setShowContent(true);
    }, MIN_LOADING_TIME);

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page on filter change
  }, []);

  // Handle filter reset
  const handleResetFilters = useCallback(() => {
    setFilters({
      type: undefined,
      status: undefined,
      minTrustScore: 0,
    });
    setSearch('');
    setPage(1);
  }, []);

  // Determine empty state variant
  const getEmptyStateVariant = () => {
    if (search) return 'no-results';
    if (filters.type || filters.status || filters.minTrustScore > 0) return 'filtered';
    return 'no-agents';
  };

  // Handle sync button click - syncs agents from on-chain Identity Registry
  // Also automatically calculates trust scores for new agents
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/v1/indexer/refresh', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Indexer refresh completed:', result.data);

        // Refresh agents list after successful sync
        await refetch();
      } else {
        console.error('Sync failed:', await response.text());
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [refetch]);

  return (
    <div className="min-h-[calc(100vh-200px)] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Agent Scanner</h1>
            <p className="text-[rgba(255,255,255,0.6)]">
              Discover and verify autonomous agents on Avalanche
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={isSyncing}
              className="btn-press"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </Button>
            <Button asChild className="btn-press hover-lift">
              <Link href="/register">
                <Plus className="mr-2 h-4 w-4" />
                Register Agent
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={Shield}
            label="Total Agents"
            value={stats?.total || 0}
            delay={100}
          />
          <StatCard
            icon={TrendingUp}
            label="Verified"
            value={stats?.verified || 0}
            delay={200}
          />
          <StatCard
            icon={Activity}
            label="Active (24h)"
            value={stats?.active24h || 0}
            delay={300}
          />
        </div>

        {/* Dashboard Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '350ms' }}>
            <ActivityChart />
          </div>
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
            <TopAgentsList />
            <RiskAlerts />
          </div>
        </div>

        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '450ms' }}>
          <RecentActivity />
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 flex-shrink-0 animate-slide-in-left" style={{ animationDelay: '200ms' }}>
            <Filters values={filters} onChange={handleFilterChange} />
          </aside>

          {/* Search + Table Column */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Search Bar */}
            <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <SearchBar
                value={search}
                onChange={setSearch}
                className="max-w-md"
              />
            </div>

            {/* Agent Table */}
            <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-20 animate-fade-in">
                <LoadingSpinner size="lg" text="Scanning agents..." />
              </div>
            ) : isError ? (
              <div className="animate-scale-in">
                <ErrorState
                  message={error?.message}
                  onRetry={() => refetch()}
                />
              </div>
            ) : !showContent ? (
              <div className="flex items-center justify-center py-20 animate-fade-in">
                <LoadingSpinner size="lg" text="Scanning agents..." />
              </div>
            ) : agents.length === 0 ? (
              <div className="animate-scale-in">
                <EmptyState
                  variant={getEmptyStateVariant()}
                  onResetFilters={handleResetFilters}
                />
              </div>
            ) : (
              <div className="animate-fade-in">
                <AgentTable agents={agents} />
                {pagination && (
                  <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                  />
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
