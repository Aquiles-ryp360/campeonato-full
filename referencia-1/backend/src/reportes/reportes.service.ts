import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);

  constructor(private prisma: PrismaService) {}

  async generateFixtureReport(campeonatoId: string) {
    const campeonato = await this.prisma.campeonato.findUnique({
      where: { id: campeonatoId },
      include: {
        fixtures: {
          include: {
            partidos: {
              include: {
                homeTeam: { select: { id: true, name: true, shield: true } },
                awayTeam: { select: { id: true, name: true, shield: true } },
                cancha: { select: { id: true, name: true } },
              },
              orderBy: [{ round: 'asc' }, { scheduledDate: 'asc' }],
            },
          },
        },
      },
    });
    if (!campeonato) throw new NotFoundException('Campeonato no encontrado');

    const rounds = new Map<number, any[]>();
    for (const fixture of campeonato.fixtures) {
      for (const partido of fixture.partidos) {
        const round = rounds.get(partido.round) || [];
        round.push(partido);
        rounds.set(partido.round, round);
      }
    }

    return {
      campeonato: { id: campeonato.id, name: campeonato.name, type: campeonato.type },
      totalRounds: rounds.size,
      totalMatches: campeonato.fixtures.reduce((acc, f) => acc + f.partidos.length, 0),
      rounds: Array.from(rounds.entries())
        .sort(([a], [b]) => a - b)
        .map(([round, partidos]) => ({
          round,
          matches: partidos,
        })),
      generatedAt: new Date().toISOString(),
    };
  }

  async generateStandingsReport(campeonatoId: string) {
    const campeonato = await this.prisma.campeonato.findUnique({
      where: { id: campeonatoId },
      include: {
        equipos: {
          include: {
            _count: { select: { jugadores: true } },
          },
        },
      },
    });
    if (!campeonato) throw new NotFoundException('Campeonato no encontrado');

    const teamsStandings = await Promise.all(
      campeonato.equipos.map(async (team) => {
        const homeMatches = await this.prisma.partido.findMany({
          where: { homeTeamId: team.id, status: 'FINALIZED' },
        });
        const awayMatches = await this.prisma.partido.findMany({
          where: { awayTeamId: team.id, status: 'FINALIZED' },
        });

        let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0;

        for (const m of homeMatches) {
          played++; (m.homeScore > m.awayScore) ? won++ : (m.homeScore === m.awayScore) ? drawn++ : lost++;
          gf += m.homeScore; ga += m.awayScore;
        }
        for (const m of awayMatches) {
          played++; (m.awayScore > m.homeScore) ? won++ : (m.awayScore === m.homeScore) ? drawn++ : lost++;
          gf += m.awayScore; ga += m.homeScore;
        }

        const pts = won * (campeonato.pointsPerWin || 3) + drawn * (campeonato.pointsPerDraw || 1);
        return {
          rank: 0,
          teamId: team.id,
          teamName: team.name,
          shield: team.shield,
          played, won, drawn, lost,
          goalsFor: gf, goalsAgainst: ga,
          goalDifference: gf - ga,
          points: pts,
          playerCount: team._count.jugadores,
        };
      }),
    );

    teamsStandings.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);
    teamsStandings.forEach((t, i) => (t.rank = i + 1));

    return {
      campeonato: { id: campeonato.id, name: campeonato.name },
      standings: teamsStandings,
      generatedAt: new Date().toISOString(),
    };
  }

  async generatePlayersReport(campeonatoId: string) {
    const jugadores = await this.prisma.jugador.findMany({
      where: { equipo: { campeonatoId } },
      include: {
        equipo: { select: { id: true, name: true, shield: true } },
        _count: { select: { sanciones: true } },
      },
      orderBy: [{ equipo: { name: 'asc' } }, { lastName: 'asc' }],
    });

    const equipos = await this.prisma.equipo.findMany({
      where: { campeonatoId },
      select: { id: true, name: true },
    });

    return {
      campeonatoId,
      totalPlayers: jugadores.length,
      totalTeams: equipos.length,
      players: jugadores.map((j) => ({
        id: j.id,
        firstName: j.firstName,
        lastName: j.lastName,
        documentType: j.documentType,
        documentNumber: j.documentNumber,
        jerseyNumber: j.jerseyNumber,
        position: j.position,
        status: j.status,
        team: j.equipo,
        sanctionsCount: j._count.sanciones,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  async generateSanctionsReport(campeonatoId: string) {
    const sanciones = await this.prisma.sancion.findMany({
      where: { jugador: { equipo: { campeonatoId } } },
      include: {
        jugador: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jerseyNumber: true,
            equipo: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      campeonatoId,
      totalSanciones: sanciones.length,
      activeSanciones: sanciones.filter((s) => s.isActive).length,
      yellowCards: sanciones.filter((s) => s.type === 'YELLOW_CARD').length,
      redCards: sanciones.filter((s) => s.type === 'RED_CARD').length,
      suspensions: sanciones.filter((s) => s.type === 'SUSPENSION').length,
      sanciones,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateExcel(campeonatoId: string) {
    const report = await this.generateFixtureReport(campeonatoId);
    return {
      ...report,
      format: 'excel',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      message: 'Reporte Excel generado. Implementar exceljs para generar el archivo binario.',
    };
  }

  async generatePdf(campeonatoId: string) {
    const report = await this.generateStandingsReport(campeonatoId);
    return {
      ...report,
      format: 'pdf',
      mimeType: 'application/pdf',
      message: 'Reporte PDF generado. Implementar pdfkit para generar el archivo binario.',
    };
  }
}
