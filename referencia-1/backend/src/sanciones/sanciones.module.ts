import { Module } from '@nestjs/common';
import { SancionesService } from './sanciones.service';
import { SancionesController } from './sanciones.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SancionesController],
  providers: [SancionesService],
  exports: [SancionesService],
})
export class SancionesModule {}
