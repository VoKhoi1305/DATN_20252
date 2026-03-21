import { IsString, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGeofenceDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  address!: string;

  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  center_lat!: number;

  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  center_lng!: number;

  @IsNumber()
  @Type(() => Number)
  @Min(50)
  @Max(50000)
  radius!: number;
}
