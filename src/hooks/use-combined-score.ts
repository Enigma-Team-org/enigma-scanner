'use client';

import { useQuery } from '@tanstack/react-query';

interface Dimension {
  score: number;
  weight: number;
  source: string;
}

interface DOFDetails {
  status: string;
  z3_verified: boolean;
  z3_theorems: number;
  stability_score: number;
  adversarial_score: number;
  certificate_hash: string;
  on_chain_tx: string;
}

export interface CombinedScore {
  agent_id: string;
  token_id: number;
  combined_trust_score: number;
  dimensions: {
    alive: Dimension;
    active: Dimension;
    governance: Dimension;
    safety: Dimension;
    community: Dimension;
  };
  dof: DOFDetails | null;
  last_updated: string;
}

export function useCombinedScore(address: string | undefined) {
  return useQuery<CombinedScore>({
    queryKey: ['combined-score', address],
    queryFn: async () => {
      const res = await fetch(`/api/v1/agents/${address}/combined-score`);
      if (!res.ok) throw new Error('Failed to fetch combined score');
      const json = await res.json();
      return json.data;
    },
    enabled: !!address,
    staleTime: 60_000,
  });
}
