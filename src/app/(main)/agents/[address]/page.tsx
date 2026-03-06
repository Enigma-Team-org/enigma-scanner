'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  Shield,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrustScoreBadge } from '@/components/shared/trust-score-badge';
import { RatingForm } from '@/components/agent/rating-form';
import { ReportModal } from '@/components/agent/report-modal';
import { ReputationContract } from '@/components/agent/reputation-contract';
import { AgentMetadataDisplay } from '@/components/agent/agent-metadata';
import { useAgent, type AgentDetail } from '@/hooks/use-agent';
import { useCombinedScore } from '@/hooks/use-combined-score';
import { DOFGovernanceBadge } from '@/components/shared/dof-governance-badge';
import { TrustDimensions } from '@/components/agent/trust-dimensions';
import { DOFDetailsCard } from '@/components/agent/dof-details-card';
import { cn } from '@/lib/utils/index';
import {
  BarChart3,
  Activity,
  ShieldCheck,
  Star,
  TrendingUp as TrendingUpIcon,
  Calculator,
} from 'lucide-react';

/**
 * Status badge colors
 */
const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  VERIFIED: { bg: 'bg-green-500/15', text: 'text-green-400' },
  PENDING: { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  FLAGGED: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  SUSPENDED: { bg: 'bg-red-500/15', text: 'text-red-400' },
};

/**
 * Agent type labels
 */
const TYPE_LABELS: Record<string, string> = {
  TRADING: 'Trading Bot',
  LENDING: 'Lending Protocol',
  GOVERNANCE: 'Governance Agent',
  ORACLE: 'Oracle Provider',
  CUSTOM: 'Custom Agent',
};

/**
 * Agent Profile Page
 * Displays detailed agent information with tabbed interface
 */
