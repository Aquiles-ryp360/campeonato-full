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
import { EquiposService } from './equipos.service';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Equipos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('equipos')
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  @Post()
  @Roles('ADMIN', 'ORGANIZER', 'DELEGATE')
  @ApiOperation({ summary: 'Crear un equipo' })
  create(@Body() dto: CreateEquipoDto) {
    return this.equiposService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar equipos' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'campeonatoId', required: false })
  @ApiQuery({ name: 'categoriaId', required: false })
  @ApiQuery({ name: 'temporadaId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('campeonatoId') campeonatoId?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('temporadaId') temporadaId?: string,
    @Query('search') search?: string,
  ) {
    return this.equiposService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      campeonatoId,
      categoriaId,
      temporadaId,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener equipo por ID' })
  findById(@Param('id') id: string) {
    return this.equiposService.findById(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'ORGANIZER', 'DELEGATE')
  @ApiOperation({ summary: 'Actualizar equipo' })
  update(@Param('id') id: string, @Body() dto: UpdateEquipoDto) {
    return this.equiposService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar equipo' })
  remove(@Param('id') id: string) {
    return this.equiposService.remove(id);
  }
}
