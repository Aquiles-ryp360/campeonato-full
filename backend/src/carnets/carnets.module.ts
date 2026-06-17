import { Module } from '@nestjs/common';
import { CarnetsService } from './carnets.service';
import { CarnetsController } from './carnets.controller';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CarnetsController],
  providers: [CarnetsService],
  exports: [CarnetsService],
})
export class CarnetsModule {}
