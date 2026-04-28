const UPLOAD_IMAGE_MAX_EDGE = 1280;
const UPLOAD_IMAGE_MIN_BYTES = 280 * 1024;
const UPLOAD_IMAGE_JPEG_MIME = "image/jpeg";
const UPLOAD_IMAGE_WEBP_MIME = "image/webp";
const UPLOAD_IMAGE_QUALITY = 0.75;
const UPLOAD_IMAGE_SIZE_REDUCTION_THRESHOLD = 0.97;
const UPLOAD_THUMBNAIL_MAX_EDGE = 320;
const UPLOAD_THUMBNAIL_QUALITY = 0.68;

let cachedWebpSupport = null;

function detectWebpEncoding() {
  if (cachedWebpSupport !== null) return cachedWebpSupport;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    cachedWebpSupport = canvas.toDataURL(UPLOAD_IMAGE_WEBP_MIME).startsWith(`data:${UPLOAD_IMAGE_WEBP_MIME}`);
    if (!cachedWebpSupport) console.warn("当前浏览器不支持 Canvas 输出 WebP，上传将降级为 JPEG");
  } catch (error) {
    console.warn("WebP 能力检测异常，降级为 JPEG", error);
    cachedWebpSupport = false;
  }
  return cachedWebpSupport;
}

function getOutputMime() {
  return detectWebpEncoding() ? UPLOAD_IMAGE_WEBP_MIME : UPLOAD_IMAGE_JPEG_MIME;
}

function getOutputExtension(outputMime) {
  return outputMime === UPLOAD_IMAGE_WEBP_MIME ? "webp" : "jpg";
}

function buildCompressedName(originalName, outputMime, suffix = "optimized") {
  const baseName = String(originalName || "upload").replace(/\.[^.]+$/, "");
  return `${baseName}_${suffix}.${getOutputExtension(outputMime)}`;
}

function getScaledSize(width, height, maxEdge) {
  if (!width || !height) return { width: maxEdge, height: maxEdge };
  const maxSide = Math.max(width, height);
  if (maxSide <= maxEdge) return { width, height };
  const scale = maxEdge / maxSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function readImageElement(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, outputMime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("图片压缩失败：无法生成压缩数据"));
          return;
        }
        resolve(blob);
      },
      outputMime,
      quality,
    );
  });
}

function shouldSkipOptimize(file, outputMime) {
  const mime = String(file.type || "").toLowerCase();
  if (!mime.startsWith("image/")) return true;
  return file.size <= UPLOAD_IMAGE_MIN_BYTES && mime === outputMime;
}

async function encodeImageVariant(file, { maxEdge, quality, suffix, allowSkipBySize = false }) {
  const outputMime = getOutputMime();
  if (allowSkipBySize && shouldSkipOptimize(file, outputMime)) return file;

  const image = await readImageElement(file);
  const target = getScaledSize(image.width, image.height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("图片压缩失败：无法初始化画布");
  context.drawImage(image, 0, 0, target.width, target.height);

  const blob = await canvasToBlob(canvas, outputMime, quality);
  if (allowSkipBySize && blob.size >= file.size * UPLOAD_IMAGE_SIZE_REDUCTION_THRESHOLD && target.width === image.width && target.height === image.height) {
    return file;
  }
  return new File([blob], buildCompressedName(file.name, outputMime, suffix), {
    type: outputMime,
    lastModified: Date.now(),
  });
}

export async function optimizeUploadImage(file) {
  if (!(file instanceof File)) throw new Error("上传文件无效，请重新选择图片");
  return encodeImageVariant(file, {
    maxEdge: UPLOAD_IMAGE_MAX_EDGE,
    quality: UPLOAD_IMAGE_QUALITY,
    suffix: "optimized",
    allowSkipBySize: true,
  });
}

export async function optimizeUploadImages(files) {
  const list = Array.isArray(files) ? files : Array.from(files || []);
  if (!list.length) return [];
  const result = [];
  for (const file of list) result.push(await optimizeUploadImage(file));
  return result;
}

export async function buildUploadImagesBundle(files) {
  const images = await optimizeUploadImages(files);
  if (!images.length) return { images: [], thumbnails: [] };
  const thumbnails = [];
  for (const image of images) {
    try {
      const thumb = await encodeImageVariant(image, {
        maxEdge: UPLOAD_THUMBNAIL_MAX_EDGE,
        quality: UPLOAD_THUMBNAIL_QUALITY,
        suffix: "thumb",
      });
      thumbnails.push(thumb);
    } catch (error) {
      console.error("缩略图生成失败，使用原图兜底", error);
      thumbnails.push(image);
    }
  }
  return { images, thumbnails };
}

export async function appendOptimizedImagesWithThumbnails(formData, files, options = {}) {
  const imageField = options.imageField || "images";
  const thumbnailField = options.thumbnailField || "thumbnails";
  const { images, thumbnails } = await buildUploadImagesBundle(files);
  images.forEach((file) => formData.append(imageField, file));
  thumbnails.forEach((file) => formData.append(thumbnailField, file));
  return { images, thumbnails };
}
