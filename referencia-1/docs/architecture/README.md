# Arquitectura del Sistema

> **Versión:** 1.0.0  
> **Última actualización:** Junio 2026

---

## 1. Visión General

**Campeonato** es un sistema de gestión de campeonatos de fútbol construido con una arquitectura hexagonal (puertos y adaptadores) que separa claramente la lógica de dominio de las preocupaciones técnicas. El sistema expone una API REST desde NestJS, consume desde un frontend Next.js, y persiste datos en PostgreSQL a través de Prisma ORM.

---

## 2. Estilo Arquitectónico: Hexagonal / Clean Architecture

```
                         ┌─────────────────────────────────────┐
                         │            WEB CLIENT               │
                         │        (Browser / Mobile)           │
                         └───────────────┬─────────────────────┘
                                         │ HTTP
                                         ▼
                    ┌────────────────────────────────────────┐
                    │          ADAPTADORES PRIMARIOS         │
                    │          (Driving Adapters)            │
                    │                                        │
                    │  ┌──────────┐  ┌──────────────────┐   │
                    │  │ REST     │  │ Next.js SSR      │   │
                    │  │ Controllers│  │ Pages/Components│   │
                    │  └─────┬────┘  └────────┬─────────┘   │
                    └────────┼─────────────────┼─────────────┘
                             │                 │
                    ┌────────▼─────────────────▼─────────────┐
                    │           PUERTOS DE ENTRADA           │
                    │         (Input Ports / Interfaces)      │
                    │   ┌─────────────────────────────┐      │
                    │   │   ApplicationService         │      │
                    │   │   interfaces                 │      │
                    │   └─────────────────────────────┘      │
                    └────────────────────────────────────────┘
                                      │
                    ┌──────────────────▼──────────────────────┐
                    │         CAPA DE APLICACIÓN              │
                    │         (Application Services)          │
                    │                                         │
                    │  ┌──────────┐ ┌──────────┐ ┌────────┐  │
                    │  │ Auth     │ │Campeonato│ │ Fixture│  │
                    │  │ Service  │ │ Service  │ │ Service│  │
                    │  └──────────┘ └──────────┘ └────────┘  │
                    │  ┌──────────┐ ┌──────────┐ ┌────────┐  │
                    │  │ Equipo   │ │ Partido  │ │ Carnet │  │
                    │  │ Service  │ │ Service  │ │ Service│  │
                    │  └──────────┘ └──────────┘ └────────┘  │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────┐
                    │         PUERTOS DE SALIDA               │
                    │        (Output Ports / Interfaces)       │
                    │   ┌─────────────────────────────┐      │
                    │   │   Repository interfaces     │      │
                    │   └─────────────────────────────┘      │
                    └────────────────────────────────────────┘
                                      │
                    ┌──────────────────▼──────────────────────┐
                    │         ADAPTADORES SECUNDARIOS         │
                    │        (Driven Adapters)                │
                    │                                         │
                    │  ┌──────────┐ ┌──────────┐ ┌────────┐  │
                    │  │ Prisma   │ │ JWT      │ │ QR     │  │
                    │  │ Repo    │ │ Provider │ │ Generator│  │
                    │  └──────────┘ └──────────┘ └────────┘  │
                    │  ┌──────────┐ ┌──────────┐ ┌────────┐  │
                    │  │ PDF      │ │ Excel    │ │ Email  │  │
                    │  │ Generator│ │ Generator│ │ Service│  │
                    │  └──────────┘ └──────────┘ └────────┘  │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────┐
                    │         INFRAESTRUCTURA EXTERNA         │
                    │                                         │
                    │  ┌──────────┐    ┌──────────────────┐   │
                    │  │PostgreSQL│    │   File System    │   │
                    │  │   DB     │    │  (Photos/PDFs)   │   │
                    │  └──────────┘    └──────────────────┘   │
                    └────────────────────────────────────────┘
```

### Principios de la Arquitectura Hexagonal

1. **Independencia del framework:** El dominio no depende de NestJS, Next.js ni ningún framework externo.
2. **Testeabilidad:** Cada capa puede probarse de forma aislada mediante mocks en los puertos.
3. **Independencia de la UI:** La interfaz de usuario puede cambiarse sin afectar la lógica de negocio.
4. **Independencia de la base de datos:** PostgreSQL puede reemplazarse cambiando solo el adaptador de infraestructura.
5. **Independencia de agentes externos:** Servicios de QR, PDF, Excel son adaptadores intercambiables.

