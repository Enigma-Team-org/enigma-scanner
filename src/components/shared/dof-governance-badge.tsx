'use client';

import { ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/index';

type BadgeSize = 'sm' | 'md';

const SIZE_STYLES: Record<BadgeSize, { text: string; icon: string; padding: string }> = {
  sm: { text: 'text-[10px]', icon: 'h-3 w-3', padding: 'px-1.5 py-0.5' },
  md: { text: 'text-xs', icon: 'h-3.5 w-3.5', padding: 'px-2 py-1' },
};

interface DOFGovernanceBadgeProps {
  governanceStatus: string | null;
  z3Verified: boolean;
  z3Theorems?: number | null;
  size?: BadgeSize;
  className?: string;
}

/**
 * DOFGovernanceBadge — shows DOF governance verification status.
 *
 * - COMPLIANT + z3_verified → green "DOF VERIFIED"
 * - governance exists but not compliant → yellow "DOF CHECKED"
 * - no DOF data (null) → renders nothing
 */
export function DOFGovernanceBadge({
  governanceStatus,
  z3Verified,
  z3Theorems,
  size = 'md',
  className,
}: DOFGovernanceBadgeProps) {
  if (!governanceStatus) return null;

  const isVerified = governanceStatus === 'COMPLIANT' && z3Verified;
  const sizeStyle = SIZE_STYLES[size];

  const tooltipText = isVerified
    ? `Formally verified: ${z3Theorems ?? 4}/4 Z3 theorems proven`
    : 'Governance issues detected';

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold border whitespace-nowrap',
        sizeStyle.padding,
        sizeStyle.text,
        isVerified
          ? 'text-green-400 bg-green-500/15 border-green-500/30'
          : 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
        className
      )}
    >
      {isVerified ? (
        <ShieldCheck className={sizeStyle.icon} />
      ) : (
        <ShieldAlert className={sizeStyle.icon} />
      )}
      {isVerified ? 'DOF VERIFIED' : 'DOF CHECKED'}
    </span>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
