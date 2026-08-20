const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/x-matroska"];

export interface MediaSelectionResult {
  accepted: File[];
  error: string | null;
}

// Une importation contient soit plusieurs images, soit une seule vidéo — jamais les deux.
// Les fichiers valides sont conservés même quand d'autres sont rejetés/incompatibles.
export function validateMediaSelection(files: File[]): MediaSelectionResult {
  const images = files.filter((f) => IMAGE_TYPES.includes(f.type));
  const videos = files.filter((f) => VIDEO_TYPES.includes(f.type));
  const rejected = files.filter((f) => !IMAGE_TYPES.includes(f.type) && !VIDEO_TYPES.includes(f.type));

  const errors: string[] = [];
  if (rejected.length > 0) {
    errors.push(`Format non supporté et ignoré : ${rejected.map((f) => f.name).join(", ")}.`);
  }

  if (videos.length > 0 && images.length > 0) {
    errors.push("Une vidéo ne peut pas être importée avec des images : seules les images ont été conservées.");
    return { accepted: images, error: errors.join(" ") };
  }

  if (videos.length > 1) {
    errors.push("Une seule vidéo peut être importée à la fois : seule la première a été conservée.");
    return { accepted: [videos[0]], error: errors.join(" ") };
  }

  return { accepted: videos.length === 1 ? videos : images, error: errors.length > 0 ? errors.join(" ") : null };
}
