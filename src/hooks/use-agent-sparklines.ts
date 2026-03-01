import { useQuery } from '@tanstack/react-query';

export type SparklineData = Record<string, { v: number }[]>;

export function useAgentSparklines(addresses: string[]) {
  const sorted = [...addresses].sort();
  const key = sorted.join(',');

  return useQuery<SparklineData>({
    queryKey: ['agent-sparklines', key],
    queryFn: async () => {
      if (sorted.length === 0) return {};
      const res = await fetch(
        `/api/v1/agents/sparklines?addresses=${sorted.join(',')}`
      );
      if (!res.ok) throw new Error('Failed to fetch sparklines');
      const json = await res.json();
      return json.data;
    },
    enabled: sorted.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
