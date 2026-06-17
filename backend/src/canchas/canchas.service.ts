import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCanchaDto } from './dto/create-cancha.dto';

@Injectable()
export class CanchasService {
  constructor(private prisma: PrismaService) {}

  private include = {
    campeonato: { select: { id: true, name: true } },
    _count: { select: { partidos: true } },
  };

  async create(dto: CreateCanchaDto) {
    const existing = await this.prisma.cancha.findFirst({
      where: {
        name: { equals: dto.name, mode: 'insensitive' },
        campeonatoId: dto.campeonatoId,
      },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cancha con ese nombre en este campeonato');
    }

    return this.prisma.cancha.create({
      data: dto,
      include: this.include,
    });
  }

  async findAll(query: { page?: number; limit?: number; campeonatoId?: string }) {
    const { page = 1, limit = 10, campeonatoId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (campeonatoId) where.campeonatoId = campeonatoId;

    const [data, total] = await Promise.all([
      this.prisma.cancha.findMany({
        where,
        skip,
        take: limit,
        include: this.include,
        orderBy: { name: 'asc' },
      }),
      this.prisma.cancha.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const cancha = await this.prisma.cancha.findUnique({
      where: { id },
      include: {
        ...this.include,
        partidos: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { scheduledDate: 'asc' },
          take: 10,
          include: {
            homeTeam: { select: { id: true, name: true } },
            awayTeam: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!cancha) throw new NotFoundException(`Cancha ${id} no encontrada`);
    return cancha;
  }

  async update(id: string, dto: Partial<CreateCanchaDto>) {
    await this.findById(id);

    if (dto.name && dto.campeonatoId) {
      const existing = await this.prisma.cancha.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          campeonatoId: dto.campeonatoId,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Ya existe una cancha con ese nombre en este campeonato');
      }
    }

    return this.prisma.cancha.update({
      where: { id },
      data: dto,
      include: this.include,
    });
  }

  async checkAvailability(
    canchaId: string,
    date: string,
    time: string,
  ) {
    const conflictingMatches = await this.prisma.partido.findFirst({
      where: {
        canchaId,
        scheduledDate: date,
        scheduledTime: time,
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
      },
    });
    return { available: !conflictingMatches };
  }

  async remove(id: string) {
    await this.findById(id);

    const matchesCount = await this.prisma.partido.count({
      where: { canchaId: id, status: { not: 'CANCELLED' } },
    });
    if (matchesCount > 0) {
      throw new ConflictException('No se puede eliminar una cancha con partidos programados');
    }

    return this.prisma.cancha.delete({ where: { id } });
  }
}
