import { NextRequest } from 'next/server';
import { successResponse, handleError } from '@/lib/utils/api-helpers';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';
import { createLogger } from '@/lib/utils/logger';
import { addressSchema } from '@/lib/utils/validation';
import { getAgent } from '@/services/agent-service';
import { calculateCombinedTrustScore, COMBINED_WEIGHTS } from '@/services/combined-trust-score-service';

export const dynamic = 'force-dynamic';

const logger = createLogger('api-enhanced-score');

/**
 * GET /api/v1/agents/:address/enhanced-score
 *
 * Retrieve the Combined Trust Score v2 for a specific agent.
 * Combines v1 Trust Score + TRACER Score into 4 pillars:
 * Infrastructure(50%) + Community(20%) + Correlation(15%) + RL(15%)
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

    logger.info({ address: normalizedAddress }, 'Calculating enhanced score v2');

    const agent = await getAgent(normalizedAddress);
    if (!agent) {
      throw new NotFoundError(`Agent not found: ${address}`);
    }

    const combined = await calculateCombinedTrustScore(normalizedAddress);

    logger.info({
      address: normalizedAddress,
      v1: combined.v1Score,
      v2: combined.v2Score,
      tracer: combined.tracerScore,
      classification: combined.classification,
    }, 'Enhanced score calculated');

    return successResponse({
      address: normalizedAddress,
      v2Score: combined.v2Score,
      v1Score: combined.v1Score,
      tracerScore: combined.tracerScore,
      classification: combined.classification,
      weights: COMBINED_WEIGHTS,
      pillars: combined.pillars,
      lastUpdated: combined.lastUpdated.toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Error calculating enhanced score');
    return handleError(error);
  }
}
