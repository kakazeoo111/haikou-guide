import { compressAvatarImage } from "./avatarUploadUtils";
import { authFetch } from "./apiClient";

const AVATAR_UPLOAD_API_PATH = "/api/user/upload-avatar";
const AVATAR_FIELD_NAME = "avatar";
const PHONE_FIELD_NAME = "phone";

let avatarUploadLocked = false;

function setUserAvatar(setCurrentUser, currentUser, avatarUrl, persist) {
  const nextUser = { ...currentUser, avatar_url: avatarUrl };
  setCurrentUser(nextUser);
  if (persist) {
    localStorage.setItem("haikouUser", JSON.stringify(nextUser));
  }
}

function parseUploadError(data) {
  const message = data?.message || data?.error || "头像上传失败";
  return new Error(String(message));
}

export async function uploadAvatar({
  authApiBase,
  currentUser,
  file,
  setCurrentUser,
}) {
  if (avatarUploadLocked) throw new Error("头像正在上传，请稍候");
  if (!currentUser?.phone) throw new Error("请先登录后再更换头像");
  if (!file) throw new Error("未选择头像文件");

  const previousAvatar = currentUser.avatar_url || "";
  let previewUrl = "";
  avatarUploadLocked = true;
  try {
    const compressedFile = await compressAvatarImage(file);
    previewUrl = URL.createObjectURL(compressedFile);
    setUserAvatar(setCurrentUser, currentUser, previewUrl, false);

    const formData = new FormData();
    formData.append(AVATAR_FIELD_NAME, compressedFile);
    formData.append(PHONE_FIELD_NAME, currentUser.phone);

    const response = await authFetch(`${authApiBase}${AVATAR_UPLOAD_API_PATH}`, {
      method: "POST",
      body: formData,
    });
    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      console.error("头像接口响应解析失败:", error);
      throw new Error("服务器响应异常，请稍后重试");
    }
    if (!response.ok || !data?.ok) throw parseUploadError(data);
    const normalizedAvatarUrl = String(data.avatarUrl || "").replace(/^http:\/\//i, "https://");
    if (!normalizedAvatarUrl) throw new Error("服务器未返回头像地址");

    setUserAvatar(setCurrentUser, currentUser, normalizedAvatarUrl, true);
  } catch (error) {
    setUserAvatar(setCurrentUser, currentUser, previousAvatar, false);
    throw error;
  } finally {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    avatarUploadLocked = false;
  }
}
