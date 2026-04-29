import { useEffect, useMemo, useState } from "react";
import { getAvatarWithFallback } from "../logic/avatarFallback";
import { AUTH_API_BASE, toPublicHttpsUrl } from "../appConfig";
import LikeHeartIcon from "./LikeHeartIcon";

const authApiBase = AUTH_API_BASE;

function formatDateTime(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function toHttpsUrl(url) {
  return toPublicHttpsUrl(url);
}

function parseCommentImageUrls(imageValue) {
  if (!imageValue || imageValue === "null" || imageValue === "[]") return [];
  if (Array.isArray(imageValue)) return imageValue.map((item) => toHttpsUrl(item)).filter(Boolean);
  const normalized = String(imageValue || "").trim();
  if (!normalized) return [];
  if (normalized.startsWith("[")) {
    try {
      const parsed = JSON.parse(normalized);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => toHttpsUrl(item)).filter(Boolean);
    } catch (error) {
      console.error("只读评论图片解析失败:", error.message);
      return [];
    }
  }
  const single = toHttpsUrl(normalized);
  return single ? [single] : [];
}

function getCommentAvatar(comment) {
  return getAvatarWithFallback(toHttpsUrl(comment.avatar_url), comment.user_phone, comment.username);
}

function buildCommentDisplayList(comments) {
  const safeList = Array.isArray(comments) ? comments : [];
  const byId = new Map();
  safeList.forEach((item) => byId.set(Number(item.id), item));
  return [...safeList]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((item) => ({
      ...item,
      _isReply: Boolean(item.parent_id),
      _replyToName: item.parent_id ? byId.get(Number(item.parent_id))?.username || "" : "",
      _images: parseCommentImageUrls(item.image_url),
    }));
}

function CommentImageList({ images }) {
  if (!images.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginTop: "8px", maxWidth: "210px" }}>
      {images.map((url, index) => (
        <img
          key={`${url}-${index}`}
          src={url}
          alt="readonly-comment"
          style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "8px", objectFit: "cover", border: "1px solid #dbece3" }}
        />
      ))}
    </div>
  );
}

function CommentItem({ item }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px dashed #dcece4" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <img src={getCommentAvatar(item)} alt="readonly-avatar" style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", border: "1px solid #d3e6dc" }} />
        <div style={{ fontSize: "12px", color: "#2d5f49", fontWeight: 700 }}>{item.username || item.user_phone || "游客"}</div>
        <div style={{ marginLeft: "auto", fontSize: "11px", color: "#8aa398" }}>{formatDateTime(item.created_at)}</div>
      </div>
      <div style={{ marginTop: "6px", fontSize: "13px", color: "#254739", lineHeight: 1.5 }}>
        {item._isReply && item._replyToName ? <span style={{ color: "#5aa77b" }}>回复 @{item._replyToName}：</span> : null}
        {item.content || "（无文本）"}
      </div>
      <CommentImageList images={item._images} />
      <div style={{ marginTop: "6px", fontSize: "11px", color: "#7e968c" }}>❤ {Number(item.like_count || 0)}</div>
    </div>
  );
}

function ReadonlyComments({ loading, error, comments }) {
  if (loading) return <div style={{ fontSize: "12px", color: "#7c988b", padding: "10px 0" }}>评论加载中...</div>;
  if (error) return <div style={{ fontSize: "12px", color: "#cc4c4c", padding: "10px 0" }}>{error}</div>;
  if (!comments.length) return <div style={{ fontSize: "12px", color: "#8aa096", padding: "10px 0" }}>暂无评论</div>;
  return (
    <div style={{ maxHeight: "240px", overflowY: "auto", paddingRight: "2px" }}>
      {comments.map((item) => (
        <CommentItem key={`readonly-comment-${item.id}`} item={item} />
      ))}
    </div>
  );
}

function UserRecommendedPlaceReadonly({ place, visible }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [comments, setComments] = useState([]);

  const commentDisplayList = useMemo(() => buildCommentDisplayList(comments), [comments]);
  const placeCommentCount = Number(place?.commentCount || 0);
  const totalCommentCount = Math.max(placeCommentCount, commentDisplayList.length);

  useEffect(() => {
    if (!visible || !place?.id) {
      queueMicrotask(() => {
        setLoading(false);
        setError("");
        setComments([]);
      });
      return;
    }
    const controller = new AbortController();
    queueMicrotask(() => {
      setLoading(true);
      setError("");
    });
    fetch(`${authApiBase}/api/comments/rec_${place.id}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((result) => {
        if (!result.ok) throw new Error(result.message || "评论加载失败");
        setComments(Array.isArray(result.comments) ? result.comments : []);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error("加载推荐评论失败:", error.message);
        setError(`评论加载失败：${error.message}`);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [place?.id, visible]);

  if (!place) return <div style={{ fontSize: "12px", color: "#7e9b8d", padding: "12px 0 4px" }}>点击上方景点标签查看详情</div>;

  return (
    <div style={{ marginTop: "10px", borderRadius: "16px", border: "1px solid #d3eadf", background: "rgba(255,255,255,0.82)", padding: "10px" }}>
      <div style={{ fontSize: "15px", fontWeight: 800, color: "#214638" }}>{place.name}</div>
      <div style={{ fontSize: "11px", color: "#6d8f81", marginTop: "4px" }}>推荐时间：{formatDateTime(place.createdAt)}</div>
      <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", borderRadius: "999px", border: "1px solid #d6e8de", background: "#f8fffb", padding: "4px 9px", fontSize: "12px", color: "#406957", fontWeight: 700 }}>
          <LikeHeartIcon liked size={12} />
          {Number(place.likeCount || 0)}
        </span>
        <span style={{ borderRadius: "999px", border: "1px solid #d6e8de", background: "#f8fffb", padding: "4px 9px", fontSize: "12px", color: "#406957", fontWeight: 700 }}>💬 {totalCommentCount}</span>
        <span style={{ borderRadius: "999px", border: "1px solid #dbe7ef", background: "#f5f9ff", padding: "4px 9px", fontSize: "11px", color: "#5f7f95" }}>只读模式</span>
      </div>
      <div style={{ fontSize: "12px", color: "#355e4c", marginTop: "8px", lineHeight: 1.5 }}>{place.description || "这位用户暂未填写推荐说明。"}</div>
      {Array.isArray(place.images) && place.images.length > 0 && (
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", marginTop: "9px", paddingBottom: "2px" }}>
          {place.images.map((url, index) => (
            <img
              key={`${place.id}-img-${index}`}
              src={url}
              alt="readonly-place"
              style={{ width: "90px", height: "64px", borderRadius: "10px", objectFit: "cover", border: "1px solid #d8ece2", flexShrink: 0, background: "#eef7f2" }}
            />
          ))}
        </div>
      )}
      <div style={{ marginTop: "10px", borderTop: "1px dashed #dcece4", paddingTop: "8px" }}>
        <div style={{ fontSize: "12px", color: "#3f6655", fontWeight: 800, marginBottom: "2px" }}>评论区（只读）</div>
        <ReadonlyComments loading={loading} error={error} comments={commentDisplayList} />
      </div>
    </div>
  );
}

export default UserRecommendedPlaceReadonly;
