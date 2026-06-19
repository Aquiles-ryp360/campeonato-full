# Campeonato — Sistema de Gestión de Campeonatos de Fútbol

> Documentación oficial del proyecto **Campeonato**, un sistema integral para la gestión de campeonatos de fútbol con arquitectura moderna, soporte multi-rol y generación de carnets digitales con validación QR.

---

## Índice de Documentación

### 📐 Arquitectura

| Documento | Descripción |
|-----------|-------------|
| [Arquitectura del Sistema](architecture/README.md) | Visión general, estilo arquitectónico, diagramas de capas y componentes, flujo de datos, stack tecnológico, decisiones de diseño, seguridad y escalabilidad |
| [Diagrama Entidad-Relación](architecture/database-er.md) | DER en ASCII, definiciones detalladas de todas las entidades con columnas, tipos, constraints, relaciones e índices |

### 🗺️ Roadmap

| Documento | Descripción |
|-----------|-------------|
| [Roadmap del Proyecto](roadmap/README.md) | Planificación completa en 4 fases: MVP, Core, Growth y Scale con objetivos, features, esfuerzo estimado y criterios de éxito |
| [Definición del MVP](roadmap/mvp.md) | Alcance del MVP, features IN/OUT, user stories, requisitos técnicos y Definition of Done |

### 🔌 API

| Documento | Descripción |
|-----------|-------------|
| [Documentación de API](api/README.md) | Endpoints completos por módulo con métodos HTTP, paths, auth, roles, bodies de request y códigos de error |

### 📋 Casos de Uso

| Documento | Descripción |
|-----------|-------------|
| [Casos de Uso Detallados](use-cases/README.md) | 10 casos de uso con actores, precondiciones, flujo principal, flujos alternos y reglas de negocio |
| [Historias de Usuario](use-cases/user-stories.md) | 30+ historias de usuario cubriendo todos los roles y funcionalidades |

### 🎨 Mockups

| Documento | Descripción |
|-----------|-------------|
| [Descripción de Pantallas](mockups/README.md) | Wireframes textuales de 10+ pantallas del sistema |

---

## Resumen del Proyecto

**Campeonato** es un sistema web de gestión de campeonatos de fútbol diseñado para administrar desde la creación de torneos hasta la generación de carnets digitales con validación QR. Utiliza una arquitectura limpia (Hexagonal) con separación clara de responsabilidades, permitiendo escalabilidad, mantenibilidad y testeabilidad.

### Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| `SUPER_ADMIN` | Acceso total al sistema, gestión de administradores |
| `ADMIN` | Gestión de campeonatos, equipos, partidos y configuraciones |
| `DELEGATE` | Delegado de equipo, puede gestionar jugadores y ver información del equipo |
| `REFEREE` | Árbitro, puede registrar resultados y sanciones |
| `VIEWER` | Visibilidad de lectura en todas las entidades públicas |

### Stack Tecnológico Principal

- **Frontend:** Next.js 14 (App Router)
- **Backend:** NestJS con REST API
- **Base de Datos:** PostgreSQL + Prisma ORM
- **Autenticación:** JWT + Refresh Tokens
- **Despliegue:** Docker + CI/CD

---

*Documentación generada para el proyecto Campeonato — v1.0.0*
