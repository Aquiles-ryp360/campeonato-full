# Definición del MVP

> **Versión:** 1.0.0  
> **Duración:** Semanas 1–8  
> **Última actualización:** Junio 2026

---

## 1. Propósito del MVP

El MVP (Producto Mínimo Viable) de **Campeonato** busca validar la hipótesis de negocio: *"Un sistema web puede simplificar la gestión completa de un campeonato de fútbol, desde la inscripción de equipos hasta la generación de carnets digitales"*.

El MVP debe permitir que un administrador organice un campeonato completo con la funcionalidad esencial, sin features avanzados.

---

## 2. Features — IN Scope

### Autenticación y Usuarios
- [x] Registro de usuario (con email + password)
- [x] Inicio de sesión (JWT access + refresh token)
- [x] Roles básicos: SUPER_ADMIN, ADMIN, DELEGATE, REFEREE, VIEWER
- [x] Perfil de usuario (ver/editar datos propios)
- [x] Logout (revocación de refresh token)

### Gestión de Campeonatos
- [x] CRUD de campeonatos (crear, listar, ver, editar, eliminar)
- [x] Estados: BORRADOR, INSCRIPCION, EN_CURSO, FINALIZADO, CANCELADO
- [x] Tipos básicos: LIGA
- [x] CRUD de categorías dentro de un campeonato
- [x] CRUD de temporadas dentro de una categoría

### Gestión de Equipos y Jugadores
- [x] CRUD de equipos (con escudo, colores)
- [x] Asignación de equipo a temporada + categoría
- [x] CRUD de jugadores (nombre, DNI, foto, número, posición)
- [x] Asignación de jugador a equipo
- [x] Delegados de equipo (vincular usuario como delegado)

### Gestión de Canchas y Árbitros
- [x] CRUD de canchas
- [x] Registro de árbitros (vincular usuario como referee)

### Fixture y Partidos
- [x] Generación automática de fixture tipo LIGA_IDA (round-robin)
- [x] Visualización del fixture por jornada
- [x] Registro de resultados (goles local, goles visitante)
- [x] Estados de partido: PROGRAMADO, FINALIZADO, SUSPENDIDO
- [x] Validación: no permitir dos resultados para el mismo partido

### Tabla de Posiciones
- [x] Cálculo automático: PJ, PG, PE, PP, GF, GC, DG, Puntos
- [x] Ordenamiento por puntos, luego DG, luego GF
- [x] Actualización al registrar/modificar un resultado

### Carnets Digitales
- [x] Generación individual de carnet por jugador
- [x] Código QR único por carnet
- [x] Visualización del carnet en pantalla
- [x] Descarga/impresión del carnet

### Dashboard
- [x] Resumen general: cantidad de equipos, jugadores, partidos
- [x] Próximos partidos
- [x] Últimos resultados

### UI/UX
- [x] Diseño responsive (móvil + desktop)
- [x] Navegación por módulos
- [x] Feedback visual (toast, loading states)
- [x] Formularios con validación

---

## 3. Features — OUT of Scope (MVP)

| Feature | Razón | Planning |
|---------|-------|----------|
| Fixture LIGA_IDA_VUELTA | Complejidad extra | Fase 2 — Semana 9 |
| Fixture ELIMINATORIA | Algoritmo más complejo | Fase 2 — Semana 9–10 |
| Fixture GRUPOS + ELIMINATORIA | Multi-fase | Fase 2 — Semana 10 |
| Scheduling automático (fechas/horarios) | No crítico para MVP | Fase 2 — Semana 12 |
| Tarjetas y sanciones | Módulo adicional | Fase 2 — Semana 13 |
| Reportes PDF / Excel | Generación de archivos | Fase 2 — Semana 14–15 |
| Dashboard avanzado (gráficos) | Visualizaciones | Fase 2 — Semana 15 |
| Validación QR desde app externa | Requiere escáner | Fase 3 — Semana 18–19 |
| PWA escáner QR | App dedicada | Fase 3 — Semana 19–20 |
| Notificaciones | Push / WhatsApp | Fase 4 — Semana 25+ |
| Pagos | Integración externa | Fase 4 — Semana 25+ |
| Multi-deporte | Esquema extendido | Fase 4 — Semana 25+ |
| Portal público | Sin autenticación | Fase 4 — Semana 25+ |
| Internacionalización | i18n | Fase 4 |
| Tests E2E | Requiere UI estable | Fase 3 — Semana 22–23 |

---

## 4. User Stories del MVP

