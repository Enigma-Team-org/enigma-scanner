# Project Structure

```
enigma/
├── prisma/
│   └── schema.prisma              # 14 models
├── src/
│   ├── app/
│   │   ├── (main)/
│   │   │   ├── page.tsx           # Landing (/)
│   │   │   ├── scanner/page.tsx   # Scanner + Dashboard (/scanner)
│   │   │   └── agents/[address]/page.tsx  # Agent profile
│   │   └── api/
│   │       ├── cron/indexer/route.ts      # 4-step cron job
│   │       └── v1/
│   │           ├── agents/
│   │           │   ├── route.ts           # List agents
│   │           │   ├── register/route.ts  # Register (wallet sig)
│   │           │   ├── stats/route.ts
│   │           │   ├── activity/route.ts
│   │           │   ├── sparklines/route.ts
│   │           │   └── [address]/
│   │           │       ├── route.ts               # Agent detail
│   │           │       ├── trust-score/route.ts   # v1 score
│   │           │       ├── enhanced-score/route.ts # v2 score
│   │           │       ├── tracer/route.ts        # TRACER 6D
│   │           │       ├── trust-history/route.ts
│   │           │       ├── heartbeats/route.ts
│   │           │       ├── ratings/route.ts
│   │           │       └── reports/route.ts
│   │           ├── indexer/ (refresh, sync, debug)
│   │           ├── health/route.ts
│   │           └── visitors/ (track, stats)
│   ├── components/
│   │   ├── scanner/               # 11 components + barrel
│   │   │   ├── agent-table.tsx
│   │   │   ├── activity-chart.tsx     # Dashboard widget
│   │   │   ├── kpi-card.tsx           # Dashboard widget
│   │   │   ├── risk-alerts.tsx        # Dashboard widget
│   │   │   ├── recent-activity.tsx    # Dashboard widget
│   │   │   └── top-agents-list.tsx    # Dashboard widget
│   │   ├── agent/                 # Profile components
│   │   ├── layout/                # Header + Footer
│   │   └── shared/                # Loading, Error, Wallet
│   ├── hooks/                     # 6 hooks
│   │   ├── use-agents.ts
│   │   ├── use-agent-trust-history.ts
│   │   ├── use-agent-activity.ts
│   │   └── use-agent-sparklines.ts
│   ├── services/                  # 10 services
│   │   ├── trust-score-service.ts          # v1
│   │   ├── tracer-score-service.ts         # TRACER 6D
│   │   ├── combined-trust-score-service.ts # v2
│   │   ├── transaction-volume-service.ts   # Snowtrace
│   │   ├── reputation-indexer-service.ts   # On-chain ratings
│   │   ├── routescan-indexer-service.ts    # Agent discovery
│   │   ├── heartbeat-service.ts
│   │   ├── proxy-detector.ts
│   │   └── centinela/index.ts
│   └── lib/utils/
├── tests/                         # 44 tests (vitest)
│   ├── tracer-score-service.test.ts   # 31 tests
│   └── validation.test.ts            # 13 tests
└── docs/
    ├── architecture/              # This folder
    └── superteam/                 # Integration phases 0-4
```

## API Endpoints (22 total)

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | /api/v1/agents | - |
| POST | /api/v1/agents/register | Wallet sig |
| GET | /api/v1/agents/stats | - |
| GET | /api/v1/agents/activity | - |
| GET | /api/v1/agents/sparklines | - |
| GET | /api/v1/agents/:address | - |
| GET | /api/v1/agents/:address/trust-score | - |
| GET | /api/v1/agents/:address/enhanced-score | - |
| GET | /api/v1/agents/:address/tracer | - |
| GET | /api/v1/agents/:address/trust-history | - |
| GET | /api/v1/agents/:address/heartbeats | - |
| GET/POST | /api/v1/agents/:address/ratings | Wallet sig (POST) |
| GET/POST | /api/v1/agents/:address/reports | Wallet sig (POST) |
| POST | /api/v1/indexer/refresh | CRON_SECRET |
| POST | /api/v1/indexer/sync | - |
| GET | /api/v1/indexer/debug | CRON_SECRET |
| GET | /api/v1/health | - |
| POST | /api/v1/visitors/track | - |
| GET | /api/v1/visitors/stats | - |
| GET | /api/cron/indexer | CRON_SECRET |
