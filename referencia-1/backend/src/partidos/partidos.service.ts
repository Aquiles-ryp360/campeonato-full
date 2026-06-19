import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePartidoDto } from './dto/create-partido.dto';
import { UpdatePartidoDto } from './dto/update-partido.dto';
import { UpdateResultDto } from './dto/update-result.dto';

@Injectable()
export class PartidosService {
  constructor(private prisma: PrismaService) {}

  private include = {
    fixture: { select: { id: true, name: true, campeonatoId: true } },
    homeTeam: { select: { id: true, name: true, shield: true } },
    awayTeam: { select: { id: true, name: true, shield: true } },
    cancha: { select: { id: true, name: true } },
    referee: { select: { id: true, firstName: true, lastName: true } },
  };

  async create(dto: CreatePartidoDto) {
    const fixture = await this.prisma.fixture.findUnique({
      where: { id: dto.fixtureId },
    });
    if (!fixture) throw new NotFoundException('Fixture no encontrado');

    if (dto.homeTeamId === dto.awayTeamId) {
      throw new BadRequestException('Un equipo no puede jugar contra sí mismo');
    }

    const existing = await this.prisma.partido.findFirst({
      where: {
        fixtureId: dto.fixtureId,
        round: dto.round,
        OR: [
          { homeTeamId: dto.homeTeamId, awayTeamId: dto.awayTeamId },
          { homeTeamId: dto.awayTeamId, awayTeamId: dto.homeTeamId },
        ],
      },
    });
    if (existing) {
      throw new ConflictException('Ya existe un partido entre estos equipos en esta ronda');
    }

    const conflict = await this.prisma.partido.findFirst({
      where: {
        fixtureId: dto.fixtureId,
        round: dto.round,
        scheduledDate: dto.scheduledDate,
        OR: [
          { homeTeamId: { in: [dto.homeTeamId, dto.awayTeamId] } },
          { awayTeamId: { in: [dto.homeTeamId, dto.awayTeamId] } },
        ],
      },
    });
    if (conflict) {
      throw new ConflictException('Un equipo ya tiene un partido programado en esta fecha y ronda');
    }

    return this.prisma.partido.create({
      data: dto,
      include: this.include,
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    fixtureId?: string;
    campeonatoId?: string;
    round?: string;
    status?: string;
    teamId?: string;
  }) {
    const { page = 1, limit = 10, fixtureId, campeonatoId, round, status, teamId } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (fixtureId) where.fixtureId = fixtureId;
    if (campeonatoId) where.fixture = { campeonatoId };
    if (round) where.round = parseInt(round, 10);
    if (status) where.status = status;
    if (teamId) {
      where.OR = [
        { homeTeamId: teamId },
        { awayTeamId: teamId },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.partido.findMany({
        where,
        skip,
        take: limit,
        include: this.include,
        orderBy: [{ round: 'asc' }, { scheduledDate: 'asc' }],
      }),
      this.prisma.partido.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const partido = await this.prisma.partido.findUnique({
      where: { id },
      include: this.include,
    });
    if (!partido) throw new NotFoundException(`Partido ${id} no encontrado`);
    return partido;
  }

  async update(id: string, dto: UpdatePartidoDto) {
    await this.findById(id);
    return this.prisma.partido.update({
      where: { id },
      data: dto,
      include: this.include,
    });
  }

  async updateResult(id: string, dto: UpdateResultDto) {
    const partido = await this.findById(id);

    if (partido.status === 'FINALIZED') {
      throw new BadRequestException('No se puede modificar un partido ya finalizado');
    }

    return this.prisma.partido.update({
      where: { id },
      data: {
        homeScore: dto.homeScore,
        awayScore: dto.awayScore,
        status: dto.status || 'FINALIZED',
        goalDifference: Math.abs(dto.homeScore - dto.awayScore),
      },
      include: this.include,
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.partido.delete({ where: { id } });
  }
}
