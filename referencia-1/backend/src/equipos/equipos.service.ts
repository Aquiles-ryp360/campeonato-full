import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';

@Injectable()
export class EquiposService {
  constructor(private prisma: PrismaService) {}

  private include = {
    categoria: true,
    temporada: true,
    campeonato: true,
    _count: { select: { jugadores: true, partidosLocal: true, partidosVisitante: true } },
  };

  async create(dto: CreateEquipoDto) {
    const campeonato = await this.prisma.campeonato.findUnique({
      where: { id: dto.campeonatoId },
      include: { _count: { select: { equipos: true } } },
    });
    if (!campeonato) throw new NotFoundException('Campeonato no encontrado');
    if (campeonato.maxTeams && campeonato._count.equipos >= campeonato.maxTeams) {
      throw new BadRequestException('El campeonato ha alcanzado el máximo de equipos');
    }

    const existing = await this.prisma.equipo.findFirst({
      where: {
        name: { equals: dto.name, mode: 'insensitive' },
        campeonatoId: dto.campeonatoId,
      },
    });
    if (existing) {
      throw new ConflictException('Ya existe un equipo con ese nombre en este campeonato');
    }

    return this.prisma.equipo.create({
      data: dto,
      include: this.include,
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    campeonatoId?: string;
    categoriaId?: string;
    temporadaId?: string;
    search?: string;
  }) {
    const { page = 1, limit = 10, campeonatoId, categoriaId, temporadaId, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (campeonatoId) where.campeonatoId = campeonatoId;
    if (categoriaId) where.categoriaId = categoriaId;
    if (temporadaId) where.temporadaId = temporadaId;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.equipo.findMany({
        where,
        skip,
        take: limit,
        include: this.include,
        orderBy: { name: 'asc' },
      }),
      this.prisma.equipo.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { id },
      include: {
        ...this.include,
        jugadores: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          orderBy: { jerseyNumber: 'asc' },
        },
        delegado: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    });
    if (!equipo) throw new NotFoundException(`Equipo ${id} no encontrado`);
    return equipo;
  }

  async update(id: string, dto: UpdateEquipoDto) {
    await this.findById(id);

    if (dto.name && dto.campeonatoId) {
      const existing = await this.prisma.equipo.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          campeonatoId: dto.campeonatoId,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Ya existe un equipo con ese nombre en este campeonato');
      }
    }

    return this.prisma.equipo.update({
      where: { id },
      data: dto,
      include: this.include,
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.equipo.delete({
      where: { id },
    });
  }
}