---

## 3. Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTACIÓN                                │
│                                                                     │
│  ┌─────────────────────┐  ┌────────────────────────────────────┐   │
│  │   Next.js (App)     │  │   Páginas, Componentes, Layouts   │   │
│  │   React/TypeScript  │  │   Server Components, Client CPs    │   │
│  └─────────┬───────────┘  └────────────────────────────────────┘   │
│            │                    Consume API via fetch/axios        │
├────────────┼────────────────────────────────────────────────────────┤
│            ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    API (NestJS Controllers)                  │   │
│  │                                                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │Auth      │ │Campeonato│ │ Equipo   │ │ Partido      │  │   │
│  │  │Controller│ │Controller│ │Controller│ │ Controller   │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │Fixture   │ │Carnet    │ │Sancion   │ │ Reporte      │  │   │
│  │  │Controller│ │Controller│ │Controller│ │ Controller   │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                    │                               │
├────────────────────────────────────┼───────────────────────────────┤
│                                    ▼                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   APLICACIÓN (Services)                      │   │
│  │                                                             │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐    │   │
│  │  │ AuthService  │ │CampeonatoSvc │ │ FixtureService  │    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘    │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐    │   │
│  │  │ EquipoService│ │ PartidoSvc   │ │ CarnetService   │    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘    │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐    │   │
│  │  │ SancionSvc   │ │ ReporteSvc   │ │ DashboardSvc    │    │   │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                    │                               │
├────────────────────────────────────┼───────────────────────────────┤
│                                    ▼                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    DOMINIO (Entities)                        │   │
│  │                                                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ User     │ │Campeonato│ │Categoria │ │ Temporada    │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ Equipo   │ │ Jugador  │ │ Partido  │ │ Fixture      │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ Tarjeta  │ │ Sancion  │ │ Carnet   │ │ Standings    │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                    │                               │
├────────────────────────────────────┼───────────────────────────────┤
│                                    ▼                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  INFRAESTRUCTURA                             │   │
│  │                                                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ Prisma   │ │ JWT      │ │ Bcrypt   │ │ QR Code     │  │   │
│  │  │ Provider │ │ Provider │ │ Provider │ │ Generator    │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ PDF      │ │ Excel    │ │ S3/Cloud │ │ Email        │  │   │
│  │  │ Generator│ │ Generator│ │ Storage  │ │ Service      │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                    │                               │
├────────────────────────────────────┼───────────────────────────────┤
│                                    ▼                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    BASE DE DATOS                             │   │
│  │                    PostgreSQL                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Diagrama de Componentes

```
┌──────────┐       ┌──────────────────────────────────────────────────┐
│          │       │              SERVIDOR NEXT.JS                    │
│  WEB     │       │                                                  │
│  BROWSER │──────▶│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│          │       │  │ Server   │  │ Client   │  │ API Client   │  │
│  (React) │       │  │Components│  │Components│  │ (fetch/axios)│  │
│          │       │  └──────────┘  └──────────┘  └──────┬───────┘  │
└──────────┘       └─────────────────────────────────────┼──────────┘
                                                          │ HTTP
                                                          ▼
                           ┌──────────────────────────────────────────┐
                           │           SERVIDOR NESTJS                │
                           │                                          │
                           │  ┌────────────┐  ┌──────────────────┐   │
                           │  │ Auth Guard │  │   Controllers    │   │
                           │  │(JWT Verify)│  │  (REST Endpoints)│   │
                           │  └────────────┘  └────────┬─────────┘   │
                           │                            │             │
                           │  ┌─────────────────────────▼──────────┐  │
                           │  │        Application Services        │  │
                           │  └─────────────────────────┬──────────┘  │
                           │                            │             │
                           │  ┌─────────────────────────▼──────────┐  │
                           │  │      Domain Entities & Rules      │  │
                           │  └─────────────────────────┬──────────┘  │
                           │                            │             │
                           │  ┌─────────────────────────▼──────────┐  │
                           │  │    Prisma Repository Adapters     │  │
                           │  └─────────────────────────┬──────────┘  │
                           └────────────────────────────┼─────────────┘
                                                        │
                                                        ▼
                           ┌──────────────────────────────────────────┐
                           │            POSTGRESQL                   │
                           │                                          │
                           │  ┌──────────┐ ┌──────────┐ ┌────────┐  │
                           │  │ Usuarios │ │Torneos   │ │Partidos│  │
                           │  └──────────┘ └──────────┘ └────────┘  │
                           │  ┌──────────┐ ┌──────────┐ ┌────────┐  │
                           │  │ Equipos  │ │Jugadores │ │Carnets │  │
                           │  └──────────┘ └──────────┘ └────────┘  │
                           └──────────────────────────────────────────┘
```

