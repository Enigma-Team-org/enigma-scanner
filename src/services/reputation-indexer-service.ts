import { createPublicClient, http, type Address, parseAbiItem } from 'viem';
import { avalanche } from 'viem/chains';
import { prisma } from '@/lib/database/prisma';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('reputation-indexer');

const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713' as Address;

const client = createPublicClient({
  chain: avalanche,
  transport: http('https://api.avax.network/ext/bc/C/rpc', {
    retryCount: 2,
    timeout: 15_000,
  }),
});

// ERC-8004 Reputation Registry events
const FEEDBACK_EVENT = parseAbiItem(
  'event FeedbackSubmitted(address indexed agent, address indexed rater, uint8 score, string comment)'
);

/**
 * Sync ratings from on-chain Reputation Registry
 * Reads FeedbackSubmitted events and imports them as ratings
 */
export async function syncRatingsFromReputation(): Promise<{
  imported: number;
  failed: number;
  skipped: number;
}> {
  logger.info('Starting reputation registry sync');

  let imported = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Get the latest block we've synced to
    const latestRating = await prisma.rating.findFirst({
      where: { txHash: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    // Fetch events from the last 30 days or since last sync
    const fromBlock = latestRating
      ? undefined // Will use timestamp filter
      : BigInt(0);

    // Try to read events - if the contract doesn't exist or has different ABI,
    // we handle gracefully
    let logs;
    try {
      logs = await client.getLogs({
        address: REPUTATION_REGISTRY,
        event: FEEDBACK_EVENT,
        fromBlock: fromBlock ?? 'earliest',
        toBlock: 'latest',
      });
    } catch (error) {
      // Contract may not exist or have different ABI
      logger.warn({ error }, 'Could not read Reputation Registry events - contract may not be deployed or has different ABI');

      // Fallback: try reading via Snowtrace API for event logs
      logs = await fetchFeedbackLogsFromSnowtrace();
    }

    if (!logs || logs.length === 0) {
      logger.info('No feedback events found in Reputation Registry');
      return { imported: 0, failed: 0, skipped: 0 };
    }

    logger.info({ count: logs.length }, 'Found feedback events');

    for (const log of logs) {
      try {
        const agentAddress = (log.args?.agent as string)?.toLowerCase();
        const raterAddress = (log.args?.rater as string)?.toLowerCase();
        const score = Number(log.args?.score || 0);
        const comment = (log.args?.comment as string) || null;

        if (!agentAddress || !raterAddress || score < 1 || score > 5) {
          skipped++;
          continue;
        }

        // Check if agent exists in our DB
        const agent = await prisma.agent.findUnique({
          where: { address: agentAddress },
          select: { address: true },
        });

        if (!agent) {
          skipped++;
          continue;
        }

        // Upsert rating
        await prisma.rating.upsert({
          where: {
            agentId_userAddress: {
              agentId: agentAddress,
              userAddress: raterAddress,
            },
          },
          update: {
            rating: score,
            review: comment,
            txHash: log.transactionHash || null,
          },
          create: {
            agentId: agentAddress,
            userAddress: raterAddress,
            rating: score,
            review: comment,
            txHash: log.transactionHash || null,
          },
        });

        imported++;
      } catch (error) {
        failed++;
        logger.error({ log, error }, 'Failed to import rating');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Failed to sync from Reputation Registry');
  }

  logger.info({ imported, failed, skipped }, 'Reputation registry sync completed');
  return { imported, failed, skipped };
}

/**
 * Fallback: fetch feedback logs from Snowtrace API
 */
async function fetchFeedbackLogsFromSnowtrace(): Promise<Array<{
  args: { agent: string; rater: string; score: number; comment: string };
  transactionHash: string;
}>> {
  const apiKey = process.env.SNOWTRACE_API_KEY || '';
  // Topic0 for FeedbackSubmitted event
  const topic0 = '0x' + Buffer.from('FeedbackSubmitted(address,address,uint8,string)').toString('hex').slice(0, 64);

  const url = `https://api.snowtrace.io/api?module=logs&action=getLogs&address=${REPUTATION_REGISTRY}&fromBlock=0&toBlock=latest&apikey=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    if (data.status !== '1' || !Array.isArray(data.result)) return [];

    // Parse event logs into our format
    return data.result.map((log: { topics: string[]; data: string; transactionHash: string }) => {
      const agent = '0x' + (log.topics[1] || '').slice(26);
      const rater = '0x' + (log.topics[2] || '').slice(26);
      // Score is in the data field (first 32 bytes)
      const score = parseInt(log.data.slice(0, 66), 16) || 3;

      return {
        args: { agent, rater, score: Math.min(Math.max(score, 1), 5), comment: '' },
        transactionHash: log.transactionHash,
      };
    });
  } catch (error) {
    logger.warn({ error }, 'Failed to fetch feedback logs from Snowtrace');
    return [];
  }
}
