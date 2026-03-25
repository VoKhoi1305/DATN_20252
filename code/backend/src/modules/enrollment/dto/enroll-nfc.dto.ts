import { IsString, IsOptional, IsBase64, MinLength } from 'class-validator';

export class EnrollNfcDto {
  /**
   * Raw chip data read from NFC — hashed and stored as cccd_chip_hash.
   * This is the concatenation of Data Groups (DG1+DG2) from the ICAO 9303 chip.
   */
  @IsString()
  @MinLength(1)
  chipData!: string;

  /**
   * Serial number of the NFC chip (UID).
   */
  @IsString()
  @IsOptional()
  chipSerial?: string;

  /**
   * Base64-encoded Passive Authentication signature data from the chip.
   * Contains the Document Security Object (SOD) with digital signature.
   */
  @IsBase64()
  @IsOptional()
  passiveAuthData?: string;

  /**
   * Personal info read from chip DG1 for cross-verification with Subject record.
   */
  @IsString()
  @IsOptional()
  chipFullName?: string;

  @IsString()
  @IsOptional()
  chipCccdNumber?: string;
}
