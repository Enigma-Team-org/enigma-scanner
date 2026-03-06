'use client';

import { Activity, Zap, Shield, Code, Users } from 'lucide-react';
import { cn } from '@/lib/utils/index';
import type { CombinedScore } from '@/hooks/use-combined-score';

interface DimensionConfig {
  key: keyof CombinedScore['dimensions'];
  label: string;
  icon: React.ElementType;
  iconColor: string;
  barColor: string;
}

const DIMENSIONS: DimensionConfig[] = [
  { key: 'alive', label: 'Alive', icon: Activity, iconColor: 'text-green-400', barColor: 'bg-green-400' },
  { key: 'active', label: 'Active', icon: Zap, iconColor: 'text-blue-400', barColor: 'bg-blue-400' },
  { key: 'governance', label: 'Governance', icon: Shield, iconColor: 'text-cyan-400', barColor: 'bg-cyan-400' },
  { key: 'safety', label: 'Safety', icon: Code, iconColor: 'text-purple-400', barColor: 'bg-purple-400' },
  { key: 'community', label: 'Community', icon: Users, iconColor: 'text-amber-400', barColor: 'bg-amber-400' },
];

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

interface TrustDimensionsProps {
  data: CombinedScore;
  className?: string;
}

/**
 * TrustDimensions — 5 horizontal progress bars showing each trust dimension.
 *
 * Dimensions: Alive (15%), Active (15%), Governance (35%), Safety (15%), Community (20%)
 * Shows Z3 mini badge on Governance if z3_verified, "Clean" on Safety if score === 100.
 */
export function TrustDimensions({ data, className }: TrustDimensionsProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {DIMENSIONS.map((dim) => {
        const dimension = data.dimensions[dim.key];
        const Icon = dim.icon;

        return (
          <div key={dim.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', dim.iconColor)} />
                <span className="text-sm text-[rgba(255,255,255,0.7)]">{dim.label}</span>
                <span className="text-[10px] text-[rgba(255,255,255,0.4)]">
                  {dimension.weight}%
                </span>
                {dim.key === 'governance' && data.dof?.z3_verified && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-medium">
                    Z3
                  </span>
                )}
                {dim.key === 'safety' && dimension.score === 100 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 font-medium">
                    Clean
                  </span>
                )}
              </div>
              <span className={cn('text-sm font-semibold', getScoreColor(dimension.score))}>
                {dimension.score}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[rgba(255,255,255,0.06)]">
              <div
                className={cn('h-full rounded-full transition-all duration-700', dim.barColor)}
                style={{ width: `${Math.min(dimension.score, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
