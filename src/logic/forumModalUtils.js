export const MAX_FORUM_IMAGES = 9;
export const MAX_FORUM_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const FORUM_IMAGE_TOO_LARGE_MESSAGE = "发布的图片内存过大（不得超过5MB）";

export const forumPageStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  zIndex: 3500,
  background: "#f8fbf9",
  display: "flex",
  flexDirection: "column",
};

export const forumHeaderStyle = {
  height: "56px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 14px",
  borderBottom: "1px solid #e8efe9",
  background: "#fff",
};

export const forumOnlinePillStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "4px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  background: "#eef8f2",
  color: "#2e6a4a",
  border: "1px solid #d6ecde",
};

export function buildForumPostsUrl(authApiBase, phone, keyword, sortMode) {
  const params = new URLSearchParams({
    phone: String(phone || "").trim(),
    search: String(keyword || "").trim(),
    sort: sortMode,
  });
  return `${authApiBase}/api/forum/posts?${params.toString()}`;
}

export function normalizeForumPosts(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    call_count: Number(item.call_count || 0),
    comment_count: Number(item.comment_count || 0),
    is_called: Boolean(item.is_called),
  }));
}

export function splitValidForumFiles(rawFiles) {
  const files = Array.from(rawFiles || []);
  if (!files.length) return { validFiles: [], hasOversizedFile: false };
  const validFiles = files.filter((file) => Number(file.size || 0) <= MAX_FORUM_IMAGE_SIZE_BYTES);
  return { validFiles, hasOversizedFile: validFiles.length !== files.length };
}
