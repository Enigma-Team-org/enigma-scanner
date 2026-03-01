import { NextRequest } from 'next/server';
import { successResponse, handleError } from '@/lib/utils/api-helpers';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';
import { createLogger } from '@/lib/utils/logger';
import { addressSchema } from '@/lib/utils/validation';
import { getAgent } from '@/services/agent-service';
import { getTrustScoreBreakdown, TRUST_SCORE_WEIGHTS } from '@/services/trust-score-service';

export const dynamic = 'force-dynamic';

const logger = createLogger('api-agents-trust-score');

/**
 * GET /api/v1/agents/:address/trust-score
 *
 * Retrieve the detailed Trust Score breakdown for a specific agent
 *
 * Response:
 * - score: Overall trust score (0-100)
 * - breakdown: Individual component scores with weights
 * - lastUpdated: Timestamp of last calculation
 *
 * @see docs/api/endpoints.md
 * @see docs/features/trust-score.md
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

    logger.info({ address: normalizedAddress }, 'Fetching trust score breakdown');

    // Check if agent exists
    const agent = await getAgent(normalizedAddress);
    if (!agent) {
      throw new NotFoundError(`Agent not found: ${address}`);
    }

    // Get trust score breakdown
    const trustScore = await getTrustScoreBreakdown(normalizedAddress);

    logger.info({
      address: normalizedAddress,
      score: trustScore.score,
    }, 'Trust score fetched successfully');

    return successResponse({
      address: normalizedAddress,
      score: trustScore.score,
      breakdown: {
        volume: {
          score: trustScore.breakdown.volume.score,
          weight: TRUST_SCORE_WEIGHTS.VOLUME,
          weighted: trustScore.breakdown.volume.weighted,
          details: trustScore.breakdown.volume.details,
        },
        proxy: {
          score: trustScore.breakdown.proxy.score,
          weight: TRUST_SCORE_WEIGHTS.PROXY,
          weighted: trustScore.breakdown.proxy.weighted,
          details: trustScore.breakdown.proxy.details,
        },
        uptime: {
          score: trustScore.breakdown.uptime.score,
          weight: TRUST_SCORE_WEIGHTS.UPTIME,
          weighted: trustScore.breakdown.uptime.weighted,
          details: trustScore.breakdown.uptime.details,
        },
        ozMatch: {
          score: trustScore.breakdown.ozMatch.score,
          weight: TRUST_SCORE_WEIGHTS.OZ_MATCH,
          weighted: trustScore.breakdown.ozMatch.weighted,
          details: trustScore.breakdown.ozMatch.details,
        },
        ratings: {
          score: trustScore.breakdown.ratings.score,
          weight: TRUST_SCORE_WEIGHTS.RATINGS,
          weighted: trustScore.breakdown.ratings.weighted,
          details: trustScore.breakdown.ratings.details,
        },
      },
      lastUpdated: trustScore.lastUpdated.toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching trust score');
    return handleError(error);
  }
}
