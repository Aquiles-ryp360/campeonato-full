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
import { JugadoresService } from './jugadores.service';
import { CreateJugadorDto } from './dto/create-jugador.dto';
import { UpdateJugadorDto } from './dto/update-jugador.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Jugadores')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('jugadores')
export class JugadoresController {
  constructor(private readonly jugadoresService: JugadoresService) {}

  @Post()
  @Roles('ADMIN', 'ORGANIZER', 'DELEGATE')
  @ApiOperation({ summary: 'Crear un jugador' })
  create(@Body() dto: CreateJugadorDto) {
    return this.jugadoresService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar jugadores' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'equipoId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('equipoId') equipoId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.jugadoresService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      equipoId,
      search,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener jugador por ID' })
  findById(@Param('id') id: string) {
    return this.jugadoresService.findById(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'ORGANIZER', 'DELEGATE')
  @ApiOperation({ summary: 'Actualizar jugador' })
  update(@Param('id') id: string, @Body() dto: UpdateJugadorDto) {
    return this.jugadoresService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar jugador' })
  remove(@Param('id') id: string) {
    return this.jugadoresService.remove(id);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Actualizar estado del jugador' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.jugadoresService.updateStatus(id, status);
  }
}
