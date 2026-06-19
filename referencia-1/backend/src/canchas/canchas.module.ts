import { Module } from '@nestjs/common';
import { CanchasService } from './canchas.service';
import { CanchasController } from './canchas.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CanchasController],
  providers: [CanchasService],
  exports: [CanchasService],
})
export class CanchasModule {}
