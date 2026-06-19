# Base de Datos - Campeonato

## Esquema Prisma

El esquema de base de datos está definido en `schema.prisma` usando Prisma ORM.

## Entidades Principales

### Usuarios y Autenticación
- **User**: Usuarios del sistema con roles (SUPER_ADMIN, ADMIN, DELEGATE, REFEREE, VIEWER)
- **RefreshToken**: Tokens de actualización JWT

### Campeonatos
- **Campeonato**: Torneo principal con configuración de puntuación y reglas
- **Categoria**: Categorías por edad/género
- **Temporada**: Temporadas del campeonato

### Equipos y Participantes
- **Equipo**: Equipos inscritos con colores y escudo
- **Jugador**: Jugadores con datos personales y estado
- **Delegate**: Delegados responsables
- **Referee**: Árbitros

### Logística
- **Cancha**: Campos deportivos con disponibilidad y horarios

### Competencia
- **Fixture**: Jornadas del torneo
- **Partido**: Encuentros programados con resultados
- **Tarjeta**: Tarjetas amarillas y rojas
- **Sancion**: Sanciones disciplinarias
- **StandingsEntry**: Tabla de posiciones

### Identificación
- **Carnet**: Carnets digitales con QR

### Auditoría
- **AuditLog**: Registro de cambios importantes

## Diagrama ER

Ver [docs/architecture/database-er.md](../docs/architecture/database-er.md)

## Migraciones

```bash
# Crear migración
npx prisma migrate dev --name nombre_migracion

# Aplicar migraciones
npx prisma migrate deploy

# Generar cliente Prisma
npx prisma generate

# Ver base de datos
npx prisma studio
```

## Seeds

```bash
npx prisma db seed
```
