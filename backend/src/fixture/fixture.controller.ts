import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FixtureService } from './fixture.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Fixture')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('fixture')
export class FixtureController {
  constructor(private readonly fixtureService: FixtureService) {}

  @Post('generate/:campeonatoId')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Generar fixture para un campeonato' })
  generate(@Param('campeonatoId') campeonatoId: string) {
    return this.fixtureService.generate(campeonatoId);
  }

  @Get(':campeonatoId')
  @ApiOperation({ summary: 'Obtener fixtures de un campeonato' })
  findByCampeonato(@Param('campeonatoId') campeonatoId: string) {
    return this.fixtureService.findByCampeonato(campeonatoId);
  }

  @Get(':campeonatoId/:round')
  @ApiOperation({ summary: 'Obtener partidos de una ronda específica' })
  findRoundMatches(
    @Param('campeonatoId') campeonatoId: string,
    @Param('round') round: string,
  ) {
    return this.fixtureService.findRoundMatches(campeonatoId, parseInt(round, 10));
  }

  @Patch(':id')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Modificar un partido en el fixture' })
  updateMatch(
    @Param('id') id: string,
    @Body() data: { scheduledDate?: string; scheduledTime?: string; canchaId?: string; refereeId?: string },
  ) {
    return this.fixtureService.updateMatch(id, data);
  }

  @Post('recalculate/:campeonatoId')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Recalcular fixture tras cambios' })
  recalculate(@Param('campeonatoId') campeonatoId: string) {
    return this.fixtureService.recalculate(campeonatoId);
  }
}
