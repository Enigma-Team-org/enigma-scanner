import { NextRequest } from 'next/server';
import { successResponse, handleError } from '@/lib/utils/api-helpers';
import { createLogger } from '@/lib/utils/logger';
import { syncAgentsFromRoutescan } from '@/services/routescan-indexer-service';
import { recalculateAllScores } from '@/services/trust-score-service';
import { syncTransactionVolumes } from '@/services/transaction-volume-service';
import { syncRatingsFromReputation } from '@/services/reputation-indexer-service';
import { prisma } from '@/lib/database/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max
export const runtime = 'nodejs'; // Ensure Node.js runtime for viem compatibility

const logger = createLogger('cron-indexer');

/**
 * GET /api/cron/indexer
 *
 * Scheduled job that runs every 3 hours to:
 * 1. Index new agents + update metadata from the ERC-8004 registry via Routescan API
 * 2. Sync transaction volumes from Snowtrace API
 * 3. Import on-chain ratings from Reputation Registry
 * 4. Recalculate trust scores for ALL agents
 *
 * Protected by Vercel Cron Secret in production
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret in production
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('Unauthorized cron job access attempt');
        return new Response('Unauthorized', { status: 401 });
      }
    }

    logger.info('Starting scheduled indexer + score refresh job');

    const startTime = Date.now();

    // Step 1: Sync agents + update metadata from Routescan API
    const result = await syncAgentsFromRoutescan();

    // Step 2: Sync transaction volumes (parallel-safe, independent)
    // Step 3: Import on-chain ratings from Reputation Registry
    const [volumeResult, ratingsResult] = await Promise.all([
      syncTransactionVolumes().catch((err) => {
        logger.error({ error: err }, 'Transaction volume sync failed (non-blocking)');
        return { indexed: 0, failed: 0, skipped: 0 };
      }),
      syncRatingsFromReputation().catch((err) => {
        logger.error({ error: err }, 'Reputation sync failed (non-blocking)');
        return { imported: 0, failed: 0, skipped: 0 };
      }),
    ]);

    // Step 4: Recalculate trust scores for all agents
    const updatedScores = await recalculateAllScores();

    // Step 5: Refresh combined trust materialized view
    await prisma.$executeRawUnsafe(
      'REFRESH MATERIALIZED VIEW CONCURRENTLY combined_trust_view'
    ).catch((err) => {
      logger.error({ error: err }, 'Combined trust view refresh failed (non-blocking)');
    });

    const duration = Date.now() - startTime;

    const stats = {
      indexed: result.indexed,
      skipped: result.skipped,
      failed: result.failed,
      total: result.total,
      volumes: volumeResult,
      ratings: ratingsResult,
      trustScoresUpdated: updatedScores,
      duration: `${(duration / 1000).toFixed(2)}s`,
    };

    logger.info(stats, 'Scheduled job completed successfully');

    return successResponse(
      {
        message: 'Cron job completed',
        ...stats,
      },
      200
    );

  } catch (error) {
    logger.error({ error }, 'Error during scheduled job');
    return handleError(error);
  }
}
