import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GenerateCarnetDto } from './dto/generate-carnet.dto';
import * as crypto from 'crypto';

@Injectable()
export class CarnetsService {
  private readonly logger = new Logger(CarnetsService.name);

  constructor(private prisma: PrismaService) {}

  private include = {
    jugador: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentType: true,
        documentNumber: true,
        photo: true,
        jerseyNumber: true,
        position: true,
        birthDate: true,
        equipo: { select: { id: true, name: true, shield: true } },
      },
    },
    equipo: { select: { id: true, name: true, shield: true } },
    campeonato: { select: { id: true, name: true, sport: true } },
    user: { select: { id: true, firstName: true, lastName: true, email: true } },
  };

  private generateCardCode(): string {
    const prefix = 'CRN';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private generateQrContent(cardCode: string): string {
    return JSON.stringify({
      type: 'carnet',
      code: cardCode,
      issuedAt: new Date().toISOString(),
    });
  }

  async generate(dto: GenerateCarnetDto) {
    if (dto.type === 'PLAYER' && !dto.jugadorId) {
      throw new BadRequestException('Se requiere jugadorId para carnet de tipo PLAYER');
    }

    if (dto.type === 'DELEGATE') {
      if (!dto.userId && !dto.equipoId) {
        throw new BadRequestException('Se requiere userId o equipoId para carnet de tipo DELEGATE');
      }
    }

    if (dto.jugadorId) {
      const jugador = await this.prisma.jugador.findUnique({
        where: { id: dto.jugadorId },
      });
      if (!jugador) throw new NotFoundException('Jugador no encontrado');

      const existing = await this.prisma.carnet.findFirst({
        where: { jugadorId: dto.jugadorId, campeonatoId: dto.campeonatoId, isActive: true },
      });
      if (existing) {
        throw new BadRequestException('El jugador ya tiene un carnet activo en este campeonato');
      }
    }

    const cardCode = this.generateCardCode();
    const qrContent = this.generateQrContent(cardCode);

    const carnet = await this.prisma.carnet.create({
      data: {
        cardCode,
        qrCode: qrContent,
        type: dto.type,
        issueDate: new Date().toISOString(),
        expiryDate: dto.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        jugadorId: dto.jugadorId || null,
        equipoId: dto.equipoId || null,
        campeonatoId: dto.campeonatoId,
        userId: dto.userId || null,
      },
      include: this.include,
    });

    this.logger.log(`Carnet generado: ${cardCode} para ${dto.type}`);
    return carnet;
  }

  async findById(id: string) {
    const carnet = await this.prisma.carnet.findUnique({
      where: { id },
      include: this.include,
    });
    if (!carnet) throw new NotFoundException(`Carnet ${id} no encontrado`);
    return carnet;
  }

  async validateByCode(code: string) {
    const carnet = await this.prisma.carnet.findFirst({
      where: { cardCode: code },
      include: this.include,
    });
    if (!carnet) {
      throw new NotFoundException('Carnet no encontrado');
    }
    if (!carnet.isActive) {
      throw new BadRequestException('El carnet está desactivado');
    }
    if (carnet.expiryDate && new Date(carnet.expiryDate) < new Date()) {
      throw new BadRequestException('El carnet ha expirado');
    }
    return {
      valid: true,
      carnet,
      message: 'Carnet válido',
    };
  }

  async getPlayerCard(playerId: string) {
    const carnet = await this.prisma.carnet.findFirst({
      where: { jugadorId: playerId, isActive: true },
      include: this.include,
      orderBy: { createdAt: 'desc' },
    });
    if (!carnet) throw new NotFoundException('No se encontró un carnet activo para este jugador');
    return carnet;
  }

  async getDelegateCard(delegateId: string) {
    const carnet = await this.prisma.carnet.findFirst({
      where: {
        userId: delegateId,
        type: 'DELEGATE',
        isActive: true,
      },
      include: this.include,
      orderBy: { createdAt: 'desc' },
    });
    if (!carnet) throw new NotFoundException('No se encontró un carnet activo para este delegado');
    return carnet;
  }

  async getPdf(id: string): Promise<{ carnet: any; pdfData: Buffer }> {
    const carnet = await this.findById(id);
    const pdfData = Buffer.from(
      JSON.stringify({
        cardCode: carnet.cardCode,
        type: carnet.type,
        issueDate: carnet.issueDate,
        expiryDate: carnet.expiryDate,
      }),
    );
    return { carnet, pdfData };
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.prisma.carnet.update({
      where: { id },
      data: { isActive: false },
      include: this.include,
    });
  }
}