---

## 5. Flujo de Datos — Ciclo de Vida de una Request

```
CLIENTE                    NEXT.JS                    NESTJS                      PRISMA            POSTGRESQL
   │                          │                          │                          │                  │
   │  ① GET /campeonatos      │                          │                          │                  │
   │─────────────────────────▶│                          │                          │                  │
   │                          │  ② fetch()              │                          │                  │
   │                          │─────────────────────────▶│                          │                  │
   │                          │                          │  ③ AuthGuard.verify()   │                  │
   │                          │                          │  ───────────────────────│──────────────────│──┐
   │                          │                          │  ◀─────── JWT OK ───────│──────────────────│──┘
   │                          │                          │                          │                  │
   │                          │                          │  ④ CampeonatoController  │                  │
   │                          │                          │  .findAll()              │                  │
   │                          │                          │                          │                  │
   │                          │                          │  ⑤ CampeonatoService     │                  │
   │                          │                          │  .obtenerTodos()         │                  │
   │                          │                          │                          │                  │
   │                          │                          │  ⑥ repo.findAll()        │                  │
   │                          │                          │──────────────────────────▶                  │
   │                          │                          │                          │                  │
   │                          │                          │                          │  ⑦ SELECT *     │
   │                          │                          │                          │─────────────────▶│
   │                          │                          │                          │◀─────────────────│
   │                          │                          │                          │   ⑧ Rows        │
   │                          │                          │◀──────────────────────────                  │
   │                          │                          │  ⑨ Domain entities      │                  │
   │                          │                          │                          │                  │
   │                          │  ◀───────────────────────│  ⑩ Response DTO        │                  │
   │                          │                          │                          │                  │
   │  ◀───────────────────────│  ⑪ JSON Response        │                          │                  │
   │                          │                          │                          │                  │
   │  ⑫ Render UI            │                          │                          │                  │
   │                          │                          │                          │                  │
```

### Pasos del Flujo

| Paso | Descripción |
|------|-------------|
| ① | El navegador solicita `/campeonatos` |
| ② | Next.js (server component) hace fetch a la API de NestJS |
| ③ | NestJS Auth Guard verifica el JWT (extrae rol y userId del payload) |
| ④ | El `CampeonatoController` recibe la request validada |
| ⑤ | El controller delega en `CampeonatoService` (capa de aplicación) |
| ⑥ | El servicio usa el puerto de repositorio para buscar datos |
| ⑦ | Prisma ejecuta la consulta SQL en PostgreSQL |
| ⑧ | Prisma mapea las filas a objetos |
| ⑨ | El adaptador Prisma convierte a entidades de dominio |
| ⑩ | El servicio retorna DTOs al controller |
| ⑪ | NestJS serializa la respuesta a JSON |
| ⑫ | Next.js renderiza la página con los datos recibidos |

---

## 6. Stack Tecnológico