| ID | Rol | Historia | Prioridad |
|----|-----|----------|-----------|
| US-001 | ADMIN | Quiero registrarme e iniciar sesión para acceder al sistema | Alta |
| US-002 | ADMIN | Quiero crear un campeonato con nombre y descripción para comenzar la organización | Alta |
| US-003 | ADMIN | Quiero agregar categorías (Libre, +40, Femenil) al campeonato | Alta |
| US-004 | ADMIN | Quiero crear temporadas dentro de una categoría para definir el período de juego | Alta |
| US-005 | ADMIN | Quiero registrar canchas disponibles para asignarlas a los partidos | Alta |
| US-006 | ADMIN | Quiero registrar árbitros para asignarlos a los partidos | Alta |
| US-007 | DELEGATE | Quiero registrar mi equipo con nombre, escudo y colores | Alta |
| US-008 | DELEGATE | Quiero agregar jugadores a mi equipo con sus datos personales | Alta |
| US-009 | ADMIN | Quiero aprobar la inscripción de equipos en una temporada | Alta |
| US-010 | ADMIN | Quiero generar automáticamente el fixture de la temporada | Alta |
| US-011 | ADMIN | Quiero ver el fixture organizado por jornadas | Alta |
| US-012 | REFEREE | Quiero registrar el resultado de un partido (goles) | Alta |
| US-013 | VIEWER | Quiero ver la tabla de posiciones actualizada | Alta |
| US-014 | ADMIN | Quiero generar carnets digitales con QR para los jugadores | Alta |
| US-015 | ADMIN | Quiero ver un dashboard con el resumen del campeonato | Media |
| US-016 | DELEGATE | Quiero ver los partidos de mi equipo en el fixture | Media |
| US-017 | VIEWER | Quiero ver los detalles de un partido | Media |
| US-018 | ADMIN | Quiero editar los datos de un equipo | Media |
| US-019 | ADMIN | Quiero desactivar un jugador | Media |
| US-020 | ADMIN | Quiero cambiar el estado del campeonato (a EN_CURSO, FINALIZADO) | Alta |

---

## 5. Requisitos Técnicos del MVP

### Backend (NestJS)
- [ ] TypeScript estricto (`strict: true`)
- [ ] Arquitectura modular (mínimo 6 módulos)
- [ ] Autenticación JWT con refresh token rotation
- [ ] Guards de autorización por roles
- [ ] Validación de inputs con `class-validator`
- [ ] Documentación Swagger/OpenAPI básica
- [ ] Manejo global de excepciones (filtros NestJS)
- [ ] Logging estructurado

### Base de Datos (PostgreSQL + Prisma)
- [ ] Migraciones automatizadas
- [ ] Seeders para datos de prueba
- [ ] Índices en columnas de búsqueda frecuente
- [ ] Constraints de integridad referencial

### Frontend (Next.js)
- [ ] App Router con layout anidado
- [ ] Server Components + Client Components
- [ ] Tailwind CSS para estilos
- [ ] Formularios controlados con validación cliente
- [ ] Manejo de estado con Server Actions o React Context
- [ ] Protección de rutas (middleware)
- [ ] Página 404 personalizada
- [ ] Loading states (Skeleton loaders)

### Infraestructura
- [ ] Dockerización (Dockerfile + docker-compose)
- [ ] Variables de entorno para configuración
- [ ] Script de setup rápido (`npm run setup`)

---

## 6. Criterios de Aceptación del MVP

### Funcionales
1. **Ciclo completo:** Un ADMIN puede crear un campeonato → agregar categorías → crear temporada → inscribir equipos → registrar jugadores → generar fixture → cargar resultados → ver tabla de posiciones → generar carnets.
2. **Multiusuario:** Los 5 roles pueden iniciar sesión y ven contenido según su permiso.
3. **Fixture correcto:** Un fixture de 6 equipos genera exactamente 15 partidos (5 jornadas de 3 partidos cada una).

### Técnicos
4. **Performance:** Las consultas de tabla de posiciones responden en < 500ms para 20 equipos.
5. **Seguridad:** Las contraseñas se almacenan con bcrypt (cost 12), los tokens JWT expiran en 15 minutos.
6. **Responsive:** La interfaz se ve correctamente en resoluciones de 375px a 1920px.

---

## 7. Definition of Done (DoD)

Para que una feature del MVP se considere completa, debe cumplir TODOS estos criterios:

- [ ] **Código:** Implementado siguiendo la arquitectura hexagonal (capa de dominio, aplicación, infraestructura)
- [ ] **Backend:** Endpoints REST funcionales con validación, auth y manejo de errores
- [ ] **Frontend:** UI funcional con estados de carga, vacío y error
- [ ] **Tests unitarios:** Cobertura > 70% para la feature
- [ ] **Integración:** Funciona end-to-end (front + back + DB)
- [ ] **Sin regresiones:** `npm run test` pasa sin errores
- [ ] **Code Review:** Aprobado por al menos 1 par
- [ ] **Documentación:** Endpoint documentado en Swagger
- [ ] **Migraciones:** Prisma migration generada y aplicable
- [ ] **Responsive:** Funciona en mobile y desktop

---

## 8. Stack Técnico del MVP

```
Frontend:     Next.js 14 + TypeScript + Tailwind CSS
Backend:      NestJS 10 + TypeScript
API:          REST (JSON)
Auth:         JWT (access 15m + refresh 7d)
ORM:          Prisma 5
DB:           PostgreSQL 16
Validation:   class-validator (back) + React Hook Form (front)
Docs:         Swagger (@nestjs/swagger)
Testing:      Jest (unit) + Supertest (e2e API)
Container:    Docker + docker-compose
```

---

## 9. MVP Deliverables

| Artefacto | Formato | Descripción |
|-----------|---------|-------------|
| Repositorio | GitHub | Código fuente completo |
| Documentación | Markdown | Docs en `/docs/` |
| Base de datos | Prisma | Schema + migrations + seeders |
| Docker Compose | YAML | `docker-compose up` para entorno completo |
| Script de setup | bash | `./scripts/setup.sh` instala dependencias y corre migraciones |
| Postman Collection | JSON | Colección de endpoints para testing manual |

---

*Definición del MVP — Campeonato v1.0.0*
