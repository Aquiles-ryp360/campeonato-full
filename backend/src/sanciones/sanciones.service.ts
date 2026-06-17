import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSanctionDto } from './dto/create-sancion.dto';

@Injectable()
export class SancionesService {
  private readonly MAX_YELLOW_CARDS = 3;

  constructor(private prisma: PrismaService) {}

  private include = {
    jugador: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jerseyNumber: true,
        equipo: { select: { id: true, name: true } },
      },
    },
    partido: {
      select: {
        id: true,
        round: true,
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    },
    createdBy: { select: { id: true, firstName: true, lastName: true } },
  };

  async create(dto: CreateSanctionDto) {
    const jugador = await this.prisma.jugador.findUnique({
      where: { id: dto.jugadorId },
    });
    if (!jugador) throw new NotFoundException('Jugador no encontrado');

    if (dto.partidoId) {
      const partido = await this.prisma.partido.findUnique({
        where: { id: dto.partidoId },
      });
      if (!partido) throw new NotFoundException('Partido no encontrado');
    }

    const sancion = await this.prisma.sancion.create({
      data: dto,
      include: this.include,
    });

    if (dto.type === 'YELLOW_CARD') {
      await this.checkAutoSuspension(dto.jugadorId);
    }

    if (dto.type === 'RED_CARD') {
      await this.prisma.jugador.update({
        where: { id: dto.jugadorId },
        data: { status: 'SUSPENDED' },
      });
    }

    return sancion;
  }

  private async checkAutoSuspension(jugadorId: string) {
    const recentYellowCards = await this.prisma.sancion.count({
      where: {
        jugadorId,
        type: 'YELLOW_CARD',
        isActive: true,
      },
    });

    if (recentYellowCards >= this.MAX_YELLOW_CARDS) {
      await this.prisma.sancion.create({
        data: {
          type: 'SUSPENSION',
          severity: 'MODERATE',
          reason: 'Acumulación de tarjetas amarillas',
          description: `Suspensión automática por acumular ${this.MAX_YELLOW_CARDS} tarjetas amarillas`,
          matchSuspensionCount: 1,
          jugadorId,
          isActive: true,
        },
      });

      await this.prisma.sancion.updateMany({
        where: { jugadorId, type: 'YELLOW_CARD', isActive: true },
        data: { isActive: false },
      });
    }
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    jugadorId?: string;
    equipoId?: string;
    campeonatoId?: string;
    type?: string;
    isActive?: string;
  }) {
    const { page = 1, limit = 10, jugadorId, equipoId, campeonatoId, type, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (jugadorId) where.jugadorId = jugadorId;
    if (equipoId) where.jugador = { equipoId };
    if (campeonatoId) where.jugador = { ...where.jugador, equipo: { campeonatoId } };
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [data, total] = await Promise.all([
      this.prisma.sancion.findMany({
        where,
        skip,
        take: limit,
        include: this.include,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sancion.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const sancion = await this.prisma.sancion.findUnique({
      where: { id },
      include: this.include,
    });
    if (!sancion) throw new NotFoundException(`Sanción ${id} no encontrada`);
    return sancion;
  }

  async update(id: string, dto: Partial<CreateSanctionDto>) {
    await this.findById(id);
    return this.prisma.sancion.update({
      where: { id },
      data: dto,
      include: this.include,
    });
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.prisma.sancion.update({
      where: { id },
      data: { isActive: false },
      include: this.include,
    });
  }

  async getPlayerSanctions(jugadorId: string) {
    const jugador = await this.prisma.jugador.findUnique({ where: { id: jugadorId } });
    if (!jugador) throw new NotFoundException('Jugador no encontrado');

    const [sanciones, yellowCount, redCount] = await Promise.all([
      this.prisma.sancion.findMany({
        where: { jugadorId },
        include: this.include,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sancion.count({
        where: { jugadorId, type: 'YELLOW_CARD', isActive: true },
      }),
      this.prisma.sancion.count({
        where: { jugadorId, type: 'RED_CARD', isActive: true },
      }),
    ]);

    return {
      jugadorId,
      yellowCards: yellowCount,
      redCards: redCount,
      totalSanciones: sanciones.length,
      activeSanciones: sanciones.filter((s) => s.isActive).length,
      sanciones,
    };
  }
}
