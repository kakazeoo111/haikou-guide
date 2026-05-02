import path from "path";
import multer from "multer";
import fs from "fs/promises";

const UPLOAD_FILE_SIZE_LIMIT_BYTES = 5 * 1024 * 1024;
const UPLOAD_RANDOM_SUFFIX_MAX = 1e9;
const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const IMAGE_SIGNATURE_READ_BYTES = 16;

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

function getUploadedFileList(req) {
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  if (req.files && typeof req.files === "object" && !Array.isArray(req.files)) {
    Object.values(req.files).forEach((group) => {
      if (Array.isArray(group)) files.push(...group);
    });
  }
  return files;
}

function hasValidImageSignature(buffer, mimeType) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mime === "image/gif") {
    const header = buffer.subarray(0, 6).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }
  return false;
}

async function removeUploadedFiles(files) {
  await Promise.all(
    files
      .map((file) => file?.path)
      .filter(Boolean)
      .map((filePath) => fs.unlink(filePath).catch(() => {})),
  );
}

export async function validateUploadedImages(req, res) {
  const files = getUploadedFileList(req);
  try {
    for (const file of files) {
      const handle = await fs.open(file.path, "r");
      try {
        const buffer = Buffer.alloc(IMAGE_SIGNATURE_READ_BYTES);
        const { bytesRead } = await handle.read(buffer, 0, IMAGE_SIGNATURE_READ_BYTES, 0);
        if (bytesRead < 4 || !hasValidImageSignature(buffer, file.mimetype)) {
          await removeUploadedFiles(files);
          res.status(400).json({ ok: false, message: "上传文件不是有效图片" });
          return false;
        }
      } finally {
        await handle.close();
      }
    }
    return true;
  } catch (error) {
    console.error("图片签名校验失败:", error.message);
    await removeUploadedFiles(files);
    res.status(400).json({ ok: false, message: "图片上传校验失败" });
    return false;
  }
}
