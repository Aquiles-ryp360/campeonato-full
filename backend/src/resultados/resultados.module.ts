import { Module } from '@nestjs/common';
import { ResultadosService } from './resultados.service';
import { ResultadosController } from './resultados.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResultadosController],
  providers: [ResultadosService],
  exports: [ResultadosService],
})
export class ResultadosModule {}
