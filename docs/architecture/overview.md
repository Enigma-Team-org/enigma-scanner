# System Architecture

## High-Level Diagram

```mermaid
graph TB
    subgraph Frontend["Frontend (Next.js 14 App Router)"]
        Landing[Landing Page]
        Scanner[Scanner / Directory<br/>+ Dashboard Widgets]
        Profile[Agent Profile]
        Register[Register Agent]
    end

    subgraph API["API Layer (Next.js API Routes — 22 endpoints)"]
        AgentsAPI["/agents<br/>(list, detail, register)"]
        TrustAPI["/trust-score<br/>/trust-history<br/>/enhanced-score"]
        TracerAPI["/tracer<br/>TRACER 6D Score"]
        RatingsAPI["/ratings<br/>/reports"]
        IndexerAPI["/indexer<br/>(refresh, sync, debug)"]
        DataAPI["/activity<br/>/sparklines<br/>/stats"]
        HealthAPI["/health<br/>/visitors"]
        CronAPI["/cron/indexer<br/>Scheduled Jobs"]
    end

    subgraph Services["Services Layer"]
        AgentSvc[Agent Service<br/>CRUD + Filtering]
        TrustSvc[Trust Score v1<br/>5-Component Formula]
        TracerSvc[TRACER Score<br/>6-Dimension Analysis]
        CombinedSvc[Combined Trust Score v2<br/>4-Pillar Formula]

        subgraph Centinela["Centinela Engine"]
            Heartbeat[Heartbeat Service<br/>Contract Pings]
            ProxyDet[Proxy Detector<br/>EIP-1967 Analysis]
            OZMatch[OZ Matcher<br/>Bytecode Comparison]
        end

        subgraph DataPipelines["Data Pipelines"]
            VolumeSvc[Transaction Volume<br/>Snowtrace Indexer]
            ReputationSvc[Reputation Indexer<br/>On-chain Ratings]
        end

        IndexerSvc[Routescan Indexer<br/>Agent Discovery<br/>+ SSRF Protection]
        BlockchainSvc[Blockchain Service<br/>RPC Interactions]
    end

    subgraph Data["Data Layer"]
        Prisma[(PostgreSQL<br/>via Prisma ORM<br/>hosted on Supabase)]
    end

    subgraph Blockchain["Avalanche C-Chain"]
        Registry["ERC-8004<br/>Identity Registry<br/>0x8004A169..."]
        Reputation["Reputation Registry<br/>0x8004B663..."]
        Agents[Agent Smart Contracts<br/>ERC-8004 Compliant]
    end

    subgraph External["External Services"]
        Routescan[Routescan API<br/>Block Explorer]
        Snowtrace[Snowtrace API<br/>Transaction Data]
        Sentry[Sentry<br/>Error Tracking]
        Vercel[Vercel<br/>Hosting + Cron]
    end

    Frontend -->|TanStack Query| API
    API --> Services
    Services --> Prisma
    Services -->|viem| Blockchain
    IndexerSvc -->|Paginated Fetch| Routescan
    VolumeSvc -->|TX History| Snowtrace
    ReputationSvc -->|FeedbackSubmitted Events| Reputation
    Vercel -->|Cron every 3h| CronAPI
    API -.->|Errors| Sentry

    classDef frontend fill:#1e293b,stroke:#4ADE80,color:#e5e7eb
    classDef api fill:#1e293b,stroke:#22d3ee,color:#e5e7eb
    classDef service fill:#1e293b,stroke:#fcd34d,color:#e5e7eb
    classDef data fill:#1e293b,stroke:#a78bfa,color:#e5e7eb
    classDef blockchain fill:#1e293b,stroke:#fb7185,color:#e5e7eb
```

## Request Lifecycle

```mermaid
flowchart LR
    Client([Client Request]) --> MW[Middleware]
    MW --> RL{Rate Limit<br/>Check}
    RL -->|Exceeded| R429[429 Too Many Requests]
    RL -->|OK| SEC[Add Security Headers]
    SEC --> AUTH{Supabase Session<br/>Refresh}
    AUTH --> Route[API Route Handler]
    Route --> Val{Zod<br/>Validation}
    Val -->|Invalid| R400[400 ValidationError]
    Val -->|Valid| Svc[Service Layer]
    Svc --> DB[(Database)]
    DB --> Res[Format Response]
    Res --> Client
```

## Scoring Architecture

