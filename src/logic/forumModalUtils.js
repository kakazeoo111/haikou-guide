export const MAX_FORUM_IMAGES = 9;
export const MAX_FORUM_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const FORUM_IMAGE_TOO_LARGE_MESSAGE = "发布的图片内存过大（不得超过5MB）";

const PRIMARY_GREEN = "#5aa77b";
const PRIMARY_DARK_GREEN = "#2e6a4a";
const SOFT_BORDER = "#e1ede5";

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
  padding: "6px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  background: "#eef8f2",
  color: PRIMARY_DARK_GREEN,
  border: "1px solid #d6ecde",
};

export const forumNoticeButtonStyle = {
  border: "1px solid #cfe8db",
  background: "#f2fbf6",
  color: PRIMARY_DARK_GREEN,
  borderRadius: "999px",
  padding: "6px 14px",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
};

export const forumHintBannerStyle = {
  margin: "0 0 12px 0",
  padding: "10px 14px",
  background: "linear-gradient(90deg, #eefbf3, #f5fcf8)",
  border: `1px solid ${SOFT_BORDER}`,
  borderRadius: "14px",
  fontSize: "12px",
  color: PRIMARY_DARK_GREEN,
  fontWeight: 600,
};

export const forumPostCardStyle = {
  background: "#fff",
  borderRadius: "20px",
  padding: "14px",
  border: "1px solid #e7f1eb",
  marginBottom: "12px",
  boxShadow: "0 4px 14px rgba(90,167,123,0.06)",
  position: "relative",
};

export const forumPostLabelStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "4px 10px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #eafff1, #e9f7ff)",
  border: "1px solid #d9f0e4",
  color: "#1f5f45",
  fontSize: "11px",
  fontWeight: 700,
  marginBottom: "10px",
};

export const forumTextAreaStyle = {
  width: "100%",
  minHeight: "90px",
  border: `1px solid ${SOFT_BORDER}`,
  borderRadius: "12px",
  padding: "12px",
  boxSizing: "border-box",
  resize: "vertical",
  background: "#f9fcfa",
  fontSize: "14px",
  outline: "none",
  color: "#2b3a33",
};

export const forumSearchRowStyle = { display: "flex", gap: "8px", marginBottom: "10px" };

export const forumSearchInputStyle = {
  flex: 1,
  height: "42px",
  border: `1px solid ${SOFT_BORDER}`,
  borderRadius: "12px",
  padding: "0 14px",
  outline: "none",
  background: "#fff",
  fontSize: "14px",
  color: "#2b3a33",
  boxSizing: "border-box",
};

export const forumSearchButtonStyle = {
  height: "42px",
  padding: "0 20px",
  borderRadius: "12px",
  border: "none",
  background: PRIMARY_GREEN,
  color: "white",
  fontWeight: 700,
  fontSize: "14px",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(90,167,123,0.22)",
};

export const forumSortButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  border: "1px solid #d6ecde",
  background: "#f2fbf6",
  color: PRIMARY_DARK_GREEN,
  borderRadius: "999px",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
};

export const forumSubmitPostButtonStyle = {
  height: "42px",
  padding: "0 22px",
  borderRadius: "12px",
  border: "none",
  background: PRIMARY_GREEN,
  color: "white",
  fontWeight: 700,
  fontSize: "14px",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(90,167,123,0.22)",
  marginLeft: "auto",
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
