# Roadmap del Proyecto

> **Versión:** 1.0.0  
> **Horizonte:** 24+ semanas  
> **Última actualización:** Junio 2026

---

## Fases del Roadmap

```
Semana:  1  2  3  4  5  6  7  8 | 9  10 11 12 13 14 15 16 | 17 18 19 20 21 22 23 24 | 25+
         ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────
         │    FASE 1: MVP       │  │    FASE 2: CORE      │  │   FASE 3: GROWTH    │  │ F4
         │   Auth, CRUD,        │  │  Fixtures avanzados, │  │  Carnets digitales,  │  │ Mobile
         │   fixture básico,    │  │  scheduling,         │  │  QR validation,      │  │ Pagos
         │   resultados,        │  │  sanciones,          │  │  refinamiento roles, │  │ Multi-
         │   standings,         │  │  reportes PDF/Excel, │  │  performance,        │  │ sport
         │   carnets QR         │  │  dashboard           │  │  testing             │  │ Portal
         └──────────────────────┘  └──────────────────────┘  └──────────────────────┘  └──────
```

---

## Fase 1 — MVP (Semanas 1–8)

### Objetivo
Construir la funcionalidad mínima viable que permita gestionar un campeonato de fútbol de principio a fin: desde la creación del torneo hasta la visualización de la tabla de posiciones y generación de carnets QR.

### Features

| Feature | Semana | Esfuerzo | Dependencias |
|---------|--------|----------|--------------|
| Setup de proyecto (NestJS + Next.js + Prisma + Docker) | 1 | 3 dev-days | Ninguna |
| Modelo de datos completo (Prisma schema + migrations) | 1–2 | 4 dev-days | Setup |
| Autenticación (register, login, JWT, refresh tokens) | 2–3 | 5 dev-days | Modelo datos |
| CRUD de Campeonatos | 3 | 3 dev-days | Auth |
| CRUD de Categorías y Temporadas | 3–4 | 3 dev-days | Campeonatos |
| CRUD de Equipos | 4 | 3 dev-days | Temporadas |
| CRUD de Jugadores | 4–5 | 3 dev-days | Equipos |
| CRUD de Canchas | 5 | 2 dev-days | Campeonatos |
| CRUD + validación de Delegados y Árbitros | 5 | 2 dev-days | Auth, Equipos |
| Fixture generación LIGA_IDA (algoritmo round-robin) | 5–6 | 5 dev-days | Equipos, Temporadas |
| Registro de resultados de partidos | 6 | 3 dev-days | Fixture |
| Tabla de posiciones (cálculo automático) | 6–7 | 3 dev-days | Resultados |
| Generación de carnets con QR | 7 | 4 dev-days | Jugadores |
| Dashboard básico (resumen de datos) | 7–8 | 3 dev-days | Todos los módulos |
| UI/UX responsive (Tailwind) | 1–8 | Continuo | - |
| Testing unitario (core services) | 6–8 | 4 dev-days | - |

### Esfuerzo Total Estimado
- **Dev-days:** ~50–55
- **Equipo sugerido:** 2 devs full-stack + 1 QA parcial

### Criterios de Éxito
- [ ] Un administrador puede crear un campeonato completo con categorías y temporadas
- [ ] Los delegados pueden registrar equipos y jugadores
- [ ] El sistema genera un fixture de liga (ida) automáticamente
- [ ] Se pueden registrar resultados de partidos
- [ ] La tabla de posiciones se actualiza automáticamente
- [ ] Se pueden generar carnets digitales con QR para cada jugador
- [ ] Autenticación funcional para todos los roles
- [ ] Cobertura de tests > 60%

---

## Fase 2 — Core (Semanas 9–16)

### Objetivo
Completar la funcionalidad central del sistema: tipos de fixture avanzados, programación de partidos (scheduling), sistema de sanciones, reportes descargables y dashboard analítico.

### Features

| Feature | Semana | Esfuerzo | Dependencias |
|---------|--------|----------|--------------|
| Fixture LIGA_IDA_VUELTA | 9 | 3 dev-days | F1 fixture |
| Fixture ELIMINATORIA_DIRECTA | 9–10 | 3 dev-days | F1 fixture |
| Fixture GRUPOS_ELIMINATORIA | 10 | 4 dev-days | F1 fixture |
| Fixture LIGA_ELIMINATORIA | 10–11 | 4 dev-days | Fixtures previos |
| Fixture CRUZADO | 11 | 3 dev-days | F1 fixture |
| Fixture PERSONALIZADO (edición manual) | 11–12 | 4 dev-days | Fixture básico |
| Scheduling: asignación de fechas, horarios y canchas | 12–13 | 4 dev-days | Fixtures, Canchas |
| Sistema de tarjetas (amarilla, roja, doble amarilla) | 13 | 3 dev-days | Partidos, Jugadores |
| Sistema de sanciones (automáticas y manuales) | 13–14 | 4 dev-days | Tarjetas |
| Reportes PDF (fixture, standings, sanciones) | 14–15 | 4 dev-days | Módulos core |
| Reportes Excel (exportación de datos) | 15 | 3 dev-days | Módulos core |
| Dashboard avanzado (gráficos, estadísticas) | 15–16 | 4 dev-days | Todos los datos |
| Notificaciones in-app (toast, alertas) | 16 | 2 dev-days | - |
| Testing integración | 14–16 | 4 dev-days | - |

### Esfuerzo Total Estimado
- **Dev-days:** ~50–55
- **Equipo sugerido:** 2 devs full-stack + 1 QA

