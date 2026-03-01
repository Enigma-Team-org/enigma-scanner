import { prisma } from '@/lib/database/prisma';
import { createLogger } from '@/lib/utils/logger';
import { calculateTrustScore, type TrustScoreBreakdown } from './trust-score-service';
import { calculateTRACERScore, type AgentData, type TRACERBreakdown } from './tracer-score-service';

const logger = createLogger('combined-trust-score');

/**
 * Combined Trust Score v2 Weights
 * Infrastructure(50%) + Community(20%) + Correlation(15%) + RL(15%)
 */
export const COMBINED_WEIGHTS = {
  infrastructure: 0.50,
  community: 0.20,
  correlation: 0.15,
  rl: 0.15,
} as const;

export interface CombinedScoreBreakdown {
  v1Score: number;
  v2Score: number;
  tracerScore: number;
  classification: string;
  pillars: {
    infrastructure: { score: number; weighted: number };
    community: { score: number; weighted: number };
    correlation: { score: number; weighted: number };
    rl: { score: number; weighted: number };
  };
  lastUpdated: Date;
}

/**
 * Calculate Infrastructure pillar (50%)
 * Combines v1 reliability metrics + TRACER reliability
 */
function calculateInfrastructure(
  v1: TrustScoreBreakdown,
  tracer: TRACERBreakdown
): number {
  const uptimeV1 = v1.breakdown.uptime.score;
  const proxyV1 = v1.breakdown.proxy.score;
  const reliabilityTracer = tracer.dimensions.reliability.score;
  const ozMatch = v1.breakdown.ozMatch.score;

  // Weighted blend of infrastructure signals
  const score = Math.round(
    uptimeV1 * 0.30 +
    reliabilityTracer * 0.30 +
    proxyV1 * 0.25 +
    ozMatch * 0.15
  );

  return Math.min(score, 100);
}

/**
 * Calculate Community pillar (20%)
 * Ratings + TRACER reputation
 */
function calculateCommunity(
  v1: TrustScoreBreakdown,
  tracer: TRACERBreakdown
): number {
  const ratingsV1 = v1.breakdown.ratings.score;
  const reputationTracer = tracer.dimensions.reputation.score;

  const score = Math.round(ratingsV1 * 0.55 + reputationTracer * 0.45);
  return Math.min(score, 100);
}

/**
 * Calculate Correlation pillar (15%)
 * Cross-validation of multiple dimensions
 */
function calculateCorrelation(tracer: TRACERBreakdown): number {
  const trust = tracer.dimensions.trust.score;
  const capability = tracer.dimensions.capability.score;
  const economics = tracer.dimensions.economics.score;
  const autonomy = tracer.dimensions.autonomy.score;

  // Average of cross-dimensional signals
  const avg = (trust + capability + economics + autonomy) / 4;

  // Penalize high variance (inconsistent signals)
  const values = [trust, capability, economics, autonomy];
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const consistencyBonus = Math.max(0, 20 - stdDev * 0.3);

  const score = Math.round(avg * 0.7 + consistencyBonus * 1.5);
  return Math.min(score, 100);
}

/**
 * Calculate Reinforcement Learning pillar (15%)
 * Historical trend + consistency over time
 */
async function calculateRL(agentAddress: string): Promise<number> {
  const snapshots = await prisma.trustScore.findMany({
    where: { agentId: agentAddress },
    orderBy: { calculatedAt: 'asc' },
    take: 20,
    select: { overallScore: true, calculatedAt: true },
  });

  if (snapshots.length < 2) {
    return 50; // Default for agents with insufficient history
  }

  const scores = snapshots.map((s) => s.overallScore * 100);

  // Trend: compare recent avg vs older avg
  const mid = Math.floor(scores.length / 2);
  const olderAvg = scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const recentAvg = scores.slice(mid).reduce((a, b) => a + b, 0) / (scores.length - mid);

  const trendScore = recentAvg >= olderAvg
    ? Math.min(60 + (recentAvg - olderAvg) * 2, 80)
    : Math.max(20, 60 - (olderAvg - recentAvg) * 2);

  // Consistency: low variance = higher score
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / scores.length;
  const cv = avg > 0 ? Math.sqrt(variance) / avg : 1;
  const consistencyScore = cv < 0.05 ? 100 : cv < 0.15 ? 80 : cv < 0.30 ? 60 : 40;

  return Math.round(trendScore * 0.5 + consistencyScore * 0.5);
}

/**
 * Build AgentData for TRACER calculation from DB
 */
