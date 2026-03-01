import { describe, it, expect } from 'vitest';
import {
  calculateTRACERScore,
  TRACER_WEIGHTS,
  TRACER_THRESHOLDS,
} from '@/services/tracer-score-service';
import { mockAgentHealthy, mockAgentNew, mockAgentProxy } from './fixtures/agents';

describe('TRACER Score Service', () => {
  describe('calculateTRACERScore', () => {
    it('returns score between 0 and 100', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('returns all 6 dimensions', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      expect(result.dimensions).toHaveProperty('trust');
      expect(result.dimensions).toHaveProperty('reliability');
      expect(result.dimensions).toHaveProperty('autonomy');
      expect(result.dimensions).toHaveProperty('capability');
      expect(result.dimensions).toHaveProperty('economics');
      expect(result.dimensions).toHaveProperty('reputation');
    });

    it('classifies healthy agent as good or excellent', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      expect(['excellent', 'good']).toContain(result.classification);
    });

    it('scores new agent lower than healthy agent', () => {
      const healthy = calculateTRACERScore(mockAgentHealthy);
      const newAgent = calculateTRACERScore(mockAgentNew);
      expect(healthy.score).toBeGreaterThan(newAgent.score);
    });

    it('includes lastUpdated timestamp', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('dimension weights', () => {
    it('weights sum to 1.0', () => {
      const sum = Object.values(TRACER_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0);
    });

    it('trust weight is 0.20', () => {
      expect(TRACER_WEIGHTS.trust).toBe(0.20);
    });
  });

  describe('Trust dimension', () => {
    it('gives higher score for more heartbeats', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      const trust = result.dimensions.trust;
      expect(trust.score).toBeGreaterThan(0);
      expect(trust.components.validations).toBeGreaterThan(0);
    });

    it('rewards verified wallet', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      expect(result.dimensions.trust.components.verifiedWallet).toBe(20);
    });

    it('rewards open source', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      expect(result.dimensions.trust.components.openSource).toBe(10);
    });

    it('rewards audits', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      expect(result.dimensions.trust.components.audits).toBe(10);
    });

    it('new agent has zero validations', () => {
      const result = calculateTRACERScore(mockAgentNew);
      expect(result.dimensions.trust.components.validations).toBe(0);
    });
  });

  describe('Reliability dimension', () => {
    it('uptime contributes to score', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      const reliability = result.dimensions.reliability;
      expect(reliability.components.uptime).toBeGreaterThan(0);
    });

    it('fast response gets max latency score', () => {
      const fast = { ...mockAgentHealthy, avgResponseTimeMs: 50 };
      const result = calculateTRACERScore(fast);
      expect(result.dimensions.reliability.components.latency).toBe(30);
    });

    it('slow response gets lower latency score', () => {
      const slow = { ...mockAgentHealthy, avgResponseTimeMs: 1500 };
      const result = calculateTRACERScore(slow);
      expect(result.dimensions.reliability.components.latency).toBe(0);
    });
  });

  describe('Autonomy dimension', () => {
    it('delegation capability improves score', () => {
      const withDelegation = calculateTRACERScore(mockAgentHealthy);
      const withoutDelegation = calculateTRACERScore(mockAgentProxy);
      expect(withDelegation.dimensions.autonomy.score).toBeGreaterThan(
        withoutDelegation.dimensions.autonomy.score
      );
    });

    it('auto recovery gives 30 points', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      expect(result.dimensions.autonomy.components.autoRecovery).toBe(30);
    });
  });

  describe('Economics dimension', () => {
    it('stable response time gives higher predictability', () => {
      const stable = { ...mockAgentHealthy, responseTimeStdDev: 10, avgResponseTimeMs: 100 };
      const result = calculateTRACERScore(stable);
      expect(result.dimensions.economics.components.predictability).toBe(40);
    });

    it('high variance gives lower predictability', () => {
      const unstable = { ...mockAgentHealthy, responseTimeStdDev: 500, avgResponseTimeMs: 200 };
      const result = calculateTRACERScore(unstable);
      expect(result.dimensions.economics.components.predictability).toBeLessThan(40);
    });

    it('payment history uses real data', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      const ph = result.dimensions.economics.components.paymentHistory as number;
      expect(ph).toBeGreaterThan(0);
    });
  });

  describe('Reputation dimension', () => {
    it('ratings contribute to feedback score', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      expect(result.dimensions.reputation.components.feedback).toBeGreaterThan(0);
    });

    it('trust score snapshots contribute to connections', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      expect(result.dimensions.reputation.components.trustConnections).toBeGreaterThan(0);
    });

    it('many ratings give higher endorsements', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      expect(result.dimensions.reputation.components.endorsements).toBe(20);
    });

    it('no ratings give base endorsement', () => {
      const result = calculateTRACERScore(mockAgentNew);
      expect(result.dimensions.reputation.components.endorsements).toBe(5);
    });
  });

  describe('Classification thresholds', () => {
    it('score >= 90 is excellent', () => {
      expect(TRACER_THRESHOLDS.excellent).toBe(90);
    });

    it('score >= 75 is good', () => {
      expect(TRACER_THRESHOLDS.good).toBe(75);
    });

    it('score >= 60 is acceptable', () => {
      expect(TRACER_THRESHOLDS.acceptable).toBe(60);
    });

    it('score >= 40 is poor', () => {
      expect(TRACER_THRESHOLDS.poor).toBe(40);
    });
  });

  describe('Edge cases', () => {
    it('handles zero heartbeats gracefully', () => {
      const result = calculateTRACERScore(mockAgentNew);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('handles proxy agent correctly', () => {
      const result = calculateTRACERScore(mockAgentProxy);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('each dimension contribution does not exceed max', () => {
      const result = calculateTRACERScore(mockAgentHealthy);
      for (const [key, dim] of Object.entries(result.dimensions)) {
        expect(dim.contribution).toBeLessThanOrEqual(dim.maxContribution);
        expect(dim.score).toBeLessThanOrEqual(100);
        expect(dim.score).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
