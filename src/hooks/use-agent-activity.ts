import { useQuery } from '@tanstack/react-query';

export interface ActivityPoint {
  date: string;
  registrations: number;
  verifications: number;
}

export function useAgentActivity(days = 30) {
  return useQuery<ActivityPoint[]>({
    queryKey: ['agent-activity', days],
    queryFn: async () => {
      const res = await fetch(`/api/v1/agents/activity?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch activity');
      const json = await res.json();
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