### Criterios de Éxito
- [ ] Los 7 tipos de fixture están implementados y funcionales
- [ ] Un fixture puede tener fechas, horarios y canchas asignadas
- [ ] Las tarjetas se registran durante los partidos
- [ ] Las sanciones se aplican automáticamente (acumulación de amarillas) o manualmente
- [ ] Reportes PDF y Excel se generan correctamente
- [ ] El dashboard muestra estadísticas relevantes con gráficos
- [ ] Cobertura de tests > 70%

---

## Fase 3 — Growth (Semanas 17–24)

### Objetivo
Evolucionar la plataforma con carnets digitales completos, validación QR en tiempo real, refinamiento de roles, optimización de performance y pruebas exhaustivas.

### Features

| Feature | Semana | Esfuerzo | Dependencias |
|---------|--------|----------|--------------|
| Carnet digital completo (diseño, foto, datos, QR) | 17–18 | 5 dev-days | Carnet F1 |
| Portal público de validación QR (sin auth) | 18–19 | 4 dev-days | Carnet |
| App escáner QR (PWA) | 19–20 | 5 dev-days | Validación QR |
| Refinamiento de roles y permisos granulares | 20–21 | 4 dev-days | Auth |
| Historial de jugador (partidos, tarjetas, sanciones) | 21 | 3 dev-days | Módulos core |
| Optimización de queries (índices, caching, N+1 fixes) | 21–22 | 4 dev-days | - |
| Implementación de Redis para caché | 22 | 3 dev-days | Infraestructura |
| Tests E2E con Playwright | 22–23 | 5 dev-days | - |
| Tests de carga (k6/artillery) | 23 | 3 dev-days | Infraestructura |
| Documentación técnica completa | 23–24 | 3 dev-days | - |
| Mejoras UX generales | 17–24 | Continuo | - |
| Accesibilidad (WCAG 2.1 AA) | 23–24 | 3 dev-days | - |

### Esfuerzo Total Estimado
- **Dev-days:** ~42–48
- **Equipo sugerido:** 2 devs full-stack + 1 QA + 1 DevOps parcial

### Criterios de Éxito
- [ ] Los carnets digitales incluyen foto, datos del jugador, equipo y QR válido
- [ ] La validación QR funciona desde cualquier dispositivo (público)
- [ ] La PWA escáner QR permite validación offline con sincronización
- [ ] Roles y permisos son granulares y configurables
- [ ] Tiempo de carga < 2s para todas las pantallas principales
- [ ] Lighthouse score > 90 en Performance, Accessibility, Best Practices
- [ ] Cobertura de tests > 80%
- [ ] Tests E2E cubren los 5 flujos críticos

---

## Fase 4 — Scale (Semanas 25+)

### Objetivo
Escalar la plataforma a nuevos horizontes: aplicación móvil nativa, notificaciones WhatsApp, sistema de pagos, multi-deporte y portal público.

### Features

| Feature | Esfuerzo | Dependencias | Prioridad |
|---------|----------|--------------|-----------|
| App móvil (React Native / Flutter) | 12–16 weeks | API estable | Alta |
| Notificaciones WhatsApp (Twilio/WhatsApp API) | 3–4 weeks | Contactos, preferencias | Alta |
| Módulo de pagos (inscripciones, multas) | 4–5 weeks | Sistema financiero | Media |
| Integración pasarela de pagos (Mercado Pago, Stripe) | 3–4 weeks | Pagos | Media |
| Multi-deporte (extender esquema para otros deportes) | 6–8 weeks | Arquitectura flexible | Media |
| Portal público (ver fixture, standings, noticias) | 4–5 weeks | API pública | Media |
| Widgets embeddables (fixture en sitios externos) | 3 weeks | Portal público | Baja |
| Internacionalización (i18n: EN, PT) | 4 weeks | Frontend | Baja |
| Live streaming / resultados en vivo | 6–8 weeks | Infraestructura | Baja |
| Integración con API de terceros (Sofascore, etc.) | 4 weeks | API pública | Baja |

### Esfuerzo Total Estimado
- **Dev-days:** 60–80 (por feature stream)
- **Equipo sugerido:** 3–4 devs + 1 QA + 1 DevOps + 1 PM

### Criterios de Éxito
- [ ] App móvil publicada en App Store y Google Play
- [ ] Notificaciones WhatsApp enviadas automáticamente (resultados, cambios fixture)
- [ ] Pagos de inscripciones y multas procesados electrónicamente
- [ ] Sistema soporta fútbol 5, 7, 11, básquet, vóley (al menos 3 deportes)
- [ ] Portal público recibe >1000 visitas/mes
- [ ] Tiempo de actividad (uptime) > 99.9%

---

## Resumen de Esfuerzo Total

| Fase | Semanas | Dev-días | Features | Tests |
|------|---------|----------|----------|-------|
| F1 — MVP | 1–8 | ~52 | 18 | Unitarios core |
| F2 — Core | 9–16 | ~52 | 15 | Integración |
| F3 — Growth | 17–24 | ~45 | 12 | E2E + Carga |
| F4 — Scale | 25+ | ~70 | 10 | Continuos |
| **Total** | **24+** | **~220+** | **55+** | - |

---

## Gestión de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Scope creep en MVP | Alta | Alto | Congelar features post-MVP, backlog priorizado |
| Carga de datos históricos | Media | Medio | Scripts de migración, seeders automáticos |
| Rendimiento en fixtures grandes (+20 equipos) | Media | Alto | Pruebas de carga tempranas, optimización de algoritmo |
| Curva de aprendizaje NestJS | Baja | Medio | Pair programming, code reviews |
| Cambios en requisitos de carnets | Media | Medio | Diseño flexible del módulo de carnets |

---

*Roadmap — Campeonato v1.0.0*
