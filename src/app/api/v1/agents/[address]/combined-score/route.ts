import { NextRequest } from 'next/server';
import { successResponse, handleError } from '@/lib/utils/api-helpers';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';
import { createLogger } from '@/lib/utils/logger';
import { addressSchema } from '@/lib/utils/validation';
import { prisma } from '@/lib/database/prisma';

export const dynamic = 'force-dynamic';

const logger = createLogger('api-combined-score');

/**
 * GET /api/v1/agents/:address/combined-score
 *
 * Combined trust score from 3 sources:
 *   - Centinela (heartbeat uptime, transaction volume)
 *   - DOF (governance, AST safety, Z3 formal verification)
 *   - Community (ratings)
 *
 * Weights: Alive(15%) + Active(15%) + Governance(35%) + Safety(15%) + Community(20%)
 *
 * Uses materialized view `combined_trust_view` for fast lookups.
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

    logger.info({ address: normalizedAddress }, 'Fetching combined trust score');

    const result = await prisma.$queryRaw<
      Array<{
        agent_id: string;
        token_id: number | null;
        alive_score: number;
        active_score: number;
        governance_score: number;
        safety_score: number;
        community_score: number;
        combined_trust_score: number;
        dof_z3_verified: boolean;
        dof_on_chain_tx: string | null;
        dof_governance_status: string | null;
        dof_certificate_hash: string | null;
        dof_stability_score: number | null;
        dof_adversarial_score: number | null;
        dof_z3_theorems: number | null;
        last_updated: Date | null;
      }>
    >`SELECT * FROM combined_trust_view WHERE agent_id = ${normalizedAddress} LIMIT 1`;

    if (!result || result.length === 0) {
      throw new NotFoundError(`Agent not found: ${address}`);
    }

    const score = result[0];

    return successResponse({
      agent_id: score.agent_id,
      token_id: score.token_id,
      combined_trust_score: Math.round((score.combined_trust_score || 0) * 100),
      dimensions: {
        alive: {
          score: Math.round((score.alive_score || 0) * 100),
          weight: 15,
          source: 'centinela',
        },
        active: {
          score: Math.round((score.active_score || 0) * 100),
          weight: 15,
          source: 'centinela',
        },
        governance: {
          score: Math.round((score.governance_score || 0) * 100),
          weight: 35,
          source: 'dof',
        },
        safety: {
          score: Math.round((score.safety_score || 0) * 100),
          weight: 15,
          source: 'dof',
        },
        community: {
          score: Math.round((score.community_score || 0) * 100),
          weight: 20,
          source: 'ratings',
        },
      },
      dof: score.dof_governance_status
        ? {
            status: score.dof_governance_status,
            z3_verified: score.dof_z3_verified,
            z3_theorems: score.dof_z3_theorems,
            stability_score: score.dof_stability_score,
            adversarial_score: score.dof_adversarial_score,
            certificate_hash: score.dof_certificate_hash,
            on_chain_tx: score.dof_on_chain_tx,
          }
        : null,
      last_updated: score.last_updated,
    });
  } catch (error) {
    return handleError(error);
  }
}