| Capa | Tecnología | Versión | Razón |
|------|-----------|---------|-------|
| **Frontend Framework** | Next.js | 14+ | SSR, App Router, React Server Components, SEO, routing integrado |
| **Lenguaje Frontend** | TypeScript | 5+ | Tipado estático, mejor DX, detección temprana de errores |
| **UI / Estilos** | Tailwind CSS | 3+ | Utilidades first, rápido desarrollo, responsive, bundle pequeño |
| **Backend Framework** | NestJS | 10+ | Arquitectura modular, decoradores, soporte nativo de patrones |
| **Lenguaje Backend** | TypeScript | 5+ | Consistencia con frontend, tipado compartido |
| **API Style** | REST | - | Simple, cacheable, amplio soporte, madurez |
| **Autenticación** | JWT + Refresh Tokens | - | Stateless, escalable, seguro con rotación de tokens |
| **ORM** | Prisma | 5+ | Type-safe, migrations automáticas, DX superior, relaciones declarativas |
| **Base de Datos** | PostgreSQL | 16+ | Madurez, integridad referencial, JSONB, rendimiento,社区 |
| **Validación** | Zod / class-validator | - | Validación en runtime, tipado inferido |
| **Documentación API** | Swagger / OpenAPI | - | Documentación interactiva estándar |
| **QR** | qrcode (npm) | - | Generación de códigos QR para carnets |
| **PDF** | Puppeteer / jsPDF | - | Generación de reportes PDF |
| **Excel** | ExcelJS | - | Exportación a Excel de standings y reportes |
| **Testing Unit** | Jest | 29+ | Estándar en NestJS, mocking integrado |
| **Testing E2E** | Playwright | - | Pruebas de UI realistas, multi-browser |
| **Contenedores** | Docker | - | Entorno reproducible, CI/CD consistente |
| **CI/CD** | GitHub Actions | - | Integración con GitHub, pipelines configurables |
| **Almacenamiento** | S3 / Cloudinary | - | Fotos de jugadores, escudos de equipos |
| **Mailing** | Nodemailer / SendGrid | - | Notificaciones por email |

---

## 7. Decisiones de Diseño

### ¿Por qué NestJS?

| Razón | Detalle |
|-------|---------|
| Arquitectura modular | Organización por módulos (auth, campeonatos, equipos, etc.) |
| Inyección de dependencias | DI nativa facilita testing y desacoplamiento |
| Guards/Interceptors | Separación transversal de auth, logging, transformación |
| Decoradores | Código declarativo y expresivo |
| OpenAPI integrado | Documentación automática con `@nestjs/swagger` |
| Ecosistema maduro | Amplia comunidad, plugins, soporte LTS |

### ¿Por qué Next.js?

| Razón | Detalle |
|-------|---------|
| SSR/SSG | Renderizado del lado servidor para mejor SEO y performance |
| App Router | Routing basado en archivos, layouts anidados, loading states |
| Server Components | Reducción de JavaScript del lado cliente |
| API Routes | Endpoints embebidos para BFF (Backend For Frontend) |
| TypeScript nativo | Sin configuración adicional |

### ¿Por qué PostgreSQL?

| Razón | Detalle |
|-------|---------|
| Integridad referencial | Constraints, foreign keys, cascadas |
| JSONB | Almacenamiento flexible para metadatos variables |
| Transacciones ACID | Garantía de consistencia en operaciones críticas |
| Extensiones | PostGIS, pgcrypto, uuid-ossp |
| Madurez | 30+ años de evolución,社区 masiva |

### ¿Por qué Prisma?

| Razón | Detalle |
|-------|---------|
| Type Safety | Cliente tipado, detección de errores en compilación |
| Migrations | Control de versiones de esquema, auto-generación |
| Relations | Carga eager/lazy declarativa |
| DX Superior | Autocompletado, schemas legibles, Studio gráfico |

### ¿Por qué JWT?

| Razón | Detalle |
|-------|---------|
| Stateless | Sin sesiones en servidor, fácil escalado horizontal |
| Portable | El token contiene la identidad y roles del usuario |
| Estándar | RFC 7519, amplio soporte en todas las plataformas |
| Expiración | Control de validez por token (access: 15min, refresh: 7d) |

---

## 8. Arquitectura de Seguridad

### Flujo de Autenticación JWT

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│ CLIENTE  │                    │  NESTJS  │                    │   DB     │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │  POST /auth/login             │                               │
     │  { email, password }          │                               │
     │──────────────────────────────▶│                               │
     │                               │  SELECT user WHERE email      │
     │                               │──────────────────────────────▶│
     │                               │◀──────────────────────────────│
     │                               │  user + hash                  │
     │                               │                               │
     │                               │  bcrypt.compare(password,hash)│
     │                               │  ─────────── OK ──────────▶   │
     │                               │                               │
     │                               │  generate AccessToken(15min)  │
     │                               │  generate RefreshToken(7d)    │
     │                               │  encrypt & store refresh in DB│
     │                               │                               │
     │  { accessToken, refreshToken, │                               │
     │    user }                     │                               │
     │◀──────────────────────────────│                               │
     │                               │                               │
     │  GET /campeonatos             │                               │
     │  Authorization: Bearer <AT>   │                               │
     │──────────────────────────────▶│                               │
     │                               │  JWTService.verify(AT)        │
     │                               │  ──────── payload ──────────▶ │
     │                               │                               │
     │  GET /auth/refresh            │                               │
     │  Authorization: Bearer <RT>   │                               │
     │──────────────────────────────▶│                               │
     │                               │  decrypt RT, find in DB       │
     │                               │──────────────────────────────▶│
     │                               │◀──────────────────────────────│
     │                               │  rotate tokens                │
     │  { newAccess, newRefresh }    │  invalidate old RT            │
     │◀──────────────────────────────│                               │
