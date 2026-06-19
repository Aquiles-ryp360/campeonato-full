import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PartidosService } from './partidos.service';
import { CreatePartidoDto } from './dto/create-partido.dto';
import { UpdatePartidoDto } from './dto/update-partido.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Partidos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('partidos')
export class PartidosController {
  constructor(private readonly partidosService: PartidosService) {}

  @Post()
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Crear un partido' })
  create(@Body() dto: CreatePartidoDto) {
    return this.partidosService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar partidos' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'fixtureId', required: false })
  @ApiQuery({ name: 'campeonatoId', required: false })
  @ApiQuery({ name: 'round', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('fixtureId') fixtureId?: string,
    @Query('campeonatoId') campeonatoId?: string,
    @Query('round') round?: string,
    @Query('status') status?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.partidosService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      fixtureId,
      campeonatoId,
      round,
      status,
      teamId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener partido por ID' })
  findById(@Param('id') id: string) {
    return this.partidosService.findById(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Actualizar partido' })
  update(@Param('id') id: string, @Body() dto: UpdatePartidoDto) {
    return this.partidosService.update(id, dto);
  }

  @Patch(':id/result')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Registrar resultado del partido' })
  updateResult(@Param('id') id: string, @Body() dto: UpdateResultDto) {
    return this.partidosService.updateResult(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar partido' })
  remove(@Param('id') id: string) {
    return this.partidosService.remove(id);
  }
}
