# SUPERTEAM — FASE 0: INVENTARIO CRUDO
**Fecha:** 2026-02-28
**Agente líder:** AUDITOR
**Status:** COMPLETADO

---

## 1. ENIGMA SCANNER (Producto desplegado)

**Path:** `/Users/jquiceva/Enigma` | **Branch:** `dev-cyberpaisa`
**Build:** PASA | **Stack:** Next.js 14.2 + Prisma 5 + Supabase + Viem

### 1.1 Estructura
- **111 archivos** .ts/.tsx en `src/`
- Directorios: app/(main), app/api, components/(6 subcarpetas), hooks, lib/(4 subcarpetas), services/centinela, types

### 1.2 Servicios (Core)

| Servicio | Lineas | Estado | Notas |
|----------|--------|--------|-------|
| agent-service.ts | 282 | FUNCIONAL | CRUD completo, 8 exports |
| blockchain-service.ts | 202 | FUNCIONAL | ERC-8004 con retry logic |
| indexer-service.ts | 411 | FUNCIONAL | Sync via Transfer events, chunking 2000 bloques |
| routescan-indexer-service.ts | 317 | FUNCIONAL | API Routescan con paginacion |
| trust-score-service.ts | 557 | FUNCIONAL | 5 componentes REALES (Volume/Proxy/Uptime/OZ/Ratings) |
| tracer-score-service.ts | 376 | PARCIAL | 8x "simulado por ahora" — dimensiones hardcodeadas |
| centinela/heartbeat-service.ts | 364 | FUNCIONAL | Ping contratos, calculo uptime |
| centinela/proxy-detector.ts | 220+ | FUNCIONAL | EIP-1967 (BEACON/TRANSPARENT/UUPS/CUSTOM) |
| centinela/oz-matcher.ts | 100+ | PARCIAL | OZ component signatures |

### 1.3 Trust Score v1 — FORMULA REAL

```
TRUST_SCORE_WEIGHTS = {
  VOLUME: 0.25,    // 25% - Transaction volume (REAL - de TransactionVolume DB)
  PROXY: 0.20,     // 20% - Proxy detection (REAL - EIP-1967)
  UPTIME: 0.25,    // 25% - Heartbeat rate (REAL - de HeartbeatLog)
  OZ_MATCH: 0.15,  // 15% - OpenZeppelin match (REAL - cached)
  RATINGS: 0.15,   // 15% - Community ratings (REAL - de Rating DB)
}
```

**COINCIDE EXACTO con la especificacion.** Los 5 componentes calculan valores REALES, no hardcodeados.

### 1.4 TRACER Score — SIMULADO

El tracer-score-service.ts tiene 6 dimensiones (Trust/Reliability/Autonomy/Capability/Economics/Reputation) pero **8 calculos son simulados:**
- Validaciones recibidas: `data.daysSinceRegistration * 0.5` (simulado)
- Autonomia: `canDelegate ? 70 : 40` (simulado)
- Outputs auditados: `txCount * 0.1` (simulado)
- Certificaciones: `hasAudits ? 20 : 0` (simulado)
- Previsibilidad: `35` hardcoded (simulado)
- Eficiencia gas: `isProxy ? 20 : 30` (simulado)
- Conexiones confianza: `skillsVerified.length * 5` (simulado)
- Endosos: `hasAudits ? 20 : 10` (simulado)

### 1.5 API Routes (16 endpoints)

| Endpoint | Metodo | Estado |
|----------|--------|--------|
| /api/v1/agents | GET | FUNCIONAL |
| /api/v1/agents/[address] | GET | FUNCIONAL |
| /api/v1/agents/[address]/trust-score | GET | FUNCIONAL |
| /api/v1/agents/[address]/tracer | GET | FUNCIONAL (datos parciales) |
| /api/v1/agents/register | POST | FUNCIONAL |
| /api/v1/agents/[address]/heartbeats | GET | FUNCIONAL |
| /api/v1/agents/[address]/ratings | POST | FUNCIONAL |
| /api/v1/agents/[address]/reports | POST | FUNCIONAL |
| /api/v1/agents/stats | GET | FUNCIONAL |
| /api/v1/health | GET | FUNCIONAL |
| /api/v1/indexer/sync | GET | FUNCIONAL |
| /api/v1/indexer/refresh | GET | FUNCIONAL |
| /api/v1/indexer/debug | GET | FUNCIONAL |
| /cron/indexer | GET | FUNCIONAL |
| /api/v1/visitors/track | POST | FUNCIONAL |
| /api/v1/visitors/stats | GET | FUNCIONAL |

