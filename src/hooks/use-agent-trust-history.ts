import { useQuery } from '@tanstack/react-query';

export interface TrustHistoryPoint {
  date: string;
  score: number;
}

export function useAgentTrustHistory(address: string | undefined) {
  return useQuery<TrustHistoryPoint[]>({
    queryKey: ['agent-trust-history', address],
    queryFn: async () => {
      const res = await fetch(`/api/v1/agents/${address}/trust-history`);
      if (!res.ok) throw new Error('Failed to fetch trust history');
      const json = await res.json();
      return json.data;
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
  });
}
