# Campeonato - Plataforma de Gestión de Campeonatos de Fútbol

Sistema integral para la administración de campeonatos de fútbol, desde la inscripción hasta la finalización del torneo.

## 🚀 Características

- **Gestión de Campeonatos**: Creación, edición, categorías, temporadas, reglamentos
- **Gestión de Equipos**: Registro, escudos, colores, historial
- **Gestión de Jugadores**: Datos personales, fotografía, posición, estado
- **Carnet Digital**: Generación automática con QR, PDF descargable
- **Fixture Inteligente**: 7 tipos de torneo con generación automática
- **Gestión de Canchas**: Horarios, disponibilidad, capacidad
- **Tabla de Posiciones**: Cálculo automático con todos los indicadores
- **Sanciones**: Control disciplinario automatizado
- **Reportes**: PDF, Excel, estadísticas

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| Backend | NestJS, TypeScript |
| Base de Datos | PostgreSQL |
| ORM | Prisma |
| Autenticación | JWT |
| Contenedores | Docker |
| CI/CD | GitHub Actions |

## 📋 Prerrequisitos

- Node.js >= 18.x
- Docker y Docker Compose
- PostgreSQL 15+
- npm o yarn

## 🔧 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/gaelrenzo/Campeonato.git
cd Campeonato

# Configurar variables de entorno
cp .env.example .env

# Iniciar con Docker
docker-compose up -d

# O instalación manual
cd backend && npm install
cd ../frontend && npm install
cd ../database && npx prisma migrate dev
```

## 🏗️ Estructura del Proyecto

```
Campeonato/
├── frontend/          # Aplicación Next.js
├── backend/           # API NestJS
├── database/          # Esquema Prisma y migraciones
├── docs/              # Documentación
│   ├── architecture/  # Diagramas de arquitectura
│   ├── api/           # Documentación de API
│   ├── roadmap/       # Roadmap y MVP
│   ├── mockups/       # Diseños de pantalla
│   └── use-cases/     # Casos de uso
├── scripts/           # Scripts de utilidad
└── .github/           # CI/CD y templates
```

## 📚 Documentación

- [Arquitectura del Sistema](docs/architecture/README.md)
- [API REST](docs/api/README.md)
- [Roadmap y MVP](docs/roadmap/README.md)
- [Casos de Uso](docs/use-cases/README.md)
- [Diagrama de Base de Datos](database/README.md)

## 🤝 Contribución

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para guía de contribución.

## 📄 Licencia

MIT
