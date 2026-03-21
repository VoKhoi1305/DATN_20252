import { Matches } from 'class-validator';

/**
 * Validates that a string is a valid UUID (any version, including non-RFC-4122 hex UUIDs).
 * Built-in @IsUUID() rejects valid hex UUIDs that don't conform to RFC 4122 variant bits.
 */
export function IsUUIDLoose(): PropertyDecorator {
  return Matches(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    { message: '$property must be a UUID' },
  );
}
