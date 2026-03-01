import { NextRequest } from 'next/server';
import { successResponse, handleError } from '@/lib/utils/api-helpers';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';
import { createLogger } from '@/lib/utils/logger';
import { addressSchema } from '@/lib/utils/validation';
import { prisma } from '@/lib/database/prisma';
import { 
  calculateTRACERScore, 
  type AgentData,
  type TRACERBreakdown,
} from '@/services/tracer-score-service';

export const dynamic = 'force-dynamic';

const logger = createLogger('api-tracer-score');

/**
 * GET /api/v1/agents/[address]/tracer
 *
 * Get TRACER score breakdown for an agent
 *
 * Response:
 * - score: Total TRACER score (0-100)
 * - classification: excellent/good/acceptable/poor/unreliable
 * - dimensions: Breakdown of all 6 dimensions
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const parseResult = addressSchema.safeParse(address);
    if (!parseResult.success) {
      throw new ValidationError('Invalid agent address format', {
        address: parseResult.error.errors[0].message,
      });
    }
    const normalizedAddress = parseResult.data;

    logger.info({ address: normalizedAddress }, 'Fetching TRACER score');

    // Fetch agent data with all relations needed for TRACER
    const agent = await prisma.agent.findUnique({
      where: { address: normalizedAddress },
      include: {
        ratings: {
          select: { rating: true },
        },
        heartbeatLogs: {
          where: {
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
          select: {
            result: true,
            responseTimeMs: true,
          },
        },
        transactionVolumes: {
          where: { period: 'DAY' },
          select: {
            volumeAvax: true,
            txCount: true,
          },
        },
        trustScores: {
          select: { id: true },
        },
      },
    });

    if (!agent) {
      throw new NotFoundError(`Agent not found: ${address}`);
    }

    // Total heartbeats (all time) for Trust.validations
    const totalHeartbeatsAllTime = await prisma.heartbeatLog.count({
      where: { agentAddress: normalizedAddress },
    });

    // Calculate metrics from agent data (24h window)
    const heartbeatCount = agent.heartbeatLogs.length;
    const passedHeartbeats = agent.heartbeatLogs.filter(
      (h) => h.result === 'PASS'
    ).length;

    const responseTimes = agent.heartbeatLogs
      .filter((h) => h.responseTimeMs !== null)
      .map((h) => h.responseTimeMs as number);

    const avgResponseTimeMs = responseTimes.length > 0
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
      : 0;

    // Calculate response time standard deviation for Economics.predictability
    let responseTimeStdDev = 0;
    if (responseTimes.length > 1) {
      const variance = responseTimes.reduce(
        (sum, t) => sum + Math.pow(t - avgResponseTimeMs, 2), 0
      ) / responseTimes.length;
      responseTimeStdDev = Math.sqrt(variance);
    }

    const uptime24h = heartbeatCount > 0
      ? (passedHeartbeats / heartbeatCount) * 100
      : 100;

    const volumeData = agent.transactionVolumes[0];
    const volumeAvax = volumeData ? Number(volumeData.volumeAvax) : 0;
    const txCount = volumeData?.txCount || 0;

    const ratings = agent.ratings.map((r) => r.rating);

    const daysSinceRegistration = Math.floor(
      (Date.now() - agent.created_at.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Parse metadata JSON for capabilities
    const metadata = (agent.metadata as Record<string, unknown>) || {};
    const capabilities = (metadata.capabilities as Record<string, unknown>) || {};
    const services = (metadata.services as Array<Record<string, unknown>>) || [];
    const skillsDeclared = services.map((s) => (s.name as string) || '').filter(Boolean);
    const skillsVerified = services
      .filter((s) => s.verified === true)
      .map((s) => (s.name as string) || '')
      .filter(Boolean);

    // Build AgentData for TRACER calculation
    const agentData: AgentData = {
      address: normalizedAddress,
      isProxy: agent.is_proxy,
      proxyType: agent.proxy_type,
      uptime24h,
      avgResponseTimeMs,
      responseTimeStdDev,
      heartbeatCount,
      passedHeartbeats,
      totalHeartbeatsAllTime,
      volumeAvax,
      txCount,
      ratings,
      daysSinceRegistration,
      hasVerifiedWallet: !!agent.billing_address,
      isOpenSource: !!(metadata.open_source || metadata.openSource || (capabilities.open_source)),
      hasAudits: !!(metadata.audited || metadata.audit || (capabilities.audited)),
      skillsDeclared,
      skillsVerified,
      canDelegate: !!(capabilities.delegation || capabilities.a2a || metadata.a2a),
      hasAutoRecovery: !!(capabilities.auto_recovery || capabilities.autoRecovery),
      delegatedTasksCount: Number(capabilities.delegated_tasks || 0),
      trustScoreSnapshots: agent.trustScores.length,
    };

    const tracerBreakdown: TRACERBreakdown = calculateTRACERScore(agentData);

    logger.info({
      address: normalizedAddress,
      score: tracerBreakdown.score,
      classification: tracerBreakdown.classification,
    });

    // Format response
    const response = {
      address: normalizedAddress,
      score: tracerBreakdown.score,
      classification: tracerBreakdown.classification,
      dimensions: {
        trust: {
          score: tracerBreakdown.dimensions.trust.score,
          contribution: tracerBreakdown.dimensions.trust.contribution,
          components: tracerBreakdown.dimensions.trust.components,
        },
        reliability: {
          score: tracerBreakdown.dimensions.reliability.score,
          contribution: tracerBreakdown.dimensions.reliability.contribution,
          components: tracerBreakdown.dimensions.reliability.components,
        },
        autonomy: {
          score: tracerBreakdown.dimensions.autonomy.score,
          contribution: tracerBreakdown.dimensions.autonomy.contribution,
          components: tracerBreakdown.dimensions.autonomy.components,
        },
        capability: {
          score: tracerBreakdown.dimensions.capability.score,
          contribution: tracerBreakdown.dimensions.capability.contribution,
          components: tracerBreakdown.dimensions.capability.components,
        },
        economics: {
          score: tracerBreakdown.dimensions.economics.score,
          contribution: tracerBreakdown.dimensions.economics.contribution,
          components: tracerBreakdown.dimensions.economics.components,
        },
        reputation: {
          score: tracerBreakdown.dimensions.reputation.score,
          contribution: tracerBreakdown.dimensions.reputation.contribution,
          components: tracerBreakdown.dimensions.reputation.components,
        },
      },
      weights: {
        trust: 0.20,
        reliability: 0.20,
        autonomy: 0.15,
        capability: 0.20,
        economics: 0.10,
        reputation: 0.15,
      },
      lastUpdated: tracerBreakdown.lastUpdated.toISOString(),
    };

    return successResponse(response);
  } catch (error) {
    logger.error({ error }, 'Error fetching TRACER score');
    return handleError(error);
  }
}
