import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCampeonatoDto } from './dto/create-campeonato.dto';
import { UpdateCampeonatoDto } from './dto/update-campeonato.dto';

@Injectable()
export class CampeonatosService {
  constructor(private prisma: PrismaService) {}

  private include = {
    categories: true,
    seasons: true,
    _count: { select: { equipos: true, partidos: true } },
  };

  async create(dto: CreateCampeonatoDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start >= end) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }
    if (dto.registrationEndDate && new Date(dto.registrationEndDate) > start) {
      throw new BadRequestException('La fecha de cierre de inscripción debe ser anterior al inicio');
    }

    const { categories, seasons, ...campeonatoData } = dto;

    return this.prisma.campeonato.create({
      data: {
        ...campeonatoData,
        categories: categories
          ? { create: categories }
          : undefined,
        seasons: seasons
          ? { create: seasons }
          : undefined,
      },
      include: this.include,
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    sport?: string;
    isActive?: string;
  }) {
    const { page = 1, limit = 10, search, type, sport, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (type) where.type = type;
    if (sport) where.sport = sport;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [data, total] = await Promise.all([
      this.prisma.campeonato.findMany({
        where,
        skip,
        take: limit,
        include: this.include,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campeonato.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const campeonato = await this.prisma.campeonato.findUnique({
      where: { id },
      include: {
        ...this.include,
        equipos: {
          include: {
            categoria: true,
            temporada: true,
            _count: { select: { jugadores: true } },
          },
        },
      },
    });
    if (!campeonato) throw new NotFoundException(`Campeonato ${id} no encontrado`);
    return campeonato;
  }

  async update(id: string, dto: UpdateCampeonatoDto) {
    await this.findById(id);

    if (dto.startDate && dto.endDate) {
      if (new Date(dto.startDate) >= new Date(dto.endDate)) {
        throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
      }
    }

    const { categories, seasons, ...campeonatoData } = dto;

    return this.prisma.campeonato.update({
      where: { id },
      data: {
        ...campeonatoData,
        ...(categories && {
          categories: {
            deleteMany: {},
            create: categories,
          },
        }),
        ...(seasons && {
          seasons: {
            deleteMany: {},
            create: seasons,
          },
        }),
      },
      include: this.include,
    });
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.prisma.campeonato.update({
      where: { id },
      data: { isActive: false },
      include: this.include,
    });
  }

  async getStandings(id: string) {
    await this.findById(id);

    const teams = await this.prisma.equipo.findMany({
      where: { campeonatoId: id },
      include: {
        _count: { select: { jugadores: true } },
      },
    });

    const standings = await Promise.all(
      teams.map(async (team) => {
        const homeMatches = await this.prisma.partido.findMany({
          where: { homeTeamId: team.id, status: 'FINALIZED' },
        });
        const awayMatches = await this.prisma.partido.findMany({
          where: { awayTeamId: team.id, status: 'FINALIZED' },
        });

        let played = 0,
          won = 0,
          drawn = 0,
          lost = 0,
          goalsFor = 0,
          goalsAgainst = 0;

        for (const m of homeMatches) {
          played++;
          if (m.homeScore > m.awayScore) won++;
          else if (m.homeScore === m.awayScore) drawn++;
          else lost++;
          goalsFor += m.homeScore;
          goalsAgainst += m.awayScore;
        }
        for (const m of awayMatches) {
          played++;
          if (m.awayScore > m.homeScore) won++;
          else if (m.awayScore === m.homeScore) drawn++;
          else lost++;
          goalsFor += m.awayScore;
          goalsAgainst += m.homeScore;
        }

        const campeonato = await this.prisma.campeonato.findUnique({
          where: { id },
          select: { pointsPerWin: true, pointsPerDraw: true, pointsPerLoss: true },
        });

        const pts =
          won * (campeonato.pointsPerWin || 3) +
          drawn * (campeonato.pointsPerDraw || 1) +
          lost * (campeonato.pointsPerLoss || 0);

        return {
          teamId: team.id,
          teamName: team.name,
          shield: team.shield,
          playerCount: team._count.jugadores,
          played,
          won,
          drawn,
          lost,
          goalsFor,
          goalsAgainst,
          goalDifference: goalsFor - goalsAgainst,
          points: pts,
        };
      }),
    );

    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    return standings;
  }

  async getStatistics(id: string) {
    const campeonato = await this.findById(id);

    const totalMatches = await this.prisma.partido.count({
      where: { fixture: { campeonatoId: id } },
    });
    const finalizedMatches = await this.prisma.partido.count({
      where: { fixture: { campeonatoId: id }, status: 'FINALIZED' },
    });
    const pendingMatches = await this.prisma.partido.count({
      where: { fixture: { campeonatoId: id }, status: 'PENDING' },
    });
    const totalTeams = campeonato.equipos?.length || 0;
    const totalPlayers = await this.prisma.jugador.count({
      where: { equipo: { campeonatoId: id } },
    });

    return {
      totalCampeonatos: 1,
      totalTeams,
      totalPlayers,
      totalMatches,
      finalizedMatches,
      pendingMatches,
      completionRate: totalMatches > 0 ? Math.round((finalizedMatches / totalMatches) * 100) : 0,
    };
  }
}