### 1.6 Prisma Schema
- **19 modelos** (no 14 como se creia)
- Modelos core: Agent, TrustScore, Rating, Report, HeartbeatLog, TransactionVolume
- Enums: AgentType(5), AgentStatus(4), ProxyType(6), ReportReason(4), HeartbeatResult(3), VolumePeriod(4)
- Relaciones bien configuradas con cascade delete

### 1.7 Calidad de Datos

| Metrica | Valor | Veredicto |
|---------|-------|-----------|
| Total agentes | 1,724 | OK |
| Missing address | 0 | OK |
| Missing name | 0 | OK |
| Missing description | 0 | OK |
| Duplicados | 0 | OK |
| Status distribution | 100% VERIFIED | OK |
| **Score = 45** | **1,000 agentes (58%)** | **HARDCODED** |
| **Score = 39** | **720 agentes (42%)** | **HARDCODED** |
| Score 50-59 | 2 agentes (Apex/AvaBuilder) | Unicos reales |
| Heartbeat logs | 394,131 | Activo |
| Trust score records | 664,947 | Alto |
| Ratings | 8 | Muy bajo |
| Scanner results | 0 | Sin uso |
| Transaction volumes | 0 | Sin uso |

**CONCLUSION DATOS:** El 99.88% de agentes tiene score hardcodeado (45 o 39). Solo Apex y AvaBuilder tienen scores calculados realmente. Los componentes Volume y TransactionVolume tienen 0 registros, lo que significa que el 25% de la formula (Volume) retorna 0 para todos.

### 1.8 Problemas Detectados
- 1 TODO pendiente (testnet address en indexer-service.ts)
- 0 codigo muerto
- 7 console statements (en logger, no criticos)
- scanner_results y transaction_volumes = 0 registros (tablas vacias)

### 1.9 Variables de Entorno (11)
CRON_SECRET, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_AVALANCHE_RPC_URL, NEXT_PUBLIC_CHAIN_ENV, NEXT_PUBLIC_SENTRY_DSN, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, NEXT_RUNTIME, NODE_ENV, SUPABASE_SERVICE_ROLE_KEY

---

## 2. TRACER PROTOCOL (Motor avanzado)

**Path:** `/Users/jquiceva/agente_cyber/tracer-protocol`
**Tipo:** pnpm monorepo | **Total archivos:** 15 (excluyendo node_modules)

### 2.1 La Verdad Brutal

| Componente | README dice | Codigo real | % Implementado |
|-----------|-------------|-------------|----------------|
| packages/api | "27+ validation checks" | VACIO (0 archivos) | 0% |
| packages/sdk | "Full TypeScript SDK" | 1 archivo, 135 lineas | 10% |
| packages/contracts | "2 smart contracts, 19 mainnets" | VACIO (0 archivos) | 0% |
| OASF Skills | "20 skills implementados" | Pseudocodigo en .md | 0% |
| Validation checks | "27 checks" | 0 implementados | 0% |
| Trust Score v2 | "RL-optimized scoring" | Solo formula en docs | 0% |
| Agent Lightning | "GRPO reinforcement learning" | No existe | 0% |
| Quick Intel | "63-chain scanning" | No existe | 0% |
| Auto-healing | "5 repair types" | No existe | 0% |

### 2.2 Unico Codigo Real: SDK (135 lineas)

```
packages/sdk/index.ts:
- TracerClient class (89 lineas de logica)
- Metodos: validate(), quickCheck(), fullValidation(), meetsThreshold(), getScore(), heal(), compareAgents()
- PROBLEMA: Llama a endpoints que NO EXISTEN (packages/api esta vacio)
```

**Endpoints que el SDK llama (todos inexistentes):**
- POST /validate
- GET /score/:agentId
- POST /heal/:agentId
- POST /compare

### 2.3 Componentes Rescatables

**RESCATABLE:**
1. Interfaces TypeScript del SDK (ValidationRequest, ValidationResult, CheckResult)
2. Formula Trust Score v2 (documentada en trust-score-v2.md)
3. Checklist de 27 validaciones (como spec, no como codigo)

**NO RESCATABLE (vapor):**
- Todo lo demas — solo documentacion y pseudocodigo

