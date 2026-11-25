export const petPhotoTypes = ["image/jpeg", "image/png", "image/webp"];

export function getPetPhotoError(file: File) {
  if (!file.size || !petPhotoTypes.includes(file.type)) return "Choose a JPG, PNG, or WebP image.";
  if (file.size > 5 * 1024 * 1024) return "The pet photo must be 5 MB or smaller.";
  return null;
}