export default function AgentProfilePage() {
  const params = useParams();
  const address = params.address as string;
  const [copied, setCopied] = useState(false);

  const { data: agent, isLoading, isError, error, refetch } = useAgent(address, {
    refetchInterval: 60 * 1000, // Refetch every minute
  });
  const { data: combinedScore } = useCombinedScore(address);

  // Copy address to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Snowtrace link - points to NFT in Identity Registry
  const snowtraceUrl = agent?.registryAddress && agent?.tokenId
    ? `https://snowtrace.io/token/${agent.registryAddress}?a=${agent.tokenId}#inventory`
    : `https://snowtrace.io/address/${address}`;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-[rgba(255,255,255,0.6)]">Loading agent profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="min-h-[calc(100vh-200px)] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button variant="ghost" asChild>
              <Link href="/scanner">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Scanner
              </Link>
            </Button>
          </div>

          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-red-500/15 flex items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Agent Not Found</h1>
            <p className="text-[rgba(255,255,255,0.6)] mb-6 max-w-md">
              {error?.message || 'Unable to load agent details.'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  const statusStyle = STATUS_STYLES[agent.status] || STATUS_STYLES.PENDING;

  return (
    <div className="min-h-[calc(100vh-200px)] py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" asChild className="text-[rgba(255,255,255,0.6)] hover:text-white">
            <Link href="/scanner">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Scanner
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="rounded-lg bg-[rgba(15,17,23,0.6)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Agent Icon and Trust Score */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-purple-500/15 flex items-center justify-center">
                <Shield className="h-8 w-8 text-purple-400" />
              </div>
              <TrustScoreBadge
                score={agent.trustScore.score}
                size="lg"
                lastUpdated={agent.trustScore.lastUpdated}
              />
            </div>

            {/* Agent Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
                {combinedScore?.dof && (
                  <DOFGovernanceBadge
                    governanceStatus={combinedScore.dof.status}
                    z3Verified={combinedScore.dof.z3_verified}
                    z3Theorems={combinedScore.dof.z3_theorems}
                  />
                )}
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusStyle.bg, statusStyle.text)}>
                  {agent.status}
                </span>
              </div>

              {agent.metadata?.services && agent.metadata.services.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {agent.metadata.services.map((svc) => (
                    <span
                      key={svc.name}
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        svc.name.toLowerCase() === 'mcp' && 'bg-emerald-500/15 text-emerald-400',
                        svc.name.toLowerCase() === 'a2a' && 'bg-yellow-500/15 text-yellow-400',
                        svc.name.toLowerCase() === 'web' && 'bg-blue-500/15 text-blue-400',
                        svc.name.toLowerCase() === 'oasf' && 'bg-purple-500/15 text-purple-400',
                        !['mcp', 'a2a', 'web', 'oasf'].includes(svc.name.toLowerCase()) && 'bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)]',
                      )}
                    >
                      {svc.name}{svc.version ? ` v${svc.version}` : ''}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[rgba(255,255,255,0.5)] mb-3">
                  {TYPE_LABELS[agent.type] || agent.type}
                </p>
              )}

              {/* ERC-8004 Identity Registry Info */}
              <div className="space-y-2">
                {agent.tokenId && agent.registryAddress && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[rgba(255,255,255,0.4)]">ERC-8004 NFT:</span>
                    <code className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-xs font-mono text-purple-300">
                      Token #{agent.tokenId}
                    </code>
                    <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                      <a href={snowtraceUrl} target="_blank" rel="noopener noreferrer" title="View on Snowtrace">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[rgba(255,255,255,0.4)]">Address:</span>
                  <code className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-xs font-mono text-[rgba(255,255,255,0.6)]">
                    {address.slice(0, 10)}...{address.slice(-8)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-6 w-6 p-0"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                {agent.ownerAddress && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[rgba(255,255,255,0.4)]">Owner:</span>
                    <code className="px-2 py-0.5 bg-[rgba(255,255,255,0.05)] rounded text-xs font-mono text-[rgba(255,255,255,0.6)]">
                      {agent.ownerAddress.slice(0, 10)}...{agent.ownerAddress.slice(-8)}
                    </code>
                    <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                      <a
                        href={`https://snowtrace.io/address/${agent.ownerAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View owner on Snowtrace"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              {agent.description && (
                <p className="mt-3 text-sm text-[rgba(255,255,255,0.6)]">
                  {agent.description}
                </p>
              )}

              <div className="mt-3">
                <ReportModal agentAddress={address} />
              </div>
            </div>
          </div>

          {/* Flagged Warning */}
          {agent.status === 'FLAGGED' && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
              <AlertCircle size={16} className="shrink-0 text-yellow-500" />
              <p className="text-sm text-yellow-400">
                This agent has been flagged by the community and is under review.
              </p>
            </div>
          )}
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start bg-[rgba(15,17,23,0.6)] border border-[rgba(255,255,255,0.06)] mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="heartbeat">Heartbeat</TabsTrigger>
            <TabsTrigger value="ratings">Ratings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Smart Contract Analysis - Full Width */}
            <ReputationContract agent={agent} />

            {/* Combined Trust Dimensions (DOF + Centinela + Community) */}
            {combinedScore && (
              <div className="rounded-xl bg-[rgba(15,17,23,0.6)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Combined Trust Dimensions</h3>
                <TrustDimensions data={combinedScore} />
              </div>
            )}

            {/* DOF Governance Details */}
            {combinedScore && <DOFDetailsCard data={combinedScore} />}

            {/* Trust Score Calculation */}
            <TrustScoreCalculation agent={agent} />
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata">
            <AgentMetadataDisplay metadata={agent.metadata} />
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification">
            <VerificationTab agent={agent} />
          </TabsContent>

          {/* Heartbeat Tab */}
          <TabsContent value="heartbeat">
            <HeartbeatTab agent={agent} />
          </TabsContent>

          {/* Ratings Tab */}
          <TabsContent value="ratings">
            <RatingsTab agent={agent} agentAddress={address} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/**
 * Verification tab content
 */
function VerificationTab({ agent }: { agent: AgentDetail }) {
  const proxyStatusColor = agent.proxy.detected
    ? agent.proxy.type !== 'CUSTOM'
      ? 'text-yellow-400'
      : 'text-red-400'
    : 'text-green-400';

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Proxy Analysis */}
      <div className="rounded-lg bg-[rgba(15,17,23,0.6)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Proxy Analysis</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[rgba(255,255,255,0.6)]">Proxy Detected</span>
            <span className={cn('text-sm font-medium', proxyStatusColor)}>
              {agent.proxy.detected ? 'Yes' : 'No'}
            </span>
          </div>
          {agent.proxy.detected && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[rgba(255,255,255,0.6)]">Proxy Type</span>
                <span className="text-sm font-medium text-white">{agent.proxy.type}</span>
              </div>
              {agent.proxy.implementationAddress && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-[rgba(255,255,255,0.6)]">Implementation</span>
                  <code className="text-xs font-mono text-purple-400 break-all">
                    {agent.proxy.implementationAddress}
                  </code>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* OZ Match Results */}
      <div className="rounded-lg bg-[rgba(15,17,23,0.6)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Security Patterns</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[rgba(255,255,255,0.6)]">OZ Match Score</span>
            <span className="text-sm font-medium text-white">
              {agent.trustScore.breakdown.ozMatch.score}/100
            </span>
          </div>
          {(() => {
            const components = agent.trustScore.breakdown.ozMatch.details.matchedComponents as string[] | undefined;
            if (!components || components.length === 0) {
              return (
                <p className="text-sm text-[rgba(255,255,255,0.5)]">
                  No known OpenZeppelin patterns detected
                </p>
              );
            }
            return (
              <div>
                <p className="text-sm text-[rgba(255,255,255,0.6)] mb-2">Matched Components:</p>
                <div className="flex flex-wrap gap-2">
                  {components.map((comp) => (
                    <span
                      key={comp}
                      className="px-2 py-1 text-xs rounded bg-green-500/15 text-green-400"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/**
 * Heartbeat tab content
 */
function HeartbeatTab({ agent }: { agent: AgentDetail }) {
  return (
    <div className="rounded-lg bg-[rgba(15,17,23,0.6)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Uptime Statistics (7 Days)</h3>
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Uptime" value={`${agent.uptime.percentage.toFixed(1)}%`} />
        <StatCard label="Total Pings" value={agent.uptime.totalPings.toString()} />
        <StatCard label="Successful" value={agent.uptime.successfulPings.toString()} color="green" />
        <StatCard label="Failed/Timeout" value={(agent.uptime.failedPings + agent.uptime.timeoutPings).toString()} color="red" />
      </div>
      <div className="mt-4 p-4 bg-[rgba(255,255,255,0.03)] rounded-lg">
        <p className="text-sm text-[rgba(255,255,255,0.6)]">
          Average Response Time:{' '}
          <span className="font-medium text-white">
            {agent.uptime.averageResponseTimeMs}ms
          </span>
        </p>
      </div>
      <p className="mt-4 text-sm text-[rgba(255,255,255,0.5)]">
        Heartbeat chart visualization coming soon in a future update.
      </p>
    </div>
  );
}

/**
 * Stat card component
 */
function StatCard({ label, value, color }: { label: string; value: string; color?: 'green' | 'red' }) {
  const valueColor = color === 'green' ? 'text-green-400' : color === 'red' ? 'text-red-400' : 'text-white';
  return (
    <div className="p-4 bg-[rgba(255,255,255,0.03)] rounded-lg">
      <p className="text-sm text-[rgba(255,255,255,0.6)]">{label}</p>
      <p className={cn('text-2xl font-bold', valueColor)}>{value}</p>
    </div>
  );
}

/**
 * Trust Score Calculation Display
 */
function TrustScoreCalculation({ agent }: { agent: AgentDetail }) {
  const components = [
    {
      key: 'volume',
      label: 'Transaction Volume',
      icon: BarChart3,
      score: agent.trustScore.breakdown.volume.score,
      weight: agent.trustScore.breakdown.volume.weight,
      color: 'cyan',
    },
    {
      key: 'proxy',
      label: 'Proxy Transparency',
      icon: Shield,
      score: agent.trustScore.breakdown.proxy.score,
      weight: agent.trustScore.breakdown.proxy.weight,
      color: 'emerald',
    },
    {
      key: 'uptime',
      label: 'Uptime',
      icon: Activity,
      score: agent.trustScore.breakdown.uptime.score,
      weight: agent.trustScore.breakdown.uptime.weight,
      color: 'amber',
    },
    {
      key: 'ozMatch',
      label: 'Security Patterns',
      icon: ShieldCheck,
      score: agent.trustScore.breakdown.ozMatch.score,
      weight: agent.trustScore.breakdown.ozMatch.weight,
      color: 'purple',
    },
    {
      key: 'ratings',
      label: 'Community Rating',
      icon: Star,
      score: agent.trustScore.breakdown.ratings.score,
      weight: agent.trustScore.breakdown.ratings.weight,
      color: 'rose',
    },
  ];

  const colorClasses = {
    cyan: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      bar: 'bg-gradient-to-r from-cyan-500 to-cyan-600',
      glow: 'shadow-cyan-500/20',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bar: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
      glow: 'shadow-emerald-500/20',
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      bar: 'bg-gradient-to-r from-amber-500 to-amber-600',
      glow: 'shadow-amber-500/20',
    },
    purple: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      bar: 'bg-gradient-to-r from-purple-500 to-purple-600',
      glow: 'shadow-purple-500/20',
    },
    rose: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      bar: 'bg-gradient-to-r from-rose-500 to-rose-600',
      glow: 'shadow-rose-500/20',
    },
  };

  return (
    <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#0F1117] via-[#1A1625] to-[#0F1117] border border-purple-500/20">
      {/* Header */}
      <div className="border-b border-white/5 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 p-0.5">
              <div className="h-full w-full rounded-xl bg-[#0F1117] flex items-center justify-center">
                <Calculator className="h-6 w-6 text-purple-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-0.5">Trust Score Formula</h3>
              <p className="text-sm text-white/50">Weighted calculation breakdown</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <span className="text-xs text-white/50 font-medium">Final Score</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">{agent.trustScore.score}</span>
              <span className="text-lg text-white/40">/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Components Grid */}
      <div className="p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {components.map((component) => {
            const Icon = component.icon;
            const colors = colorClasses[component.color as keyof typeof colorClasses];
            const weightPercent = Math.round(component.weight * 100);
            const contribution = (component.score * component.weight).toFixed(1);

            return (
              <div
                key={component.key}
                className={cn(
                  'group relative overflow-hidden rounded-xl p-4 border-2 transition-all hover:scale-[1.02] cursor-pointer',
                  colors.border,
                  colors.bg,
                  'shadow-lg',
                  colors.glow
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/20" />
                <div className="relative">
                  {/* Icon and Label */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn('p-2 rounded-lg', colors.bg, 'border', colors.border)}>
                      <Icon className={cn('h-4 w-4', colors.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/80 font-medium">{component.label}</p>
                      <p className="text-[10px] text-white/40">Weight: {weightPercent}%</p>
                    </div>
                  </div>

                  {/* Score Display */}
                  <div className="mb-3">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className={cn('text-3xl font-bold', colors.text)}>
                        {component.score}
                      </span>
                      <span className="text-sm text-white/40">/100</span>
                    </div>
                    <p className="text-xs text-white/50">
                      Contributes: <span className={cn('font-semibold', colors.text)}>{contribution}</span> points
                    </p>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-black/30">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700 ease-out', colors.bar)}
                      style={{
                        width: `${component.score}%`,
                        boxShadow: '0 0 10px currentColor',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Formula Explanation */}
        <div className="mt-6 p-4 bg-white/[0.02] rounded-xl border border-white/5">
          <div className="flex items-start gap-3">
            <TrendingUpIcon className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">How it works</h4>
              <p className="text-xs text-white/60 leading-relaxed">
                Each metric is scored 0-100 and multiplied by its weight. The final trust score is the sum of all weighted scores.
                Higher weights mean that metric has more influence on the overall score.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {components.map((c) => (
                  <span key={c.key} className="text-[10px] text-white/40 px-2 py-1 bg-white/5 rounded">
                    {c.label}: {Math.round(c.weight * 100)}%
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Ratings tab content
 */
function RatingsTab({ agent, agentAddress }: { agent: AgentDetail; agentAddress: string }) {
  return (
    <div className="space-y-6">
      {/* Rating Form */}
      <RatingForm agentAddress={agentAddress} />

      {/* Ratings List */}
      <div className="rounded-lg bg-[rgba(15,17,23,0.6)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Community Ratings</h3>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{agent.ratings.average.toFixed(1)}</p>
            <p className="text-sm text-[rgba(255,255,255,0.5)]">{agent.ratings.count} ratings</p>
          </div>
        </div>

        {agent.ratings.count === 0 ? (
          <p className="text-center text-[rgba(255,255,255,0.5)] py-8">
            No ratings yet. Be the first to rate this agent!
          </p>
        ) : (
        <div className="space-y-4">
          {agent.ratings.recent.map((rating) => (
            <div
              key={rating.id}
              className="p-4 bg-[rgba(255,255,255,0.03)] rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">{'★'.repeat(rating.rating)}</span>
                  <span className="text-[rgba(255,255,255,0.3)]">{'★'.repeat(5 - rating.rating)}</span>
                </div>
                <span className="text-xs text-[rgba(255,255,255,0.5)]">
                  {new Date(rating.createdAt).toLocaleDateString()}
                </span>
              </div>
              {rating.review && (
                <p className="text-sm text-[rgba(255,255,255,0.7)]">{rating.review}</p>
              )}
              <p className="text-xs text-[rgba(255,255,255,0.4)] mt-2">
                by {rating.userAddress.slice(0, 6)}...{rating.userAddress.slice(-4)}
              </p>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
