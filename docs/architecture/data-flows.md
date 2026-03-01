# Data Flows

## Flow 1: Agent Registration

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API as API /register
    participant RPC as Avalanche RPC
    participant DB as PostgreSQL (Prisma)

    User->>Frontend: Connect wallet + fill form
    Frontend->>API: POST /api/v1/agents/register
    API->>API: Validate with Zod + verify wallet signature
    API->>RPC: verifyContractExists(address)
    RPC-->>API: Contract exists
    API->>RPC: readAgentMetadata()
    RPC-->>API: ERC-8004 metadata
    API->>DB: prisma.agent.create(status: PENDING)
    API-->>Frontend: 201 { agent }
```

## Flow 2: Indexer Discovery (Cron — 4 Steps)

```mermaid
sequenceDiagram
    participant Cron as Vercel Cron (every 3h)
    participant API as /api/cron/indexer
    participant Routescan as Routescan API
    participant Snowtrace as Snowtrace API
    participant Chain as Reputation Registry
    participant DB as PostgreSQL
    participant Trust as Trust Score Service

    Cron->>API: GET /api/cron/indexer (CRON_SECRET)

    Note over API,Routescan: Step 1: Agent Discovery
    API->>Routescan: Fetch Transfer events
    API->>DB: Upsert agents (VERIFIED)

    Note over API,Chain: Steps 2+3: Data Pipelines (parallel)
    par Transaction Volumes
        API->>Snowtrace: GET txlist per agent
        API->>DB: Upsert TransactionVolume (DAY/WEEK/MONTH)
    and On-chain Ratings
        API->>Chain: getLogs(FeedbackSubmitted)
        API->>DB: Upsert Rating
    end

    Note over API,Trust: Step 4: Score Recalculation
    API->>Trust: recalculateAllScores()
    Trust->>DB: Upsert TrustScore snapshots
    API-->>Cron: { indexed, volumes, ratings, scores, duration }
```

## Flow 3: Trust Score v1 Calculation

```mermaid
flowchart TD
    Start([Calculate Trust Score v1]) --> Parallel
    subgraph Parallel["Data Collection"]
        V[TransactionVolume 24h]
        P[is_proxy + proxy_type]
        U[HeartbeatLogs 24h]
        O[OZ Match data]
        R[Ratings avg]
    end
    Parallel --> Formula["v1 = Volume*0.25 + Proxy*0.20 + Uptime*0.25 + OZ*0.15 + Ratings*0.15"]
    Formula --> Save[Save snapshot + update agent.trust_score]
```

## Flow 4: TRACER Score Calculation

```mermaid
flowchart TD
    Start([Calculate TRACER]) --> Load[Load AgentData from DB]
    Load --> T["Trust 20%: validations + wallet + openSource + audits"]
    Load --> R["Reliability 25%: uptime + latency + consistency"]
    Load --> A["Autonomy 15%: delegation + recovery + noIntervention"]
    Load --> C["Capability 15%: skills + auditedOutputs + taskSuccess"]
    Load --> E["Economics 10%: predictability + gasEfficiency + payments"]
    Load --> Rep["Reputation 15%: feedback + connections + endorsements"]
    T --> Score["Weighted Sum -> Classification"]
    R --> Score
    A --> Score
    C --> Score
    E --> Score
    Rep --> Score
```

## Flow 5: Combined Trust Score v2

```mermaid
flowchart TD
    Start([Enhanced Score v2]) --> Calc
    subgraph Calc["Parallel"]
        V1[Trust Score v1]
        TR[TRACER Score]
        RL[Historical Snapshots x20]
    end
    V1 --> Infra["Infrastructure 50%"]
    TR --> Infra
    V1 --> Comm["Community 20%"]
    TR --> Comm
    TR --> Corr["Correlation 15%"]
    RL --> RLS["RL 15%"]
    Infra --> Final["v2Score = Infra*0.50 + Comm*0.20 + Corr*0.15 + RL*0.15"]
    Comm --> Final
    Corr --> Final
    RLS --> Final
```

## Flow 6: Rating Submission

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Wallet
    participant API as /ratings
    participant DB as PostgreSQL

    User->>Frontend: Select stars (1-5) + comment
    Frontend->>Wallet: signMessage(nonce + timestamp)
    Frontend->>API: POST { score, comment, signature }
    API->>API: Verify wallet signature + cooldown
    API->>DB: Upsert rating (agent + user unique)
    API-->>Frontend: 201 { rating }
```

## Flow 7: Transaction Volume Pipeline

```mermaid
sequenceDiagram
    participant Svc as VolumeService
    participant Snowtrace as Snowtrace API
    participant DB as PostgreSQL

    Svc->>DB: Get VERIFIED agents
    loop Batches of 10
        par Each agent
            Svc->>Snowtrace: GET txlist (30 days)
            Svc->>Svc: Calculate DAY/WEEK/MONTH
            Svc->>DB: Upsert TransactionVolume x3
        end
        Svc->>Svc: Wait 1s (rate limit)
    end
```

## Trust Score Ranges

| Range | Label | Color |
|-------|-------|-------|
| 90-100 | Excellent | Green |
| 75-89 | Good | Blue |
| 60-74 | Acceptable | Yellow |
| 40-59 | Poor | Orange |
| 0-39 | Unreliable | Red |
