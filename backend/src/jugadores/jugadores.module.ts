import { Module } from '@nestjs/common';
import { JugadoresService } from './jugadores.service';
import { JugadoresController } from './jugadores.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [JugadoresController],
  providers: [JugadoresService],
  exports: [JugadoresService],
})
export class JugadoresModule {}
