// ==================== Enums ====================

export enum ChampionshipType {
  LIGA = 'LIGA',
  COPA = 'COPA',
  TORNEO = 'TORNEO',
  AMISTOSO = 'AMISTOSO',
}

export enum MatchStatus {
  PENDIENTE = 'PENDIENTE',
  PROGRAMADO = 'PROGRAMADO',
  EN_CURSO = 'EN_CURSO',
  FINALIZADO = 'FINALIZADO',
  SUSPENDIDO = 'SUSPENDIDO',
  APLAZADO = 'APLAZADO',
}

export enum PlayerStatus {
  ACTIVO = 'ACTIVO',
  LESIONADO = 'LESIONADO',
  SUSPENDIDO = 'SUSPENDIDO',
  INACTIVO = 'INACTIVO',
}

export enum CardType {
  AMARILLA = 'AMARILLA',
  ROJA = 'ROJA',
  DOBLE_AMARILLA = 'DOBLE_AMARILLA',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  ORGANIZADOR = 'ORGANIZADOR',
  DELEGADO = 'DELEGADO',
  ARBITRO = 'ARBITRO',
  VIEWER = 'VIEWER',
}

// ==================== Base Entities ====================

export interface User {
  id: string;
  email: string;
  nombre: string;
  role: UserRole;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Campeonato {
  id: string;
  nombre: string;
  tipo: ChampionshipType;
  descripcion?: string | null;
  logo?: string | null;
  temporadaId: string;
  categoriaId: string;
  fechaInicio: string;
  fechaFin?: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  temporada?: Temporada;
  categoria?: Categoria;
  equipos?: Equipo[];
  fixtures?: Fixture[];
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string | null;
  createdAt: string;
  updatedAt: string;
  campeonatos?: Campeonato[];
}

export interface Temporada {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin?: string | null;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
  campeonatos?: Campeonato[];
}

export interface Equipo {
  id: string;
  nombre: string;
  escudo?: string | null;
  colorPrincipal?: string | null;
  colorSecundario?: string | null;
  campeonatoId: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  campeonato?: Campeonato;
  jugadores?: Jugador[];
  delegados?: Delegate[];
  partidosLocal?: Partido[];
  partidosVisitante?: Partido[];
}

export interface Jugador {
  id: string;
  nombre: string;
  apellido: string;
  dni?: string | null;
  fechaNacimiento?: string | null;
  posicion?: string | null;
  numeroCamiseta?: number | null;
  foto?: string | null;
  estado: PlayerStatus;
  equipoId: string;
  createdAt: string;
  updatedAt: string;
  equipo?: Equipo;
  tarjetas?: Tarjeta[];
  sanciones?: Sancion[];
  carnets?: Carnet[];
}

export interface Delegate {
  id: string;
  nombre: string;
  apellido: string;
  email?: string | null;
  telefono?: string | null;
  cargo: string;
  equipoId: string;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  equipo?: Equipo;
  user?: User;
}

export interface Partido {
  id: string;
  fixtureId: string;
  equipoLocalId: string;
  equipoVisitanteId: string;
  fecha: string;
  canchaId?: string | null;
  golesLocal?: number | null;
  golesVisitante?: number | null;
  estado: MatchStatus;
  observaciones?: string | null;
  createdAt: string;
  updatedAt: string;
  fixture?: Fixture;
  equipoLocal?: Equipo;
  equipoVisitante?: Equipo;
  cancha?: Cancha;
  tarjetas?: Tarjeta[];
}

export interface Fixture {
  id: string;
  nombre: string;
  campeonatoId: string;
  jornada: number;
  fechaInicio: string;
  fechaFin?: string | null;
  completado: boolean;
  createdAt: string;
  updatedAt: string;
  campeonato?: Campeonato;
  partidos?: Partido[];
}

export interface Cancha {
  id: string;
  nombre: string;
  direccion?: string | null;
  ciudad?: string | null;
  capacidad?: number | null;
  createdAt: string;
  updatedAt: string;
  partidos?: Partido[];
}

export interface Tarjeta {
  id: string;
  partidoId: string;
  jugadorId: string;
  tipo: CardType;
  minuto: number;
  createdAt: string;
  updatedAt: string;
  partido?: Partido;
  jugador?: Jugador;
}

export interface Sancion {
  id: string;
  jugadorId: string;
  motivo: string;
  fechaInicio: string;
  fechaFin: string;
  partidosSuspension?: number | null;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
  jugador?: Jugador;
}

export interface Carnet {
  id: string;
  jugadorId: string;
  temporadaId: string;
  numeroCarnet: string;
  foto?: string | null;
  fechaEmision: string;
  fechaVencimiento: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  jugador?: Jugador;
  temporada?: Temporada;
}

export interface StandingsEntry {
  equipoId: string;
  equipoNombre: string;
  escudo?: string | null;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  puntos: number;
}

// ==================== API Types ====================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ==================== Form Types ====================

export interface LoginForm {
  email: string;
  password: string;
}

export interface CreateCampeonatoForm {
  nombre: string;
  tipo: ChampionshipType;
  descripcion?: string;
  logo?: string;
  temporadaId: string;
  categoriaId: string;
  fechaInicio: string;
  fechaFin?: string;
}

export interface UpdateCampeonatoForm extends Partial<CreateCampeonatoForm> {}

export interface CreateCategoriaForm {
  nombre: string;
  descripcion?: string;
}

export interface CreateTemporadaForm {
  nombre: string;
  fechaInicio: string;
  fechaFin?: string;
}

export interface CreateEquipoForm {
  nombre: string;
  escudo?: string;
  colorPrincipal?: string;
  colorSecundario?: string;
  campeonatoId: string;
}

export interface UpdateEquipoForm extends Partial<CreateEquipoForm> {}

export interface CreateJugadorForm {
  nombre: string;
  apellido: string;
  dni?: string;
  fechaNacimiento?: string;
  posicion?: string;
  numeroCamiseta?: number;
  foto?: string;
  equipoId: string;
}

export interface UpdateJugadorForm extends Partial<CreateJugadorForm> {}

export interface CreateDelegateForm {
  nombre: string;
  apellido: string;
  email?: string;
  telefono?: string;
  cargo: string;
  equipoId: string;
  userId?: string;
}

export interface CreatePartidoForm {
  fixtureId: string;
  equipoLocalId: string;
  equipoVisitanteId: string;
  fecha: string;
  canchaId?: string;
}

export interface UpdatePartidoForm extends Partial<CreatePartidoForm> {}

export interface UpdateResultForm {
  golesLocal: number;
  golesVisitante: number;
  estado?: MatchStatus;
}

export interface CreateFixtureForm {
  nombre: string;
  campeonatoId: string;
  jornada: number;
  fechaInicio: string;
  fechaFin?: string;
}

export interface CreateCanchaForm {
  nombre: string;
  direccion?: string;
  ciudad?: string;
  capacidad?: number;
}

export interface CreateTarjetaForm {
  partidoId: string;
  jugadorId: string;
  tipo: CardType;
  minuto: number;
}

export interface CreateSancionForm {
  jugadorId: string;
  motivo: string;
  fechaInicio: string;
  fechaFin: string;
  partidosSuspension?: number;
}

export interface CreateCarnetForm {
  jugadorId: string;
  temporadaId: string;
  foto?: string;
  fechaVencimiento: string;
}
