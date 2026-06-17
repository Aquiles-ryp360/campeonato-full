import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateJugadorDto } from './dto/create-jugador.dto';
import { UpdateJugadorDto } from './dto/update-jugador.dto';

@Injectable()
export class JugadoresService {
  constructor(private prisma: PrismaService) {}

  private include = {
    equipo: {
      select: {
        id: true,
        name: true,
        shield: true,
        campeonatoId: true,
      },
    },
    user: {
      select: { id: true, firstName: true, lastName: true, email: true },
    },
  };

  async create(dto: CreateJugadorDto) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { id: dto.equipoId },
      include: { _count: { select: { jugadores: true } } },
    });
    if (!equipo) throw new NotFoundException('Equipo no encontrado');

    const campeonato = await this.prisma.campeonato.findUnique({
      where: { id: equipo.campeonatoId },
    });
    if (campeonato.maxTeams && equipo._count.jugadores >= (campeonato as any).maxPlayersPerTeam || 30) {
      throw new BadRequestException('El equipo ha alcanzado el máximo de jugadores');
    }

    const existingDoc = await this.prisma.jugador.findFirst({
      where: {
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        equipo: { campeonatoId: equipo.campeonatoId },
      },
    });
    if (existingDoc) {
      throw new ConflictException('Ya existe un jugador con ese documento en este campeonato');
    }

    if (dto.jerseyNumber) {
      const existingJersey = await this.prisma.jugador.findFirst({
        where: {
          jerseyNumber: dto.jerseyNumber,
          equipoId: dto.equipoId,
        },
      });
      if (existingJersey) {
        throw new ConflictException(`El número ${dto.jerseyNumber} ya está asignado en este equipo`);
      }
    }

    return this.prisma.jugador.create({
      data: dto,
      include: this.include,
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    equipoId?: string;
    search?: string;
    status?: string;
  }) {
    const { page = 1, limit = 10, equipoId, search, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (equipoId) where.equipoId = equipoId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.jugador.findMany({
        where,
        skip,
        take: limit,
        include: this.include,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      this.prisma.jugador.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const jugador = await this.prisma.jugador.findUnique({
      where: { id },
      include: {
        ...this.include,
        sanciones: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!jugador) throw new NotFoundException(`Jugador ${id} no encontrado`);
    return jugador;
  }

  async update(id: string, dto: UpdateJugadorDto) {
    await this.findById(id);

    if (dto.jerseyNumber) {
      const existingJersey = await this.prisma.jugador.findFirst({
        where: {
          jerseyNumber: dto.jerseyNumber,
          equipoId: (await this.prisma.jugador.findUnique({ where: { id } })).equipoId,
          id: { not: id },
        },
      });
      if (existingJersey) {
        throw new ConflictException(`El número ${dto.jerseyNumber} ya está asignado en este equipo`);
      }
    }

    return this.prisma.jugador.update({
      where: { id },
      data: dto,
      include: this.include,
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.jugador.delete({ where: { id } });
  }

  async updateStatus(id: string, status: string) {
    await this.findById(id);
    return this.prisma.jugador.update({
      where: { id },
      data: { status: status as any },
      include: this.include,
    });
  }
}
