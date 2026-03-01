import { vi } from 'vitest';

// Mock Prisma
vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    agent: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    trustScore: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    heartbeatLog: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    rating: {
      findMany: vi.fn(),
    },
    transactionVolume: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));
