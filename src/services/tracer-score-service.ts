import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('tracer-score-service');

/**
 * TRACER Score Weights (6 dimensions)
 */
export const TRACER_WEIGHTS = {
  trust: 0.20,
  reliability: 0.20,
  autonomy: 0.15,
  capability: 0.20,
  economics: 0.10,
  reputation: 0.15,
} as const;

/**
 * TRACER Classification thresholds
 */
export const TRACER_THRESHOLDS = {
  excellent: 90,
  good: 75,
  acceptable: 60,
  poor: 40,
} as const;

/**
 * Individual dimension score
 */
export interface DimensionScore {
  score: number;
  weight: number;
  contribution: number;
  maxContribution: number;
  components: Record<string, number | boolean | string>;
}

/**
 * Complete TRACER breakdown
 */
export interface TRACERBreakdown {
  score: number;
  classification: 'excellent' | 'good' | 'acceptable' | 'poor' | 'unreliable';
  dimensions: {
    trust: DimensionScore;
    reliability: DimensionScore;
    autonomy: DimensionScore;
    capability: DimensionScore;
    economics: DimensionScore;
    reputation: DimensionScore;
  };
  lastUpdated: Date;
}

/**
 * Agent data for TRACER calculation
 */
export interface AgentData {
  address: string;
  isProxy: boolean;
  proxyType: string;
  uptime24h: number;
  avgResponseTimeMs: number;
  responseTimeStdDev: number;
  heartbeatCount: number;
  passedHeartbeats: number;
  totalHeartbeatsAllTime: number;
  volumeAvax: number;
  txCount: number;
  ratings: number[];
  daysSinceRegistration: number;
  hasVerifiedWallet: boolean;
  isOpenSource: boolean;
  hasAudits: boolean;
  skillsDeclared: string[];
  skillsVerified: string[];
  canDelegate: boolean;
  hasAutoRecovery: boolean;
  delegatedTasksCount: number;
  trustScoreSnapshots: number;
}

/**
 * Get classification from score
 */
function getClassification(score: number): TRACERBreakdown['classification'] {
  if (score >= TRACER_THRESHOLDS.excellent) return 'excellent';
  if (score >= TRACER_THRESHOLDS.good) return 'good';
  if (score >= TRACER_THRESHOLDS.acceptable) return 'acceptable';
  if (score >= TRACER_THRESHOLDS.poor) return 'poor';
  return 'unreliable';
}

/**
 * Calculate Trust dimension (20%)
 */
function calculateTrust(data: AgentData): DimensionScore {
  let score = 0;

  // Validaciones recibidas (basado en heartbeats totales reales)
  const validationsScore = Math.min(data.totalHeartbeatsAllTime * 0.4, 40);
  score += validationsScore;

  // Wallet verificada
  if (data.hasVerifiedWallet) score += 20;

  // Días activo
  score += Math.min(data.daysSinceRegistration * 0.2, 20);

  // Open source
  if (data.isOpenSource) score += 10;

  // Audits
  if (data.hasAudits) score += 10;

  score = Math.min(Math.round(score), 100);

  return {
    score,
    weight: TRACER_WEIGHTS.trust,
    contribution: Math.round(score * TRACER_WEIGHTS.trust),
    maxContribution: 100 * TRACER_WEIGHTS.trust,
    components: {
      validations: Math.round(validationsScore),
      totalHeartbeats: data.totalHeartbeatsAllTime,
      verifiedWallet: data.hasVerifiedWallet ? 20 : 0,
      daysActive: Math.min(data.daysSinceRegistration * 0.2, 20),
      openSource: data.isOpenSource ? 10 : 0,
      audits: data.hasAudits ? 10 : 0,
    },
  };
}

/**
 * Calculate Reliability dimension (20%)
 */