async function buildAgentDataForTracer(agentAddress: string): Promise<AgentData> {
  const agent = await prisma.agent.findUnique({
    where: { address: agentAddress },
    include: {
      ratings: { select: { rating: true } },
      heartbeatLogs: {
        where: { timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        select: { result: true, responseTimeMs: true },
      },
      transactionVolumes: {
        where: { period: 'DAY' },
        select: { volumeAvax: true, txCount: true },
      },
      trustScores: { select: { id: true } },
    },
  });

  if (!agent) throw new Error(`Agent not found: ${agentAddress}`);

  const totalHeartbeatsAllTime = await prisma.heartbeatLog.count({
    where: { agentAddress },
  });

  const heartbeatCount = agent.heartbeatLogs.length;
  const passedHeartbeats = agent.heartbeatLogs.filter((h) => h.result === 'PASS').length;

  const responseTimes = agent.heartbeatLogs
    .filter((h) => h.responseTimeMs !== null)
    .map((h) => h.responseTimeMs as number);

  const avgResponseTimeMs = responseTimes.length > 0
    ? responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length
    : 0;

  let responseTimeStdDev = 0;
  if (responseTimes.length > 1) {
    const variance = responseTimes.reduce(
      (sum, t) => sum + Math.pow(t - avgResponseTimeMs, 2), 0
    ) / responseTimes.length;
    responseTimeStdDev = Math.sqrt(variance);
  }

  const volumeData = agent.transactionVolumes[0];
  const metadata = (agent.metadata as Record<string, unknown>) || {};
  const capabilities = (metadata.capabilities as Record<string, unknown>) || {};
  const services = (metadata.services as Array<Record<string, unknown>>) || [];

  return {
    address: agentAddress,
    isProxy: agent.is_proxy,
    proxyType: agent.proxy_type,
    uptime24h: heartbeatCount > 0 ? (passedHeartbeats / heartbeatCount) * 100 : 100,
    avgResponseTimeMs,
    responseTimeStdDev,
    heartbeatCount,
    passedHeartbeats,
    totalHeartbeatsAllTime,
    volumeAvax: volumeData ? Number(volumeData.volumeAvax) : 0,
    txCount: volumeData?.txCount || 0,
    ratings: agent.ratings.map((r) => r.rating),
    daysSinceRegistration: Math.floor(
      (Date.now() - agent.created_at.getTime()) / (1000 * 60 * 60 * 24)
    ),
    hasVerifiedWallet: !!agent.billing_address,
    isOpenSource: !!(metadata.open_source || metadata.openSource || capabilities.open_source),
    hasAudits: !!(metadata.audited || metadata.audit || capabilities.audited),
    skillsDeclared: services.map((s) => (s.name as string) || '').filter(Boolean),
    skillsVerified: services.filter((s) => s.verified === true).map((s) => (s.name as string) || '').filter(Boolean),
    canDelegate: !!(capabilities.delegation || capabilities.a2a || metadata.a2a),
    hasAutoRecovery: !!(capabilities.auto_recovery || capabilities.autoRecovery),
    delegatedTasksCount: Number(capabilities.delegated_tasks || 0),
    trustScoreSnapshots: agent.trustScores.length,
  };
}

/**
 * Calculate Combined Trust Score v2 for an agent
 */
export async function calculateCombinedTrustScore(
  agentAddress: string
): Promise<CombinedScoreBreakdown> {
  const normalizedAddress = agentAddress.toLowerCase();

  logger.info({ address: normalizedAddress }, 'Calculating Combined Trust Score v2');

  // Calculate v1
  const v1 = await calculateTrustScore(normalizedAddress);

  // Calculate TRACER
  const agentData = await buildAgentDataForTracer(normalizedAddress);
  const tracer = calculateTRACERScore(agentData);

  // Calculate 4 pillars
  const infrastructure = calculateInfrastructure(v1, tracer);
  const community = calculateCommunity(v1, tracer);
  const correlation = calculateCorrelation(tracer);
  const rl = await calculateRL(normalizedAddress);

  // Combine
  const v2Score = Math.round(
    infrastructure * COMBINED_WEIGHTS.infrastructure +
    community * COMBINED_WEIGHTS.community +
    correlation * COMBINED_WEIGHTS.correlation +
    rl * COMBINED_WEIGHTS.rl
  );

  const classification = v2Score >= 90 ? 'excellent'
    : v2Score >= 75 ? 'good'
    : v2Score >= 60 ? 'acceptable'
    : v2Score >= 40 ? 'poor'
    : 'unreliable';

  logger.info({
    address: normalizedAddress,
    v1: v1.score,
    tracer: tracer.score,
    v2: v2Score,
    classification,
  });

  return {
    v1Score: v1.score,
    v2Score,
    tracerScore: tracer.score,
    classification,
    pillars: {
      infrastructure: {
        score: infrastructure,
        weighted: Math.round(infrastructure * COMBINED_WEIGHTS.infrastructure),
      },
      community: {
        score: community,
        weighted: Math.round(community * COMBINED_WEIGHTS.community),
      },
      correlation: {
        score: correlation,
        weighted: Math.round(correlation * COMBINED_WEIGHTS.correlation),
      },
      rl: {
        score: rl,
        weighted: Math.round(rl * COMBINED_WEIGHTS.rl),
      },
    },
    lastUpdated: new Date(),
  };
}
