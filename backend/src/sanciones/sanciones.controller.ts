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
import { SancionesService } from './sanciones.service';
import { CreateSanctionDto } from './dto/create-sancion.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Sanciones')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('sanciones')
export class SancionesController {
  constructor(private readonly sancionesService: SancionesService) {}

  @Post()
  @Roles('ADMIN', 'ORGANIZER', 'REFEREE')
  @ApiOperation({ summary: 'Crear una sanción' })
  create(@Body() dto: CreateSanctionDto) {
    return this.sancionesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar sanciones' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'jugadorId', required: false })
  @ApiQuery({ name: 'equipoId', required: false })
  @ApiQuery({ name: 'campeonatoId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('jugadorId') jugadorId?: string,
    @Query('equipoId') equipoId?: string,
    @Query('campeonatoId') campeonatoId?: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.sancionesService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      jugadorId,
      equipoId,
      campeonatoId,
      type,
      isActive,
    });
  }

  @Get('jugador/:jugadorId')
  @ApiOperation({ summary: 'Obtener sanciones de un jugador' })
  getPlayerSanctions(@Param('jugadorId') jugadorId: string) {
    return this.sancionesService.getPlayerSanctions(jugadorId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener sanción por ID' })
  findById(@Param('id') id: string) {
    return this.sancionesService.findById(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Actualizar sanción' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateSanctionDto>) {
    return this.sancionesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar sanción' })
  deactivate(@Param('id') id: string) {
    return this.sancionesService.deactivate(id);
  }
}
