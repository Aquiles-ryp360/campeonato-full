import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(campeonatoId: string) {
    const campeonato = await this.prisma.campeonato.findUnique({
      where: { id: campeonatoId },
      include: {
        _count: { select: { equipos: true } },
      },
    });
    if (!campeonato) throw new NotFoundException('Campeonato no encontrado');

    const [
      totalTeams,
      totalPlayers,
      totalMatches,
      upcomingMatches,
      finalizedMatches,
      pendingMatches,
      activeSanctions,
      recentMatches,
      topTeams,
      punctualityStats,
    ] = await Promise.all([
      this.prisma.equipo.count({ where: { campeonatoId } }),
      this.prisma.jugador.count({
        where: { equipo: { campeonatoId } },
      }),
      this.prisma.partido.count({
        where: { fixture: { campeonatoId } },
      }),
      this.prisma.partido.findMany({
        where: {
          fixture: { campeonatoId },
          status: 'PENDING',
          scheduledDate: { gte: new Date().toISOString().split('T')[0] },
        },
        take: 5,
        orderBy: { scheduledDate: 'asc' },
        include: {
          homeTeam: { select: { id: true, name: true, shield: true } },
          awayTeam: { select: { id: true, name: true, shield: true } },
        },
      }),
      this.prisma.partido.count({
        where: { fixture: { campeonatoId }, status: 'FINALIZED' },
      }),
      this.prisma.partido.count({
        where: { fixture: { campeonatoId }, status: 'PENDING' },
      }),
      this.prisma.sancion.count({
        where: {
          isActive: true,
          jugador: { equipo: { campeonatoId } },
        },
      }),
      this.prisma.partido.findMany({
        where: { fixture: { campeonatoId }, status: 'FINALIZED' },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          homeTeam: { select: { id: true, name: true, shield: true } },
          awayTeam: { select: { id: true, name: true, shield: true } },
        },
      }),
      await this.getTopTeams(campeonatoId),
      await this.getPunctualityStats(campeonatoId),
    ]);

    return {
      campeonato: {
        id: campeonato.id,
        name: campeonato.name,
        type: campeonato.type,
        sport: campeonato.sport,
        status: campeonato.isActive ? 'ACTIVE' : 'INACTIVE',
      },
      stats: {
        totalTeams,
        totalPlayers,
        totalMatches,
        finalizedMatches,
        pendingMatches,
        completionRate: totalMatches > 0
          ? Math.round((finalizedMatches / totalMatches) * 100)
          : 0,
        activeSanctions,
      },
      upcomingMatches,
      recentMatches,
      topTeams,
      punctualityStats,
    };
  }

  private async getTopTeams(campeonatoId: string) {
    const teams = await this.prisma.equipo.findMany({
      where: { campeonatoId },
      select: {
        id: true,
        name: true,
        shield: true,
      },
    });

    const teamStats = await Promise.all(
      teams.map(async (team) => {
        const homeMatches = await this.prisma.partido.findMany({
          where: { homeTeamId: team.id, status: 'FINALIZED' },
        });
        const awayMatches = await this.prisma.partido.findMany({
          where: { awayTeamId: team.id, status: 'FINALIZED' },
        });

        let points = 0;
        let gf = 0;
        let ga = 0;
        let played = homeMatches.length + awayMatches.length;

        for (const m of homeMatches) {
          points += m.homeScore > m.awayScore ? 3 : m.homeScore === m.awayScore ? 1 : 0;
          gf += m.homeScore;
          ga += m.awayScore;
        }
        for (const m of awayMatches) {
          points += m.awayScore > m.homeScore ? 3 : m.awayScore === m.homeScore ? 1 : 0;
          gf += m.awayScore;
          ga += m.homeScore;
        }

        return {
          id: team.id,
          name: team.name,
          shield: team.shield,
          points,
          played,
          goalsFor: gf,
          goalsAgainst: ga,
          goalDifference: gf - ga,
        };
      }),
    );

    return teamStats.sort((a, b) => b.points - a.points).slice(0, 5);
  }

  private async getPunctualityStats(campeonatoId: string) {
    const total = await this.prisma.partido.count({
      where: { fixture: { campeonatoId }, status: 'FINALIZED' },
    });
    return {
      totalFinalized: total,
      onTimeRate: total > 0 ? 100 : 0,
    };
  }
}
