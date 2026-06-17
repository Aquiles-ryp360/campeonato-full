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
import { CanchasService } from './canchas.service';
import { CreateCanchaDto } from './dto/create-cancha.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Canchas')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('canchas')
export class CanchasController {
  constructor(private readonly canchasService: CanchasService) {}

  @Post()
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Crear una cancha' })
  create(@Body() dto: CreateCanchaDto) {
    return this.canchasService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar canchas' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'campeonatoId', required: false })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('campeonatoId') campeonatoId?: string,
  ) {
    return this.canchasService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      campeonatoId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cancha por ID' })
  findById(@Param('id') id: string) {
    return this.canchasService.findById(id);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Verificar disponibilidad de cancha' })
  checkAvailability(
    @Param('id') id: string,
    @Query('date') date: string,
    @Query('time') time: string,
  ) {
    return this.canchasService.checkAvailability(id, date, time);
  }

  @Patch(':id')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Actualizar cancha' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCanchaDto>) {
    return this.canchasService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar cancha' })
  remove(@Param('id') id: string) {
    return this.canchasService.remove(id);
  }
}
