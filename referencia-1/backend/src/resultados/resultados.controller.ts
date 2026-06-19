import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ResultadosService } from './resultados.service';
import { RegisterResultadoDto } from './dto/register-resultado.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Resultados')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('resultados')
export class ResultadosController {
  constructor(private readonly resultadosService: ResultadosService) {}

  @Post()
  @Roles('ADMIN', 'ORGANIZER', 'REFEREE')
  @ApiOperation({ summary: 'Registrar resultado de un partido' })
  register(@Body() dto: RegisterResultadoDto) {
    return this.resultadosService.register(dto);
  }

  @Get('campeonato/:campeonatoId')
  @ApiOperation({ summary: 'Obtener resultados por campeonato' })
  findByCampeonato(@Param('campeonatoId') campeonatoId: string) {
    return this.resultadosService.findByCampeonato(campeonatoId);
  }

  @Get('equipo/:equipoId')
  @ApiOperation({ summary: 'Obtener resultados por equipo' })
  findByTeam(@Param('equipoId') equipoId: string) {
    return this.resultadosService.findByTeam(equipoId);
  }

  @Get('summary/:campeonatoId')
  @ApiOperation({ summary: 'Obtener resumen de resultados' })
  getResultsSummary(@Param('campeonatoId') campeonatoId: string) {
    return this.resultadosService.getResultsSummary(campeonatoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener resultado por ID' })
  findById(@Param('id') id: string) {
    return this.resultadosService.findById(id);
  }
}
