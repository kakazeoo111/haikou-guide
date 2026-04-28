import { toPublicUploadUrl } from "./uploadUrl.js";

function toFileList(value) {
  return Array.isArray(value) ? value : [];
}

export function getUploadedImageAndThumbFiles(files) {
  if (Array.isArray(files)) return { images: files, thumbnails: [] };
  const group = files && typeof files === "object" ? files : {};
  return {
    images: toFileList(group.images),
    thumbnails: toFileList(group.thumbnails),
  };
}

export function buildUploadedImagePayload(images, thumbnails) {
  const imageFiles = toFileList(images);
  const thumbFiles = toFileList(thumbnails);
  if (!imageFiles.length) return [];
  return imageFiles
    .map((imageFile, index) => {
      const url = toPublicUploadUrl(imageFile?.filename);
      if (!url) return null;
      const thumbnail = toPublicUploadUrl(thumbFiles[index]?.filename) || url;
      if (thumbnail === url) return url;
      return { url, thumbnail };
    })
    .filter(Boolean);
}
