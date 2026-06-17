import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePartidoDto } from './create-partido.dto';

export class UpdatePartidoDto extends PartialType(
  OmitType(CreatePartidoDto, ['fixtureId'] as const),
) {}