function calculateReliability(data: AgentData): DimensionScore {
  let score = 0;

  // Uptime (max 40)
  score += (data.uptime24h / 100) * 40;

  // Latencia (max 30)
  if (data.avgResponseTimeMs < 100) score += 30;
  else if (data.avgResponseTimeMs < 300) score += 25;
  else if (data.avgResponseTimeMs < 500) score += 20;
  else if (data.avgResponseTimeMs < 1000) score += 10;

  // Success rate (max 30)
  if (data.heartbeatCount > 0) {
    const successRate = (data.passedHeartbeats / data.heartbeatCount) * 100;
    score += (successRate / 100) * 30;
  }

  score = Math.min(Math.round(score), 100);

  return {
    score,
    weight: TRACER_WEIGHTS.reliability,
    contribution: Math.round(score * TRACER_WEIGHTS.reliability),
    maxContribution: 100 * TRACER_WEIGHTS.reliability,
    components: {
      uptime: Math.round((data.uptime24h / 100) * 40),
      latency: data.avgResponseTimeMs < 100 ? 30
        : data.avgResponseTimeMs < 300 ? 25
        : data.avgResponseTimeMs < 500 ? 20
        : data.avgResponseTimeMs < 1000 ? 10 : 0,
      successRate: data.heartbeatCount > 0 
        ? Math.round((data.passedHeartbeats / data.heartbeatCount) * 30) 
        : 30,
    },
  };
}

/**
 * Calculate Autonomy dimension (15%)
 */
function calculateAutonomy(data: AgentData): DimensionScore {
  let score = 0;

  // Tasa de no intervención (basado en uptime + success rate como proxy de autonomía)
  const successRate = data.heartbeatCount > 0
    ? (data.passedHeartbeats / data.heartbeatCount) * 100
    : 50;
  const noInterventionRate = data.canDelegate
    ? Math.min(successRate, 90)
    : Math.min(successRate * 0.7, 60);
  score += (noInterventionRate / 100) * 40;

  // Delegación
  if (data.canDelegate) {
    score += Math.min(data.delegatedTasksCount * 3, 30);
  }

  // Auto-recovery
  if (data.hasAutoRecovery) {
    score += 30;
  }

  score = Math.min(Math.round(score), 100);

  return {
    score,
    weight: TRACER_WEIGHTS.autonomy,
    contribution: Math.round(score * TRACER_WEIGHTS.autonomy),
    maxContribution: 100 * TRACER_WEIGHTS.autonomy,
    components: {
      noIntervention: Math.round((noInterventionRate / 100) * 40),
      delegation: data.canDelegate ? Math.min(data.delegatedTasksCount * 3, 30) : 0,
      autoRecovery: data.hasAutoRecovery ? 30 : 0,
    },
  };
}

/**
 * Calculate Capability dimension (20%)
 */
function calculateCapability(data: AgentData): DimensionScore {
  let score = 0;

  // Skills verificadas
  if (data.skillsDeclared.length > 0) {
    const ratio = data.skillsVerified.length / data.skillsDeclared.length;
    score += ratio * 35;
  } else {
    score += 10;
  }

  // Outputs verificados (basado en heartbeats exitosos como outputs auditados)
  score += Math.min(data.passedHeartbeats * 0.3, 35);

  // Certificaciones (basado en metadata real)
  score += data.hasAudits ? 20 : (data.txCount > 10 ? 5 : 0);

  score = Math.min(Math.round(score), 100);

  return {
    score,
    weight: TRACER_WEIGHTS.capability,
    contribution: Math.round(score * TRACER_WEIGHTS.capability),
    maxContribution: 100 * TRACER_WEIGHTS.capability,
    components: {
      skillsVerified: data.skillsDeclared.length > 0 
        ? Math.round((data.skillsVerified.length / data.skillsDeclared.length) * 35) 
        : 10,
      verifiedOutputs: Math.min(Math.round(data.passedHeartbeats * 0.3), 35),
      certifications: data.hasAudits ? 20 : (data.txCount > 10 ? 5 : 0),
    },
  };
}

/**
 * Calculate Economics dimension (10%)
 */
