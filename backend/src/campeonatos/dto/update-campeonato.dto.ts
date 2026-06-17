import { PartialType } from '@nestjs/swagger';
import { CreateCampeonatoDto } from './create-campeonato.dto';

export class UpdateCampeonatoDto extends PartialType(CreateCampeonatoDto) {}
