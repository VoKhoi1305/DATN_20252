import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetEnrollmentDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;

  /**
   * Also reset the enrolled device so the subject must re-register
   * their device during re-enrollment. Defaults to false.
   */
  @IsOptional()
  @IsBoolean()
  resetDevice?: boolean;
}