```

### Medidas de Seguridad

| Medida | Implementación | Detalle |
|--------|----------------|---------|
| **Password Hashing** | bcrypt (cost 12) | Hash + salt automático, resistencia a ataques de fuerza bruta |
| **Access Token** | JWT RS256 | 15 minutos de expiración, firmado con clave privada |
| **Refresh Token** | JWT + AES encrypt | 7 días, almacenado encriptado en DB, rotación en cada uso |
| **Rate Limiting** | @nestjs/throttler | 100 requests/min por IP, 20 en endpoints de auth |
| **CORS** | Configurable por entorno | Solo orígenes permitidos en producción |
| **Helmet** | Helmet middleware | Headers de seguridad HTTP (XSS, CSP, HSTS, etc.) |
| **Validation** | class-validator + Zod | Sanitización y validación de todos los inputs |
| **SQL Injection** | Prisma ORM | Consultas parametrizadas, sin concatenación de strings |
| **XSS** | Next.js escaping | React escapa output por defecto |
| **CSRF** | SameSite cookies + tokens | Protección contra falsificación de peticiones |
| **Logging** | Logger estructurado | Audit log de operaciones críticas |
| **RBAC** | Guards + Decorators | Control de acceso basado en roles a nivel de endpoint |

---

## 9. Estrategia de Escalabilidad

### Escalado Vertical

- **Base de Datos:** Incrementar recursos de PostgreSQL (CPU, RAM, IOPS)
- **Aplicación:** Aumentar recursos del contenedor NestJS

### Escalado Horizontal

```
                         ┌──────────────┐
                         │  Load        │
                         │  Balancer    │
                         │  (NGINX/ALB) │
                         └──────┬───────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
     │  NestJS      │    │  NestJS      │    │  NestJS      │
     │  Instance 1  │    │  Instance 2  │    │  Instance N  │
     └──────────────┘    └──────────────┘    └──────────────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                │
                                ▼
                     ┌──────────────────┐
                     │   PostgreSQL     │
                     │  (Read Replica)  │
                     └──────────────────┘
                                │
                                ▼
                     ┌──────────────────┐
                     │   PostgreSQL     │
                     │  (Primary)       │
                     └──────────────────┘
```

### Estrategias

| Estrategia | Descripción |
|------------|-------------|
| **Stateless API** | NestJS sin estado de sesión, cualquier instancia sirve cualquier request |
| **Base de Datos** | Read replicas para consultas, primary para escrituras |
| **Caching** | Redis para caché de consultas frecuentes (standings, fixtures) |
| **CDN** | CloudFront/Cloudflare para assets estáticos (imágenes, PDFs) |
| **Colas** | Bull/BullMQ para tareas pesadas (generación de PDF, notificaciones) |
| **Containerización** | Docker + Docker Compose para orquestación multi-servicio |
| **Cargas de trabajo** | Auto-scaling basado en CPU/memoria en Kubernetes o ECS |

### Estrategia de Caché

```
┌──────────┐     GET /api/campeonatos
│ CLIENTE  │─────────────────────────▶┌──────────┐
└──────────┘                         │  NESTJS  │
                                     └────┬─────┘
                                          │
                               ┌──────────▼──────────┐
                               │  ¿Cache hit?        │
                               └──────────┬──────────┘
                                          │
                          ┌───────────────┴───────────────┐
                          ▼                               ▼
                   ┌────────────┐                 ┌──────────────┐
                   │   Redis    │                 │ PostgreSQL   │
                   │  Return    │                 │ Query +      │
                   │  Cached    │                 │ Set Cache    │
                   └────────────┘                 └──────────────┘
```

---

*Documentación de Arquitectura — Campeonato v1.0.0*
