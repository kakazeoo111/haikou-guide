const AVATAR_MAX_EDGE = 720;
const AVATAR_JPEG_QUALITY = 0.82;
const AVATAR_MIME_TYPE = "image/jpeg";
const AVATAR_MAX_INPUT_BYTES = 600 * 1024;

function getTargetSize(width, height) {
  if (!width || !height) return { width: AVATAR_MAX_EDGE, height: AVATAR_MAX_EDGE };
  const maxSide = Math.max(width, height);
  if (maxSide <= AVATAR_MAX_EDGE) return { width, height };
  const scale = AVATAR_MAX_EDGE / maxSide;
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

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("头像压缩失败：无法生成图片数据"));
          return;
        }
        resolve(blob);
      },
      AVATAR_MIME_TYPE,
      AVATAR_JPEG_QUALITY,
    );
  });
}

function buildCompressedName(originalName) {
  const safeName = String(originalName || "avatar").replace(/\.[^.]+$/, "");
  return `${safeName}_compressed.jpg`;
}

export async function compressAvatarImage(file) {
  if (!(file instanceof File)) throw new Error("头像文件无效");
  if (!String(file.type || "").startsWith("image/")) throw new Error("只能上传图片格式头像");
  if (file.size <= AVATAR_MAX_INPUT_BYTES && file.type === AVATAR_MIME_TYPE) return file;

  const image = await readImageElement(file);
  const target = getTargetSize(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("头像压缩失败：无法初始化画布");
  context.drawImage(image, 0, 0, target.width, target.height);

  const blob = await canvasToBlob(canvas);
  return new File([blob], buildCompressedName(file.name), {
    type: AVATAR_MIME_TYPE,
    lastModified: Date.now(),
  });
}
