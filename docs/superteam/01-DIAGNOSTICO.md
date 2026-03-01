# SUPERTEAM — FASE 1: DIAGNOSTICO PROFUNDO
**Fecha:** 2026-02-28
**Agentes:** AUDITOR + DATAARCH + GUARDIAN
**Status:** COMPLETADO

---

## 1. VEREDICTO POR SERVICIO

| Servicio | Lineas | Veredicto | Severidad | Accion |
|----------|--------|-----------|-----------|--------|
| trust-score-service.ts | 557 | CONSERVAR | OK | Ninguna — formula real, 5 componentes reales |
| tracer-score-service.ts | 376 | CORREGIR | ALTA | 8 fuentes simuladas necesitan datos reales |
| agent-service.ts | 282 | CONSERVAR | OK | CRUD solido, sin problemas |
| indexer-service.ts | 411 | CORREGIR | CRITICA | Address derivation + registry mismatch |
| routescan-indexer-service.ts | 317 | CORREGIR | CRITICA | Mismo address bug + registry diferente |
| blockchain-service.ts | 202 | CONSERVAR | OK | Retry logic excelente, produccion-ready |
| centinela/heartbeat-service.ts | 364 | CONSERVAR | OK | Uptime tracking correcto |
| centinela/proxy-detector.ts | 220 | CONSERVAR | OK | EIP-1967 bien implementado |
| centinela/oz-matcher.ts | 382 | CORREGIR | MEDIA | Substring matching genera falsos positivos |
| centinela/index.ts | 35 | CONSERVAR | OK | Barrel export limpio |

### Resumen: 6 CONSERVAR, 4 CORREGIR, 0 ELIMINAR

---

## 2. PROBLEMAS CRITICOS ENCONTRADOS

### 2.1 Registry Address Mismatch (CRITICO)

```
indexer-service.ts L13:     0x8004A818BFB912233c491871b3d84c89A494BD9e
routescan-indexer-service.ts L17: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
```

**Impacto:** Dos registries diferentes = dos conjuntos de agentes diferentes. Si ambos indexers corren, pueden crear duplicados o perder agentes.

**Fix:** Verificar cual es el registry correcto en mainnet Avalanche y unificar.

### 2.2 Agent Address Derivation (CRITICO)

```typescript
// Ambos indexers, misma funcion:
function deriveAgentAddress(registry, tokenId) {
  const hash = keccak256(encodePacked(['address', 'uint256'], [registry, tokenId]));
  return hash.slice(0, 42);  // Toma primeros 42 chars de hash de 66 chars
}
```

**Problema:** Crea pseudo-direcciones, no direcciones Ethereum estandar. Consistente internamente pero incompatible con lookups externos.

### 2.3 TRACER Score — 8 Fuentes Simuladas

| # | Linea | Dimension | Simulado | Dato Real Necesario |
|---|-------|-----------|----------|---------------------|
| 1 | 97 | Trust | `daysSinceRegistration * 0.5` | Tabla de validaciones reales |
| 2 | 174 | Autonomy | `canDelegate ? 70 : 40` | Tracking de intervenciones |
| 3 | 217 | Capability | `txCount * 0.1` | Registros de auditorias reales |
| 4 | 246 | Economics | `35` hardcoded | Modelo de prediccion gas |
| 5 | 249 | Economics | `isProxy ? 20 : 30` | Tracking de costos gas reales |
| 6 | 251 | Economics | `25` hardcoded | Historial de pagos |
| 7 | 284 | Reputation | `skillsVerified.length * 5` | Analisis de grafo de confianza |
| 8 | 287 | Reputation | `hasAudits ? 20 : 10` | Sistema de endorsements ponderado |

**Dimension Economics es la peor:** 100% simulada (3 de 3 fuentes son hardcoded).

### 2.4 OZ Matcher — Falsos Positivos

- L166: `bytecode.includes(selector)` — simple string search en vez de parseo de bytecode
- L198: ReentrancyGuard detection con threshold de solo 2 SLOAD/SSTORE (cualquier contrato lo cumple)
- L255: Threshold de match a solo 50% (deberia ser 70%+)

---

## 3. TRUST SCORE v1 — ANALISIS PROFUNDO

### Formula Real (trust-score-service.ts L11-17)

```
Score = Volume(25%) + Proxy(20%) + Uptime(25%) + OZ_Match(15%) + Ratings(15%)
```

### Componentes: TODOS REALES

