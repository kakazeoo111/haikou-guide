import path from "path";
import multer from "multer";

const UPLOAD_FILE_SIZE_LIMIT_BYTES = 5 * 1024 * 1024;
const UPLOAD_RANDOM_SUFFIX_MAX = 1e9;
const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function buildUploadFilename(originalName) {
  const extension = path.extname(String(originalName || "")).toLowerCase();
  const safeExtension = ALLOWED_IMAGE_EXTENSIONS.has(extension) ? extension : "";
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * UPLOAD_RANDOM_SUFFIX_MAX)}`;
  return `${uniqueSuffix}${safeExtension}`;
}

function filterImageFile(req, file, cb) {
  const extension = path.extname(String(file?.originalname || "")).toLowerCase();
  const mimeType = String(file?.mimetype || "").toLowerCase();
  if (ALLOWED_IMAGE_EXTENSIONS.has(extension) && ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    cb(null, true);
    return;
  }
  cb(new Error("仅支持上传 jpg、png、webp、gif 图片"));
}

export function createUploadMiddleware(uploadDir) {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadDir),
      filename: (req, file, cb) => cb(null, buildUploadFilename(file.originalname)),
    }),
    fileFilter: filterImageFile,
    limits: { fileSize: UPLOAD_FILE_SIZE_LIMIT_BYTES },
  });
}
