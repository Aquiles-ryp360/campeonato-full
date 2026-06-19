import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportesService } from './reportes.service';

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('fixture/:campeonatoId')
  @ApiOperation({ summary: 'Generar reporte de fixture' })
  generateFixtureReport(@Param('campeonatoId') campeonatoId: string) {
    return this.reportesService.generateFixtureReport(campeonatoId);
  }

  @Get('standings/:campeonatoId')
  @ApiOperation({ summary: 'Generar reporte de posiciones' })
  generateStandingsReport(@Param('campeonatoId') campeonatoId: string) {
    return this.reportesService.generateStandingsReport(campeonatoId);
  }

  @Get('players/:campeonatoId')
  @ApiOperation({ summary: 'Generar reporte de jugadores' })
  generatePlayersReport(@Param('campeonatoId') campeonatoId: string) {
    return this.reportesService.generatePlayersReport(campeonatoId);
  }

  @Get('sanctions/:campeonatoId')
  @ApiOperation({ summary: 'Generar reporte de sanciones' })
  generateSanctionsReport(@Param('campeonatoId') campeonatoId: string) {
    return this.reportesService.generateSanctionsReport(campeonatoId);
  }

  @Get('excel/:campeonatoId')
  @ApiOperation({ summary: 'Generar reporte en Excel' })
  async generateExcel(
    @Param('campeonatoId') campeonatoId: string,
    @Res() res: Response,
  ) {
    const report = await this.reportesService.generateExcel(campeonatoId);
    res.set({
      'Content-Type': report.mimeType,
      'Content-Disposition': `attachment; filename="reporte-${campeonatoId}.xlsx"`,
    });
    res.send(report);
  }

  @Get('pdf/:campeonatoId')
  @ApiOperation({ summary: 'Generar reporte en PDF' })
  async generatePdf(
    @Param('campeonatoId') campeonatoId: string,
    @Res() res: Response,
  ) {
    const report = await this.reportesService.generatePdf(campeonatoId);
    res.set({
      'Content-Type': report.mimeType,
      'Content-Disposition': `attachment; filename="reporte-${campeonatoId}.pdf"`,
    });
    res.send(report);
  }

  @Get('export/:campeonatoId')
  @ApiQuery({ name: 'format', required: true, enum: ['json', 'csv'] })
  @ApiOperation({ summary: 'Exportar datos del campeonato' })
  async exportData(
    @Param('campeonatoId') campeonatoId: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.generateFixtureReport(campeonatoId);

    if (format === 'csv') {
      const csv = JSON.stringify(data, null, 2);
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="export-${campeonatoId}.csv"`,
      });
      res.send(csv);
    } else {
      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="export-${campeonatoId}.json"`,
      });
      res.send(data);
    }
  }
}
