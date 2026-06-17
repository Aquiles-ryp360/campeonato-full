import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterResultadoDto } from './dto/register-resultado.dto';

@Injectable()
export class ResultadosService {
  private readonly logger = new Logger(ResultadosService.name);

  constructor(private prisma: PrismaService) {}

  private include = {
    partido: {
      include: {
        fixture: { select: { id: true, name: true, campeonatoId: true } },
        homeTeam: { select: { id: true, name: true, shield: true } },
        awayTeam: { select: { id: true, name: true, shield: true } },
        cancha: { select: { id: true, name: true } },
      },
    },
    registeredBy: { select: { id: true, firstName: true, lastName: true } },
  };

  async register(dto: RegisterResultadoDto) {
    const partido = await this.prisma.partido.findUnique({
      where: { id: dto.partidoId },
      include: { fixture: true },
    });
    if (!partido) throw new NotFoundException('Partido no encontrado');
    if (partido.status === 'FINALIZED') {
      throw new BadRequestException('El partido ya tiene un resultado registrado');
    }

    const resultado = await this.prisma.resultado.create({
      data: {
        partidoId: dto.partidoId,
        homeScore: dto.homeScore,
        awayScore: dto.awayScore,
        registeredById: dto.registeredById,
      },
      include: this.include,
    });

    await this.prisma.partido.update({
      where: { id: dto.partidoId },
      data: {
        homeScore: dto.homeScore,
        awayScore: dto.awayScore,
        status: 'FINALIZED',
        goalDifference: Math.abs(dto.homeScore - dto.awayScore),
      },
    });

    this.logger.log(
      `Resultado registrado: ${partido.homeTeamId} ${dto.homeScore} - ${dto.awayScore} ${partido.awayTeamId}`,
    );

    return resultado;
  }

  async findByCampeonato(campeonatoId: string) {
    const resultados = await this.prisma.resultado.findMany({
      where: { partido: { fixture: { campeonatoId } } },
      include: this.include,
      orderBy: { createdAt: 'desc' },
    });
    return resultados;
  }

  async findByTeam(equipoId: string) {
    const resultados = await this.prisma.resultado.findMany({
      where: {
        OR: [
          { partido: { homeTeamId: equipoId } },
          { partido: { awayTeamId: equipoId } },
        ],
      },
      include: this.include,
      orderBy: { createdAt: 'desc' },
    });
    return resultados;
  }

  async findById(id: string) {
    const resultado = await this.prisma.resultado.findUnique({
      where: { id },
      include: this.include,
    });
    if (!resultado) throw new NotFoundException(`Resultado ${id} no encontrado`);
    return resultado;
  }

  async getResultsSummary(campeonatoId: string) {
    const resultados = await this.findByCampeonato(campeonatoId);

    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;
    let totalGoals = 0;

    for (const r of resultados) {
      if (r.homeScore > r.awayScore) homeWins++;
      else if (r.awayScore > r.homeScore) awayWins++;
      else draws++;
      totalGoals += r.homeScore + r.awayScore;
    }

    return {
      totalPartidos: resultados.length,
      homeWins,
      awayWins,
      draws,
      totalGoals,
      averageGoals: resultados.length > 0 ? (totalGoals / resultados.length).toFixed(2) : '0',
    };
  }
}