function calculateEconomics(data: AgentData): DimensionScore {
  let score = 0;

  // Previsibilidad (basado en varianza de tiempos de respuesta)
  let predictability = 35;
  if (data.heartbeatCount > 3 && data.responseTimeStdDev >= 0) {
    const cv = data.avgResponseTimeMs > 0
      ? data.responseTimeStdDev / data.avgResponseTimeMs
      : 1;
    predictability = cv < 0.2 ? 40 : cv < 0.5 ? 30 : cv < 1.0 ? 20 : 10;
  }
  score += predictability;

  // Eficiencia de gas (basado en volumen real)
  const gasScore = data.volumeAvax > 0
    ? Math.min(Math.round(30 * (1 - Math.min(data.volumeAvax / 100, 0.8))), 30)
    : (data.isProxy ? 20 : 25);
  score += gasScore;

  // Historial de pagos (basado en billing address + ratings recibidos)
  const paymentScore = (data.hasVerifiedWallet ? 15 : 0)
    + Math.min(data.ratings.length * 2, 10)
    + (data.txCount > 0 ? 5 : 0);
  score += Math.min(paymentScore, 30);

  score = Math.min(Math.round(score), 100);

  return {
    score,
    weight: TRACER_WEIGHTS.economics,
    contribution: Math.round(score * TRACER_WEIGHTS.economics),
    maxContribution: 100 * TRACER_WEIGHTS.economics,
    components: {
      predictability,
      gasEfficiency: gasScore,
      paymentHistory: Math.min(paymentScore, 30),
    },
  };
}

/**
 * Calculate Reputation dimension (15%)
 */
function calculateReputation(data: AgentData): DimensionScore {
  let score = 0;

  // Feedback
  if (data.ratings.length > 0) {
    const avg = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
    score += (avg / 5) * 40;
  } else {
    score += 20;
  }

  // Conexiones de confianza (basado en snapshots de trust score como proxy de interacciones)
  const trustConnectionsScore = Math.min(data.trustScoreSnapshots * 3, 30);
  score += trustConnectionsScore;

  // Endosos (basado en ratings reales recibidos)
  const endorsementsScore = data.ratings.length >= 5 ? 20
    : data.ratings.length >= 2 ? 15
    : data.ratings.length >= 1 ? 10
    : 5;
  score += endorsementsScore;

  score = Math.min(Math.round(score), 100);

  return {
    score,
    weight: TRACER_WEIGHTS.reputation,
    contribution: Math.round(score * TRACER_WEIGHTS.reputation),
    maxContribution: 100 * TRACER_WEIGHTS.reputation,
    components: {
      feedback: data.ratings.length > 0 
        ? Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length / 5) * 40) 
        : 20,
      trustConnections: trustConnectionsScore,
      endorsements: endorsementsScore,
    },
  };
}

/**
 * Calculate complete TRACER score
 */
export function calculateTRACERScore(data: AgentData): TRACERBreakdown {
  const trust = calculateTrust(data);
  const reliability = calculateReliability(data);
  const autonomy = calculateAutonomy(data);
  const capability = calculateCapability(data);
  const economics = calculateEconomics(data);
  const reputation = calculateReputation(data);

  const score = Math.round(
    trust.contribution +
    reliability.contribution +
    autonomy.contribution +
    capability.contribution +
    economics.contribution +
    reputation.contribution
  );

  logger.info({
    address: data.address,
    score,
    classification: getClassification(score),
  });

  return {
    score,
    classification: getClassification(score),
    dimensions: {
      trust,
      reliability,
      autonomy,
      capability,
      economics,
      reputation,
    },
    lastUpdated: new Date(),
  };
}

/**
 * Get dimension color for UI
 */
export function getDimensionColor(dimension: string): string {
  const colors: Record<string, string> = {
    trust: '#3B82F6',
    reliability: '#10B981',
    autonomy: '#8B5CF6',
    capability: '#F59E0B',
    economics: '#EF4444',
    reputation: '#EC4899',
  };
  return colors[dimension] || '#6B7280';
}

/**
 * Get classification color for UI
 */
export function getClassificationColor(classification: string): string {
  const colors: Record<string, string> = {
    excellent: '#10B981',
    good: '#3B82F6',
    acceptable: '#F59E0B',
    poor: '#EF4444',
    unreliable: '#6B7280',
  };
  return colors[classification] || '#6B7280';
}
