import { NextRequest } from 'next/server';
import { successResponse, handleError } from '@/lib/utils/api-helpers';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';
import { createLogger } from '@/lib/utils/logger';
import { addressSchema } from '@/lib/utils/validation';
import { prisma } from '@/lib/database/prisma';

export const dynamic = 'force-dynamic';

const logger = createLogger('api-agents-trust-history');

/**
 * GET /api/v1/agents/:address/trust-history
 *
 * Returns up to 100 historical trust score snapshots for an agent, ordered ASC.
 *
 * Response:
 * - data: Array<{ date: ISO string, score: number (0-100) }>
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

    logger.info({ address: normalizedAddress }, 'Fetching trust score history');

    const agent = await prisma.agent.findUnique({
      where: { address: normalizedAddress },
      select: { address: true },
    });

    if (!agent) {
      throw new NotFoundError(`Agent not found: ${address}`);
    }

    const snapshots = await prisma.trustScore.findMany({
      where: { agentId: normalizedAddress },
      orderBy: { calculatedAt: 'asc' },
      take: 100,
      select: { calculatedAt: true, overallScore: true },
    });

    const data = snapshots.map((s) => ({
      date: s.calculatedAt.toISOString(),
      score: Math.round(s.overallScore * 100),
    }));

    logger.info({ address: normalizedAddress, count: data.length }, 'Trust history fetched');

    return successResponse(data);
  } catch (error) {
    logger.error({ error }, 'Error fetching trust history');
    return handleError(error);
  }
}