```mermaid
graph TB
    subgraph V1["Trust Score v1 (5 Components)"]
        Volume["Volume 25%<br/>Transaction activity"]
        Proxy["Proxy 20%<br/>EIP-1967 analysis"]
        Uptime["Uptime 25%<br/>Heartbeat pass rate"]
        OZ["OZ Match 15%<br/>Bytecode similarity"]
        Ratings["Ratings 15%<br/>User feedback"]
    end

    subgraph TRACER["TRACER Score (6 Dimensions)"]
        Trust["Trust 20%<br/>Validations + wallet + audits"]
        Reliability["Reliability 25%<br/>Uptime + latency + consistency"]
        Autonomy["Autonomy 15%<br/>Delegation + recovery"]
        Capability["Capability 15%<br/>Skills + audited outputs"]
        Economics["Economics 10%<br/>Predictability + gas + payments"]
        Rep["Reputation 15%<br/>Feedback + connections + endorsements"]
    end

    subgraph V2["Combined Trust Score v2 (4 Pillars)"]
        Infra["Infrastructure 50%<br/>v1 uptime + TRACER reliability<br/>+ v1 proxy + v1 ozMatch"]
        Community["Community 20%<br/>v1 ratings + TRACER reputation"]
        Correlation["Correlation 15%<br/>Cross-dimensional consistency"]
        RL["RL 15%<br/>Historical trend + stability"]
    end

    V1 --> Infra
    V1 --> Community
    TRACER --> Infra
    TRACER --> Community
    TRACER --> Correlation
    V1 --> RL

    V2 --> Score["Enhanced Score 0-100<br/>excellent/good/acceptable/poor/unreliable"]
```

## System Components

### Frontend (Next.js App)

**Responsibilities**:
- Render UI (landing, scanner with dashboard widgets, agent profile)
- Connect wallet (wagmi + viem)
- Consume REST API via TanStack Query
- Client-side validation (Zod)
- Dashboard: ActivityChart, TopAgentsList, RiskAlerts, RecentActivity, KpiCard

### Backend (Next.js API Routes — 22 endpoints)

**Responsibilities**:
- Expose REST endpoints
- Validate requests (Zod schemas)
- Authenticate wallets (verify signatures with viem)
- Database queries via Prisma ORM
- Avalanche RPC queries (via viem with fallback transport)
- Rate limiting (100/min default, 5/hour registration)
- Structured logging (Pino)

### Indexer (Background Job)

**Responsibilities**:
- Run every 3 hours via Vercel Cron
- Step 1: Scan ERC-8004 Identity Registry via Routescan API
- Step 2: Sync transaction volumes from Snowtrace API
- Step 3: Import on-chain ratings from Reputation Registry
- Step 4: Recalculate trust scores for all agents
- SSRF protection on tokenURI fetching (isUrlSafe)

### Centinela (Verification Engine)

**Responsibilities**:
- **Heartbeat**: Ping agent contracts to verify uptime
- **Proxy Detection**: Analyze EIP-1967 storage slots
- **OZ Matcher**: Compare bytecode against OpenZeppelin selectors

### TRACER Score Engine

**Responsibilities**:
- 6-dimension trust analysis using real DB data
- Trust(20%) + Reliability(25%) + Autonomy(15%) + Capability(15%) + Economics(10%) + Reputation(15%)

### Combined Trust Score v2

**Responsibilities**:
- Merge v1 + TRACER into 4 pillars
- Infrastructure(50%) + Community(20%) + Correlation(15%) + RL(15%)
- Historical trend analysis with reinforcement learning

### Data Pipelines

- **Transaction Volume**: Snowtrace API, DAY/WEEK/MONTH
- **Reputation Indexer**: FeedbackSubmitted events from 0x8004B663

### Database (Supabase PostgreSQL + Prisma)

- 14 models: Agent, TrustScore, Rating, HeartbeatLog, TransactionVolume, etc.

## Contract Addresses

| Registry | Address | Purpose |
|----------|---------|---------|
| Identity | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | ERC-8004 agent registration |
| Reputation | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | On-chain feedback/ratings |

## TRACER Validation Checklist (27 Checks)

| Category | Checks | Max Points |
|----------|--------|------------|
| Metadata | 6 checks | 40 |
| Infrastructure | 8 checks | 35 |
| AWS/Cloud | 8 checks | 25 |
| x402 Payment | 2 checks | 10 |
| Bonus | 3 checks | 10 |
| **Total** | **27** | **120** |

Critical checks: AGENTURL_PARSEABLE, TLS_VALID, HEALTH_2XX
Result: PASS >= 70, PARTIAL >= 40, FAIL < 40
