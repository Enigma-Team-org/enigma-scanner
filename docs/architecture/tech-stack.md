# Tech Stack

## Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2+ | React framework, App Router |
| TypeScript | 5.3+ | Type safety |
| React | 18.3+ | UI Library |
| TailwindCSS | 3.4+ | Utility-first CSS |
| shadcn/ui | latest | Component library |
| wagmi | 2.x | Wallet connection hooks |
| viem | 2.x | Ethereum library |
| TanStack Query | 5.x | Server state + caching |
| TanStack Table | 8.x | Headless table |
| Recharts | 2.x | Charts + sparklines |
| Zod | 3.x | Schema validation |
| react-hook-form | 7.x | Form management |
| lucide-react | latest | Icons |

## Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 14.2+ | REST API (22 endpoints) |
| Supabase | latest | Managed PostgreSQL + Auth |
| Prisma | 5.x | Type-safe ORM |
| pino | 8.x | Structured JSON logging |

## Blockchain

| Technology | Purpose |
|------------|---------|
| viem 2.x | RPC interactions, event parsing |
| Avalanche C-Chain | Main network |

## External APIs

| Service | Purpose |
|---------|---------|
| Routescan | Agent discovery |
| Snowtrace | Transaction volumes |
| Reputation Registry (0x8004B663) | On-chain ratings |

## Scoring Engines

| Engine | Formula |
|--------|---------|
| Trust Score v1 | Volume(25%) + Proxy(20%) + Uptime(25%) + OZ(15%) + Ratings(15%) |
| TRACER Score | Trust(20%) + Reliability(25%) + Autonomy(15%) + Capability(15%) + Economics(10%) + Reputation(15%) |
| Combined v2 | Infrastructure(50%) + Community(20%) + Correlation(15%) + RL(15%) |

## Testing

| Technology | Tests |
|------------|-------|
| Vitest 4.x | 44 tests (TRACER 31 + validation 13) |

## TRACER Validation (27 Checks / 120 Points)

| Category | Checks | Points |
|----------|--------|--------|
| Metadata | 6 | 40 |
| Infrastructure | 8 | 35 |
| AWS/Cloud | 8 | 25 |
| x402 Payment | 2 | 10 |
| Bonus | 3 | 10 |
