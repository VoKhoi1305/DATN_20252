import { IsString, MinLength, MaxLength } from 'class-validator';

export class CloseCaseDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  closing_note!: string;
}
