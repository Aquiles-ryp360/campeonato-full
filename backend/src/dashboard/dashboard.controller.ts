import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get(':campeonatoId')
  @ApiOperation({ summary: 'Obtener dashboard del campeonato' })
  getDashboard(@Param('campeonatoId') campeonatoId: string) {
    return this.dashboardService.getDashboard(campeonatoId);
  }
}
