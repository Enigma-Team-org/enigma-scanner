import { createPublicClient, http, type Address } from 'viem';
import { avalanche } from 'viem/chains';
import { prisma } from '@/lib/database/prisma';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('transaction-volume-service');

const client = createPublicClient({
  chain: avalanche,
  transport: http('https://api.avax.network/ext/bc/C/rpc', {
    retryCount: 2,
    timeout: 10_000,
  }),
});

const SNOWTRACE_API = 'https://api.snowtrace.io/api';

interface SnowtraceTransaction {
  hash: string;
  value: string;
  timeStamp: string;
  isError: string;
}

/**
 * Fetch transaction list for an address from Snowtrace API
 */
async function fetchTransactions(
  address: string,
  startTimestamp: number
): Promise<SnowtraceTransaction[]> {
  const apiKey = process.env.SNOWTRACE_API_KEY || '';
  const url = `${SNOWTRACE_API}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    if (data.status !== '1' || !Array.isArray(data.result)) return [];

    return data.result.filter(
      (tx: SnowtraceTransaction) => Number(tx.timeStamp) >= startTimestamp
    );
  } catch (error) {
    logger.warn({ address, error }, 'Failed to fetch transactions from Snowtrace');
    return [];
  }
}

/**
 * Calculate volume metrics from transaction list
 */
function calculateVolume(txs: SnowtraceTransaction[]): {
  txCount: number;
  volumeWei: bigint;
} {
  let volumeWei = BigInt(0);
  let txCount = 0;

  for (const tx of txs) {
    if (tx.isError === '0') {
      txCount++;
      volumeWei += BigInt(tx.value || '0');
    }
  }

  return { txCount, volumeWei };
}

/**
 * Convert wei to AVAX (18 decimals)
 */
function weiToAvax(wei: bigint): number {
  return Number(wei) / 1e18;
}

/**
 * Sync transaction volumes for all agents
 * Fetches from Snowtrace and updates TransactionVolume table
 */
export async function syncTransactionVolumes(): Promise<{
  indexed: number;
  failed: number;
  skipped: number;
}> {
  logger.info('Starting transaction volume sync');

  const agents = await prisma.agent.findMany({
    where: { status: 'VERIFIED' },
    select: { address: true },
  });

  let indexed = 0;
  let failed = 0;
  let skipped = 0;

  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 86400;
  const oneWeekAgo = now - 86400 * 7;
  const oneMonthAgo = now - 86400 * 30;

  // Process in batches of 10 to respect rate limits
  for (let i = 0; i < agents.length; i += 10) {
    const batch = agents.slice(i, i + 10);

    await Promise.all(
      batch.map(async (agent) => {
        try {
          // Fetch all transactions for last 30 days (covers all periods)
          const txs = await fetchTransactions(agent.address, oneMonthAgo);

          if (txs.length === 0) {
            skipped++;
            return;
          }

          // Calculate volumes for each period
          const dayTxs = txs.filter((t) => Number(t.timeStamp) >= oneDayAgo);
          const weekTxs = txs.filter((t) => Number(t.timeStamp) >= oneWeekAgo);

          const dayVol = calculateVolume(dayTxs);
          const weekVol = calculateVolume(weekTxs);
          const monthVol = calculateVolume(txs);

          // Upsert each period
          const periods = [
            { period: 'DAY' as const, data: dayVol },
            { period: 'WEEK' as const, data: weekVol },
            { period: 'MONTH' as const, data: monthVol },
          ];

          for (const { period, data } of periods) {
            await prisma.transactionVolume.upsert({
              where: {
                agentAddress_period: {
                  agentAddress: agent.address,
                  period,
                },
              },
              update: {
                txCount: data.txCount,
                volumeAvax: weiToAvax(data.volumeWei),
                volumeUsd: 0, // Would need price oracle
              },
              create: {
                agentAddress: agent.address,
                period,
                txCount: data.txCount,
                volumeAvax: weiToAvax(data.volumeWei),
                volumeUsd: 0,
              },
            });
          }

          indexed++;
        } catch (error) {
          failed++;
          logger.error({ address: agent.address, error }, 'Failed to sync volume');
        }
      })
    );

    // Rate limiting between batches
    if (i + 10 < agents.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  logger.info({ indexed, failed, skipped }, 'Transaction volume sync completed');
  return { indexed, failed, skipped };
}
