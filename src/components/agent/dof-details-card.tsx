'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, Activity, Code, FlaskConical, ExternalLink, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils/index';
import type { CombinedScore } from '@/hooks/use-combined-score';

interface DOFDetailsCardProps {
  data: CombinedScore;
  className?: string;
}

/**
 * DOFDetailsCard — expandable card showing DOF governance details.
 *
 * 2x2 grid: GCR (Constitutional Invariant), SS (Stability Score),
 * AST (Code Safety), Z3 (Formal Proofs).
 * Snowtrace link if on_chain_tx. Truncated certificate_hash with copy.
 */
export function DOFDetailsCard({ data, className }: DOFDetailsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!data.dof) return null;

  const { dof, dimensions } = data;

  const handleCopy = async () => {
    if (!dof.certificate_hash) return;
    await navigator.clipboard.writeText(dof.certificate_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateHash = (hash: string) =>
    hash.length > 16 ? `${hash.slice(0, 8)}...${hash.slice(-8)}` : hash;

  return (
    <div
      className={cn(
        'rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(15,17,23,0.6)] backdrop-blur-xl',
        className
      )}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">DOF Governance Details</span>
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium border',
              dof.status === 'COMPLIANT'
                ? 'text-green-400 bg-green-500/15 border-green-500/30'
                : 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30'
            )}
          >
            {dof.status}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-[rgba(255,255,255,0.4)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[rgba(255,255,255,0.4)]" />
        )}
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="border-t border-[rgba(255,255,255,0.06)] p-4 space-y-4">
          {/* 2x2 metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCell
              icon={Shield}
              iconColor="text-cyan-400"
              label="GCR"
              sublabel="Constitutional Invariant"
              value={dimensions.governance.score}
            />
            <MetricCell
              icon={Activity}
              iconColor="text-green-400"
              label="SS"
              sublabel="Stability Score"
              value={dof.stability_score != null ? Math.round(dof.stability_score * 100) : null}
            />
            <MetricCell
              icon={Code}
              iconColor="text-purple-400"
              label="AST"
              sublabel="Code Safety"
              value={dimensions.safety.score}
            />
            <MetricCell
              icon={FlaskConical}
              iconColor="text-blue-400"
              label="Z3"
              sublabel="Formal Proofs"
              value={dof.z3_verified ? `${dof.z3_theorems ?? 4}/4` : '0/4'}
              isText
            />
          </div>

          {/* On-chain transaction */}
          {dof.on_chain_tx && (
            <div className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.5)]">
              <ExternalLink className="h-3 w-3" />
              <a
                href={`https://snowtrace.io/tx/${dof.on_chain_tx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View on Snowtrace
              </a>
            </div>
          )}

          {/* Certificate hash */}
          {dof.certificate_hash && (
            <div className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.5)]">
              <span className="font-mono">{truncateHash(dof.certificate_hash)}</span>
              <button
                onClick={handleCopy}
                className="text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
                title="Copy certificate hash"
              >
                {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCell({
  icon: Icon,
  iconColor,
  label,
  sublabel,
  value,
  isText = false,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  sublabel: string;
  value: number | string | null;
  isText?: boolean;
}) {
  const displayValue = value ?? '—';

  return (
    <div className="rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn('h-3.5 w-3.5', iconColor)} />
        <span className="text-xs font-semibold text-white">{label}</span>
      </div>
      <p className="text-[10px] text-[rgba(255,255,255,0.4)] mb-2">{sublabel}</p>
      <p
        className={cn(
          'text-lg font-bold',
          isText
            ? 'text-blue-400'
            : typeof value === 'number' && value >= 80
              ? 'text-green-400'
              : typeof value === 'number' && value >= 60
                ? 'text-blue-400'
                : typeof value === 'number' && value >= 40
                  ? 'text-yellow-400'
                  : 'text-red-400'
        )}
      >
        {displayValue}
      </p>
    </div>
  );
}
