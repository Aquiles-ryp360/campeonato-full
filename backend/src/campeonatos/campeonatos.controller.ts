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
import { CampeonatosService } from './campeonatos.service';
import { CreateCampeonatoDto } from './dto/create-campeonato.dto';
import { UpdateCampeonatoDto } from './dto/update-campeonato.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Campeonatos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('campeonatos')
export class CampeonatosController {
  constructor(private readonly campeonatosService: CampeonatosService) {}

  @Post()
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Crear un campeonato' })
  create(@Body() dto: CreateCampeonatoDto) {
    return this.campeonatosService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar campeonatos' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'sport', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('sport') sport?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.campeonatosService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      type,
      sport,
      isActive,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener campeonato por ID' })
  findById(@Param('id') id: string) {
    return this.campeonatosService.findById(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Actualizar campeonato' })
  update(@Param('id') id: string, @Body() dto: UpdateCampeonatoDto) {
    return this.campeonatosService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Desactivar campeonato' })
  deactivate(@Param('id') id: string) {
    return this.campeonatosService.deactivate(id);
  }

  @Get(':id/standings')
  @ApiOperation({ summary: 'Obtener tabla de posiciones' })
  getStandings(@Param('id') id: string) {
    return this.campeonatosService.getStandings(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Obtener estadísticas del campeonato' })
  getStatistics(@Param('id') id: string) {
    return this.campeonatosService.getStatistics(id);
  }
}