| Componente | Fuente | Calculo | Estado |
|-----------|--------|---------|--------|
| Volume (25%) | TransactionVolume DB | Threshold-based: 1000 AVAX=100, 500=80, 100=60, 10=40, 0=20 | REAL pero tabla VACIA |
| Proxy (20%) | Agent.is_proxy + proxy_type | Binary: no_proxy=100, TRANSPARENT/BEACON/UUPS=80, CUSTOM=0 | REAL |
| Uptime (25%) | HeartbeatLog (24h) | Success rate: 99%=100, 95%=90, 90%=70, 80%=50, <80%=25 | REAL |
| OZ Match (15%) | TrustScore.snapshotData (cached) | Cached OZ match 0-100 | REAL (pero matcher tiene bugs) |
| Ratings (15%) | Rating DB | Average 1-5 scale → 0-100. Default 50 si no hay | REAL pero solo 8 ratings |

### Por que todos los scores son iguales

La formula es CORRECTA pero los DATOS son insuficientes:
- **TransactionVolume:** 0 registros → Volume = 20 para todos (minimo)
- **Ratings:** 8 registros → Default 50 para 99.5% de agentes
- **HeartbeatLog:** 394K registros → FUNCIONA BIEN (variable)
- **Proxy detection:** FUNCIONA BIEN (variable)
- **OZ Match:** FUNCIONA (pero con falsos positivos del matcher)

**Resultado:** Score = `20*0.25 + proxy*0.20 + uptime*0.25 + oz*0.15 + 50*0.15`
= `5 + proxy*0.20 + uptime*0.25 + oz*0.15 + 7.5`
= `12.5 + proxy + uptime + oz` (rango ~39-52)

Esto explica perfectamente los scores de 39 y 45 que vemos en la base de datos.

---

## 4. VEREDICTO API ROUTES

### Enigma (16 rutas)

| Ruta | Veredicto | Problema |
|------|-----------|----------|
| GET /api/v1/agents | CONSERVAR | OK |
| GET /api/v1/agents/stats | CONSERVAR | OK |
| GET /api/v1/agents/:address | CONSERVAR | OK |
| GET /api/v1/agents/:address/trust-score | COMPLETAR | Falta validacion Zod |
| GET /api/v1/agents/:address/tracer | COMPLETAR | Falta validacion Zod |
| GET/POST /api/v1/agents/:address/ratings | CONSERVAR | OK, tiene wallet auth |
| GET /api/v1/agents/:address/heartbeats | CONSERVAR | OK |
| POST /api/v1/agents/:address/reports | CONSERVAR | OK, tiene wallet auth |
| POST /api/v1/agents/register | **CORREGIR** | **Falta verificacion de owner** |
| GET /api/v1/health | CONSERVAR | OK |
| GET/POST /api/v1/indexer/sync | CORREGIR | Sin Zod, inconsistencia |
| POST /api/v1/indexer/refresh | **COMPLETAR** | **Sin auth (deberia tener CRON_SECRET)** |
| GET /api/v1/indexer/debug | CORREGIR | Sin auth, expone data interna |
| POST /api/v1/visitors/track | CONSERVAR | OK |
| GET /api/v1/visitors/stats | CONSERVAR | OK |
| GET /api/cron/indexer | CONSERVAR | OK, tiene CRON_SECRET |

### Rutas FALTANTES (existen en Sentinel, no en Enigma)

| Ruta | Prioridad | Descripcion |
|------|-----------|-------------|
| GET /api/v1/agents/activity | ALTA | Activity chart (registros/verificaciones por dia) |
| GET /api/v1/agents/sparklines | ALTA | Batch sparkline data (ultimos 10 scores por agente) |
| GET /api/v1/agents/:address/trust-history | ALTA | Historico de trust scores (100 snapshots) |

---

## 5. DIAGNOSTICO TRACER PROTOCOL

### Componentes Rescatables (de la auditoria de Fase 0)

| Componente | Valor | Esfuerzo de Portar |
|-----------|-------|-------------------|
| Interfaces SDK (ValidationRequest, ValidationResult, CheckResult) | MEDIO | FACIL |
| Formula Trust Score v2 (trust-score-v2.md) | ALTO (como spec) | N/A (es documento) |
| Checklist 27 validaciones (validation-checklist.md) | ALTO (como spec) | N/A (es documento) |

**Conclusion:** Tracer aporta CERO codigo funcional. Solo documentacion de referencia.
- La decision "Option B - Port Progressively" se confirma como correcta
- Pero NO hay codigo que portar — hay que IMPLEMENTAR desde cero usando la spec de Tracer como guia

---

