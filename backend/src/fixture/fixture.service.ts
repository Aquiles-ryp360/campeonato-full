import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { generateRoundRobin } from './strategies/round-robin.strategy';
import { generateKnockoutBracket } from './strategies/knockout.strategy';
import { generateDoubleElimination } from './strategies/double-elimination.strategy';
import { generateGroupStage } from './strategies/group-stage.strategy';

@Injectable()
export class FixtureService {
  private readonly logger = new Logger(FixtureService.name);

  constructor(private prisma: PrismaService) {}

  async generate(campeonatoId: string) {
    const campeonato = await this.prisma.campeonato.findUnique({
      where: { id: campeonatoId },
      include: {
        equipos: { select: { id: true, name: true } },
        fixtures: { include: { partidos: true } },
      },
    });
    if (!campeonato) throw new NotFoundException('Campeonato no encontrado');
    if (campeonato.equipos.length < 2) {
      throw new BadRequestException('Se necesitan al menos 2 equipos para generar el fixture');
    }

    const teamIds = campeonato.equipos.map((e) => e.id);
    const fixtureName = `Fixture ${campeonato.name}`;

    const existingFixture = await this.prisma.fixture.findFirst({
      where: { campeonatoId, isActive: true },
    });
    if (existingFixture) {
      await this.prisma.partido.deleteMany({
        where: { fixtureId: existingFixture.id },
      });
      await this.prisma.fixture.delete({ where: { id: existingFixture.id } });
    }

    let generatedMatches: any[] = [];
    const type = campeonato.type;

    switch (type) {
      case 'ALL_VS_ALL':
        generatedMatches = generateRoundRobin(teamIds, false);
        break;
      case 'ALL_VS_ALL_RETURN':
        generatedMatches = generateRoundRobin(teamIds, true);
        break;
      case 'KNOCKOUT':
        generatedMatches = generateKnockoutBracket(teamIds);
        break;
      case 'DOUBLE_ELIMINATION':
        generatedMatches = generateDoubleElimination(teamIds);
        break;
      case 'GROUP_STAGE':
        generatedMatches = generateGroupStage(teamIds, 4);
        break;
      case 'LEAGUE_PLAYOFFS': {
        const leagueMatches = generateRoundRobin(teamIds, true);
        generatedMatches = leagueMatches;
        break;
      }
      case 'CUSTOM':
        generatedMatches = generateRoundRobin(teamIds, false);
        break;
      default:
        generatedMatches = generateRoundRobin(teamIds, false);
    }

    const fixture = await this.prisma.fixture.create({
      data: {
        name: fixtureName,
        campeonatoId,
        type,
        totalRounds: generatedMatches.length > 0
          ? Math.max(...generatedMatches.map((m: any) => m.round))
          : 0,
        isActive: true,
      },
    });

    if (generatedMatches.length > 0) {
      const partidosData = generatedMatches.map((m: any) => ({
        fixtureId: fixture.id,
        round: m.round,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        scheduledDate: campeonato.startDate,
        status: 'PENDING' as const,
      }));

      await this.prisma.partido.createMany({
        data: partidosData,
      });
    }

    this.logger.log(
      `Fixture generado para campeonato ${campeonatoId}: ${generatedMatches.length} partidos`,
    );

    return this.prisma.fixture.findUnique({
      where: { id: fixture.id },
      include: {
        partidos: {
          include: {
            homeTeam: { select: { id: true, name: true, shield: true } },
            awayTeam: { select: { id: true, name: true, shield: true } },
          },
          orderBy: [{ round: 'asc' }, { scheduledDate: 'asc' }],
        },
      },
    });
  }

  async findByCampeonato(campeonatoId: string) {
    const fixtures = await this.prisma.fixture.findMany({
      where: { campeonatoId },
      include: {
        _count: { select: { partidos: true } },
        partidos: {
          take: 5,
          orderBy: { scheduledDate: 'asc' },
          include: {
            homeTeam: { select: { id: true, name: true, shield: true } },
            awayTeam: { select: { id: true, name: true, shield: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return fixtures;
  }

  async findRoundMatches(campeonatoId: string, round: number) {
    const partidos = await this.prisma.partido.findMany({
      where: {
        fixture: { campeonatoId },
        round,
      },
      include: {
        homeTeam: { select: { id: true, name: true, shield: true } },
        awayTeam: { select: { id: true, name: true, shield: true } },
        cancha: { select: { id: true, name: true } },
        referee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });
    return partidos;
  }

  async updateMatch(id: string, data: { scheduledDate?: string; scheduledTime?: string; canchaId?: string; refereeId?: string }) {
    const partido = await this.prisma.partido.findUnique({ where: { id } });
    if (!partido) throw new NotFoundException('Partido no encontrado');

    if (partido.status === 'FINALIZED') {
      throw new BadRequestException('No se puede modificar un partido finalizado');
    }

    return this.prisma.partido.update({
      where: { id },
      data,
      include: {
        homeTeam: { select: { id: true, name: true, shield: true } },
        awayTeam: { select: { id: true, name: true, shield: true } },
        cancha: { select: { id: true, name: true } },
      },
    });
  }

  async recalculate(campeonatoId: string) {
    const campeonato = await this.prisma.campeonato.findUnique({
      where: { id: campeonatoId },
      include: {
        equipos: { select: { id: true } },
        fixtures: {
          include: {
            partidos: {
              where: { status: 'FINALIZED' },
            },
          },
        },
      },
    });
    if (!campeonato) throw new NotFoundException('Campeonato no encontrado');

    const fixedTeamIds = new Set(
      campeonato.equipos.map((e) => e.id),
    );

    for (const fixture of campeonato.fixtures) {
      const finalizedTeamIds = new Set<string>();
      for (const p of fixture.partidos) {
        finalizedTeamIds.add(p.homeTeamId);
        finalizedTeamIds.add(p.awayTeamId);
      }

      const availableTeams = campeonato.equipos.filter(
        (e) => !finalizedTeamIds.has(e.id),
      );

      if (availableTeams.length >= 2) {
        const newMatches = generateRoundRobin(
          availableTeams.map((t) => t.id),
          false,
        );
        const lastRound = fixture.partidos.length > 0
          ? Math.max(...fixture.partidos.map((p) => p.round))
          : 0;

        const partidosData = newMatches.map((m) => ({
          fixtureId: fixture.id,
          round: lastRound + m.round,
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          scheduledDate: campeonato.startDate,
          status: 'PENDING' as const,
        }));

        if (partidosData.length > 0) {
          await this.prisma.partido.createMany({ data: partidosData });
        }
      }
    }

    return this.findByCampeonato(campeonatoId);
  }
}
