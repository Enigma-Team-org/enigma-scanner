import { NextRequest } from 'next/server';
import { successResponse, handleError } from '@/lib/utils/api-helpers';
import { createLogger } from '@/lib/utils/logger';
import { syncAgentsFromRoutescan } from '@/services/routescan-indexer-service';
import { recalculateAllScores } from '@/services/trust-score-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max
export const runtime = 'nodejs'; // Ensure Node.js runtime for viem compatibility

const logger = createLogger('api-indexer-refresh');

/**
 * POST /api/v1/indexer/refresh
 *
 * Triggers a manual refresh of the agent index using Routescan API
 * - Syncs agents from mainnet Identity Registry via Routescan
 * - Automatically calculates trust scores for new agents
 * - Fetches up to 20 pages (1000 transfers) for quick sync
 *
 * This can be called manually from the Scanner page
 */
export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET in production to prevent public abuse
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        logger.warn('Unauthorized indexer refresh attempt');
        return new Response('Unauthorized', { status: 401 });
      }
    }

    logger.info('Starting manual indexer refresh via Routescan');

    const startTime = Date.now();

    // Sync agents from Routescan API (max 20 pages for quick refresh)
    const result = await syncAgentsFromRoutescan(20);

    // Recalculate trust scores if new agents were indexed
    let updatedScores = 0;
    if (result.indexed > 0) {
      updatedScores = await recalculateAllScores();
    }

    const duration = Date.now() - startTime;

    const stats = {
      indexed: result.indexed,
      skipped: result.skipped,
      failed: result.failed,
      total: result.total,
      trustScoresUpdated: updatedScores,
      duration: `${(duration / 1000).toFixed(2)}s`,
    };

    logger.info(stats, 'Indexer refresh completed successfully');

    return successResponse(
      {
        message: 'Indexer refresh completed',
        ...stats,
      },
      200
    );

  } catch (error) {
    logger.error({ error }, 'Error during indexer refresh');
    return handleError(error);
  }
}