### 2.4 Resumen
- **Total codigo ejecutable:** ~135 lineas (0.5% de lo prometido)
- **Porcentaje de documentacion vs codigo:** 95% docs / 5% codigo
- **Analogia:** Plano detallado de un edificio de 20 pisos, pero solo existe un lobby vacio

---

## 3. SUPER-SENTINEL (Upstream original)

**Path:** `/Users/jquiceva/super-sentinel`
**Stack:** Next.js 15.5 + React 19 + Prisma + Supabase + Vitest

### 3.1 Comparacion General

| Aspecto | Super-Sentinel | Enigma | Delta |
|---------|---------------|--------|-------|
| Archivos TS/TSX | 177 | 131 | -46 (26% menos) |
| Next.js | 15.5 | 14.2 | Sentinel mas nuevo |
| React | 19.2 | 18.3 | Sentinel mas nuevo |
| Tests | 21 archivos | 0 | Removidos en Enigma |
| Rate limiting | Upstash (Redis) | rate-limiter-flexible | Diferente solucion |
| Schema Prisma | IDENTICO | IDENTICO | Sin cambios |

### 3.2 Features PERDIDOS en Enigma (46 archivos)

**PRIORIDAD ALTA (recuperar):**

| Feature | Archivos | Impacto |
|---------|----------|---------|
| Trust History Visualization | hook + page + API route | Usuarios necesitan ver tendencias |
| Dynamic OG Images | opengraph-image.tsx (230 lineas) | Sharing en redes sociales |
| Activity Chart Dashboard | hook + component + API route | Metricas de plataforma |
| Rate Limiting (Upstash) | @upstash/ratelimit + redis | Seguridad API |

**PRIORIDAD MEDIA:**

| Feature | Archivos | Impacto |
|---------|----------|---------|
| Dashboard Layout | navbar + sidebar + layout | UI profesional |
| Sparkline Endpoint | hook + API route | Performance en listas |
| KPI Cards | 4 componentes scanner | Dashboard widgets |
| Agent Grid View | agent-card.tsx | Vista alternativa |

**PRIORIDAD BAJA:**

| Feature | Archivos |
|---------|----------|
| Navigation Progress Bar | 1 componente |
| API Documentation Pages | 2 paginas |

### 3.3 Diferencia Critica: Algoritmo de Trust Score

- **Sentinel:** 5 factores (Volume/Proxy/Uptime/OZ/Ratings)
- **Enigma:** Agrego TRACER de 6 dimensiones (parcialmente simulado)
- **Ambos comparten** el mismo trust-score-service.ts con los 5 factores originales

### 3.4 Test Suite Perdida
Super-Sentinel tiene 21 archivos de test (vitest + coverage). Enigma elimino TODA la infraestructura de testing.

---

## 4. METRICAS CONSOLIDADAS

### Repos

| Repo | Archivos codigo | Funcional | Parcial | Stub | Roto | Muerto |
|------|----------------|-----------|---------|------|------|--------|
| Enigma | 111 | 95% | 5% | 0% | 0% | 0% |
| Tracer | 1 | 0% | 100% | 0% | 0% | 0% |
| Sentinel | 177 | ~95% | ~5% | 0% | 0% | 0% |

### Base de Datos

| Tabla | Registros | Estado |
|-------|-----------|--------|
| Agent | 1,724 | OK (pero scores hardcoded) |
| TrustScore | 664,947 | OK |
| HeartbeatLog | 394,131 | OK |
| Rating | 8 | Muy bajo |
| ScannerResult | 0 | Sin uso |
| TransactionVolume | 0 | Sin uso |

---

## 5. HALLAZGOS CRITICOS

1. **Trust Scores son FAKE** — 99.88% de agentes tienen score exacto de 45 o 39. No hay calculo real masivo.
2. **Tracer Protocol es 95% documentacion** — Solo 135 lineas de codigo ejecutable en todo el repo.
3. **Enigma perdio 46 archivos vs Sentinel** — Features importantes como trust history, OG images, activity charts, y test suite completa.
4. **TransactionVolume y ScannerResult vacios** — 2 tablas sin datos = 25% de la formula Trust Score (Volume) siempre retorna 0.
5. **Solo 8 ratings** en toda la base de datos — El componente Ratings (15%) es casi inutil.
6. **El build PASA** — El codigo compila correctamente a pesar de todo.

---

*Generado por SUPERTEAM Protocol v3.0 — Agente AUDITOR*
*Proximo paso: FASE 1 - Diagnostico Profundo*
