import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { CarnetsService } from './carnets.service';
import { GenerateCarnetDto } from './dto/generate-carnet.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Carnets')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('carnets')
export class CarnetsController {
  constructor(private readonly carnetsService: CarnetsService) {}

  @Post('generate')
  @Roles('ADMIN', 'ORGANIZER')
  @ApiOperation({ summary: 'Generar un carnet' })
  generate(@Body() dto: GenerateCarnetDto) {
    return this.carnetsService.generate(dto);
  }

  @Get('validate/:code')
  @ApiOperation({ summary: 'Validar carnet por código QR' })
  validateByCode(@Param('code') code: string) {
    return this.carnetsService.validateByCode(code);
  }

  @Get('player/:playerId')
  @ApiOperation({ summary: 'Obtener carnet de un jugador' })
  getPlayerCard(@Param('playerId') playerId: string) {
    return this.carnetsService.getPlayerCard(playerId);
  }

  @Get('delegate/:delegateId')
  @ApiOperation({ summary: 'Obtener carnet de un delegado' })
  getDelegateCard(@Param('delegateId') delegateId: string) {
    return this.carnetsService.getDelegateCard(delegateId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener carnet por ID' })
  findById(@Param('id') id: string) {
    return this.carnetsService.findById(id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Descargar PDF del carnet' })
  async getPdf(@Param('id') id: string, @Res() res: Response) {
    const { carnet, pdfData } = await this.carnetsService.getPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="carnet-${carnet.cardCode}.pdf"`,
    });
    res.send(pdfData);
  }
}