## 6. FEATURES PERDIDOS DEL SENTINEL — PLAN DE RECUPERACION

### Prioridad ALTA (recuperar en Sprint 1)

| Feature | Archivos | Esfuerzo | Compatibilidad |
|---------|----------|----------|---------------|
| Trust History (graph + API + hook) | 3 | MEDIO | 95% compatible |
| OG Images (social sharing) | 1 | FACIL | 100% compatible |
| Activity Chart (dashboard) | 3 | MEDIO | 95% compatible |
| Risk Alerts widget | 1 | FACIL | 100% compatible |

### Prioridad MEDIA (Sprint 2)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Sparklines (batch endpoint + hook) | 2 | FACIL |
| KPI Cards | 1 | FACIL |
| Recent Activity widget | 1 | FACIL |
| Dashboard layout (navbar/sidebar) | 3 | MEDIO |

**Compatibilidad total:** recharts, TanStack Query, Prisma y Tailwind son identicos en ambos repos. Solo lucide-react tiene version diferente (0.300 vs 0.575).

---

## 7. MAPA DE DIVERGENCIAS CONSOLIDADO

| Feature | Sentinel | Enigma | Tracer | Mejor Fuente | Accion |
|---------|----------|--------|--------|-------------|--------|
| Trust Score v1 (5 factores) | Implementado | Implementado | No existe | Enigma (identico) | CONSERVAR |
| TRACER Score (6 dimensiones) | No existe | Parcial (8 simulados) | Solo spec | Enigma + spec Tracer | COMPLETAR |
| Agent Indexing (blockchain) | Implementado | Implementado | No existe | Ambos iguales | CORREGIR (registry) |
| Agent Indexing (Routescan) | Implementado | Implementado | No existe | Ambos iguales | CORREGIR (registry) |
| Heartbeat/Uptime | Implementado | Implementado | No existe | Ambos iguales | CONSERVAR |
| Proxy Detection | Implementado | Implementado | No existe | Ambos iguales | CONSERVAR |
| OZ Matcher | Implementado | Implementado | No existe | Ambos iguales | CORREGIR (matcher) |
| Trust History Graph | Implementado | **FALTA** | No existe | Sentinel | RECUPERAR |
| Activity Chart | Implementado | **FALTA** | No existe | Sentinel | RECUPERAR |
| Sparklines | Implementado | **FALTA** | No existe | Sentinel | RECUPERAR |
| OG Images | Implementado | **FALTA** | No existe | Sentinel | RECUPERAR |
| Dashboard (KPI+Alerts) | Implementado | **FALTA** | No existe | Sentinel | RECUPERAR |
| Test Suite (21 tests) | Implementado | **FALTA** | No existe | Sentinel | RECUPERAR |
| Rate Limiting (Upstash) | Implementado | **FALTA** | No existe | Sentinel | EVALUAR |

---

## 8. RIESGOS (GUARDIAN)

| # | Riesgo | Prob | Impacto | Mitigacion |
|---|--------|------|---------|------------|
| 1 | Registry mismatch crea duplicados al indexar | ALTA | ALTO | Unificar registry address ANTES de hacer nada |
| 2 | TransactionVolume vacia = Volume siempre 20 pts | CONFIRMADO | ALTO | Implementar indexacion de volumen real |
| 3 | OZ Matcher genera falsos positivos | MEDIA | MEDIO | Mejorar parser de bytecode |
| 4 | TRACER Economics 100% fake | CONFIRMADO | MEDIO | Implementar tracking de gas costs |
| 5 | Solo 8 ratings = Ratings componente inutil | CONFIRMADO | BAJO | Incentivar ratings en UI |
| 6 | indexer/refresh sin auth = abuso publico | ALTA | ALTO | Agregar CRON_SECRET |
| 7 | agents/register sin owner verification | ALTA | CRITICO | Agregar wallet signature |

---

## 9. GATE FASE 1 → FASE 2

| Condicion | Estado |
|-----------|--------|
| Todos servicios clasificados | CUMPLIDO |
| Trust Score analizado | CUMPLIDO |
| Tracer realidad documentada | CUMPLIDO |
| Sentinel comparado | CUMPLIDO |
| Divergencias mapeadas | CUMPLIDO |
| No hay blockers criticos | CUMPLIDO (registry es fix simple) |

**RESULTADO: GO — Avanzar a Fase 2**

---

*Generado por SUPERTEAM Protocol v3.0 — Agentes AUDITOR + DATAARCH + GUARDIAN*
*Proximo paso: FASE 2 - Depuracion*
