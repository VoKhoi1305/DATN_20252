/**
 * Face enrollment is done via multipart/form-data with a file upload.
 * This DTO is used for the non-file fields.
 */
export class EnrollFaceMetadataDto {
  // No additional fields needed — the face image is sent as multipart file.
  // The Face Recognition service handles detection, quality, liveness, embedding.
}
