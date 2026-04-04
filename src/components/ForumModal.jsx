import { useEffect, useState } from "react";
import { getBadgeEmoji, getBadgeTheme } from "../logic/badgeTheme";
import { btnMainStyle } from "../styles/appStyles";
import { parseForumImageUrls } from "../logic/forumImageUtils";
const MAX_FORUM_IMAGES = 9, FORUM_POST_INPUT_ID = "forum-post-images-input";
const pageStyle = {
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
const headerStyle = {
  height: "56px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 14px",
  borderBottom: "1px solid #e8efe9",
  background: "#fff",
};
function getAvatarSrc(phone, avatarUrl) {
  const normalized = String(avatarUrl || "").trim();
  if (normalized) return normalized.replace("http://", "https://");
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone || "forum-user"}`;
}
function ForumModal({ currentUser, authApiBase, activeBadgeTitle, activeBadgeMeta, onBack, onZoomImage, formatCommentTime }) {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImages, setPostImages] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [expandedPostIds, setExpandedPostIds] = useState([]);
  const [commentsMap, setCommentsMap] = useState({});
  const [loadingCommentPostIds, setLoadingCommentPostIds] = useState([]);
  const [submittingCommentPostIds, setSubmittingCommentPostIds] = useState([]);
  const [commentDraftMap, setCommentDraftMap] = useState({});
  const [replyTargetMap, setReplyTargetMap] = useState({});

  const badgeSeed = `${currentUser?.phone || ""}-${activeBadgeTitle || ""}`;
  const badgeTheme = getBadgeTheme(badgeSeed);
  const badgeIcon = getBadgeEmoji(badgeSeed, activeBadgeMeta?.icon || "");
  const selfBadgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    borderRadius: "999px",
    padding: "2px 8px",
    fontSize: "11px",
    fontWeight: 700,
    background: badgeTheme.background,
    border: `1px solid ${badgeTheme.border}`,
    color: badgeTheme.textColor,
  };

  const loadPosts = async (keyword) => {
    if (!currentUser?.phone) return;
    setLoadingPosts(true);
    try {
      const query = encodeURIComponent(String(keyword || "").trim());
      const res = await fetch(`${authApiBase}/api/forum/posts?phone=${currentUser.phone}&search=${query}`);
      const data = await res.json();
      if (!data.ok) return alert(data.message || "论坛内容获取失败");
      setPosts(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error("论坛帖子加载失败:", error);
      alert("网络错误，论坛内容加载失败");
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    loadPosts("");
  }, [currentUser?.phone]);

  useEffect(() => {
    if (searchKeyword.trim()) return;
    loadPosts("");
  }, [searchKeyword]);

  const loadComments = async (postId) => {
    if (!currentUser?.phone) return;
    setLoadingCommentPostIds((prev) => [...prev, postId]);
    try {
      const res = await fetch(`${authApiBase}/api/forum/comments/${postId}?phone=${currentUser.phone}`);
      const data = await res.json();
      if (!data.ok) return alert(data.message || "论坛评论加载失败");
      setCommentsMap((prev) => ({ ...prev, [postId]: Array.isArray(data.data) ? data.data : [] }));
    } catch (error) {
      console.error("论坛评论加载失败:", error);
      alert("网络错误，评论加载失败");
    } finally {
      setLoadingCommentPostIds((prev) => prev.filter((id) => id !== postId));
    }
  };

  const handleToggleComments = async (postId) => {
    if (expandedPostIds.includes(postId)) {
      setExpandedPostIds((prev) => prev.filter((id) => id !== postId));
      return;
    }
    setExpandedPostIds((prev) => [...prev, postId]);
    if (!commentsMap[postId]) await loadComments(postId);
  };

  const handleSelectPostImages = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const remain = MAX_FORUM_IMAGES - postImages.length;
    if (remain <= 0) {
      alert(`最多上传 ${MAX_FORUM_IMAGES} 张图片`);
      event.target.value = "";
      return;
    }
    const picked = files.slice(0, remain);
    setPostImages((prev) => [...prev, ...picked]);
    if (files.length > remain) alert(`最多上传 ${MAX_FORUM_IMAGES} 张图片，已自动截取前 ${remain} 张`);
    event.target.value = "";
  };

  const handleSubmitPost = async () => {
    const content = postContent.trim();
    if (!content && postImages.length === 0) return alert("发布内容不能为空");
    setSubmittingPost(true);
    try {
      const formData = new FormData();
      formData.append("phone", currentUser.phone);
      formData.append("content", content);
      postImages.forEach((file) => formData.append("images", file));
      const res = await fetch(`${authApiBase}/api/forum/post/add`, { method: "POST", body: formData });
      const data = await res.json();
      if (!data.ok) return alert(data.message || "发帖失败");
      setPostContent("");
      setPostImages([]);
      await loadPosts(searchKeyword);
    } catch (error) {
      console.error("论坛发帖失败:", error);
      alert("网络错误，发帖失败");
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleSubmitComment = async (postId) => {
    const content = String(commentDraftMap[postId] || "").trim();
    if (!content) return alert("评论内容不能为空");
    const replyTarget = replyTargetMap[postId];
    setSubmittingCommentPostIds((prev) => [...prev, postId]);
    try {
      const res = await fetch(`${authApiBase}/api/forum/comment/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, postId, content, parentId: replyTarget ? replyTarget.id : null }),
      });
      const data = await res.json();
      if (!data.ok) return alert(data.message || "评论发布失败");
      setCommentDraftMap((prev) => ({ ...prev, [postId]: "" }));
      setReplyTargetMap((prev) => ({ ...prev, [postId]: null }));
      await loadComments(postId);
      await loadPosts(searchKeyword);
    } catch (error) {
      console.error("论坛评论发布失败:", error);
      alert("网络错误，评论发布失败");
    } finally {
      setSubmittingCommentPostIds((prev) => prev.filter((id) => id !== postId));
    }
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <span onClick={onBack} style={{ cursor: "pointer", fontSize: "18px" }}>&lt; 返回</span>
        <span style={{ fontWeight: 700, color: "#2e6a4a" }}>24小时论坛</span>
        <span style={{ width: "58px" }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 24px 14px" }}>
        <div style={{ background: "#fff", borderRadius: "20px", padding: "12px", border: "1px solid #e7f1eb", marginBottom: "12px" }}>
          <textarea
            value={postContent}
            onChange={(event) => setPostContent(event.target.value)}
            placeholder="发布你的24小时动态..."
            style={{ width: "100%", minHeight: "90px", border: "1px solid #dce8e1", borderRadius: "12px", padding: "10px", boxSizing: "border-box", resize: "vertical" }}
          />
          {postImages.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px", maxWidth: "280px" }}>
              {postImages.map((file, index) => (
                <div key={`${file.name}-${index}`} style={{ position: "relative" }}>
                  <img src={URL.createObjectURL(file)} alt="forum-post-preview" style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "8px", objectFit: "cover" }} />
                  <div onClick={() => setPostImages((prev) => prev.filter((_, i) => i !== index))} style={{ position: "absolute", top: "-5px", right: "-5px", width: "18px", height: "18px", borderRadius: "50%", background: "#ff4d4f", color: "#fff", textAlign: "center", lineHeight: "18px", cursor: "pointer" }}>×</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
            <button onClick={() => document.getElementById(FORUM_POST_INPUT_ID)?.click()} style={{ ...btnMainStyle, marginTop: 0, width: "auto", padding: "8px 14px", borderRadius: "999px" }}>添加图片</button>
            <span style={{ fontSize: "12px", color: "#6e867a" }}>已选 {postImages.length}/{MAX_FORUM_IMAGES}</span>
            <input id={FORUM_POST_INPUT_ID} type="file" hidden accept="image/*" multiple onChange={handleSelectPostImages} />
            <button onClick={handleSubmitPost} disabled={submittingPost} style={{ ...btnMainStyle, marginTop: 0, marginLeft: "auto", width: "auto", padding: "8px 16px" }}>{submittingPost ? "发布中..." : "发布"}</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <input
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            placeholder="搜索用户或帖子内容"
            style={{ flex: 1, border: "1px solid #dce8e1", borderRadius: "12px", padding: "10px 12px", outline: "none", background: "#fff" }}
          />
          <button onClick={() => loadPosts(searchKeyword)} style={{ ...btnMainStyle, marginTop: 0, width: "90px" }}>搜索</button>
        </div>

        {loadingPosts && <div style={{ textAlign: "center", color: "#7a8f85", padding: "12px 0" }}>论坛内容加载中...</div>}
        {!loadingPosts && posts.length === 0 && <div style={{ textAlign: "center", color: "#97a8a0", padding: "16px 0" }}>24小时内暂无相关帖子</div>}

        {!loadingPosts && posts.map((post) => {
          const postId = Number(post.id);
          const postImageUrls = parseForumImageUrls(post.image_url);
          const comments = commentsMap[postId] || [];
          const commentMap = new Map(comments.map((item) => [Number(item.id), item]));
          const replying = replyTargetMap[postId];
          const isSelfPost = String(post.user_phone || "") === String(currentUser?.phone || "");

          return (
            <div key={post.id} style={{ border: "1px solid #ebf2ee", borderRadius: "20px", padding: "12px", marginBottom: "12px", background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <img src={getAvatarSrc(post.user_phone, post.avatar_url)} alt="forum-user-avatar" style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover" }} />
                <div style={{ fontSize: "13px", color: "#456a56", fontWeight: 700 }}>{post.username}</div>
                {isSelfPost && (
                  <span style={selfBadgeStyle}>
                    <span>{badgeIcon}</span>
                    <span>{activeBadgeTitle || "未解锁称号"}</span>
                  </span>
                )}
                <div style={{ fontSize: "11px", color: "#9db0a7", marginLeft: "auto" }}>{formatCommentTime(post.created_at)}</div>
              </div>
              <div style={{ marginTop: "8px", whiteSpace: "pre-wrap", color: "#233a2f", lineHeight: 1.55, fontSize: "14px" }}>{post.content || "（图片帖）"}</div>
              {postImageUrls.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px", maxWidth: "320px" }}>
                  {postImageUrls.map((url, index) => (
                    <img
                      key={`${post.id}-${index}`}
                      src={url}
                      alt="forum-post-img"
                      style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "8px", objectFit: "cover", cursor: "zoom-in" }}
                      onClick={() => onZoomImage(postImageUrls, index)}
                    />
                  ))}
                </div>
              )}
              <div style={{ marginTop: "10px" }}>
                <span onClick={() => handleToggleComments(postId)} style={{ fontSize: "12px", color: "#5aa77b", cursor: "pointer", fontWeight: 700 }}>
                  {expandedPostIds.includes(postId) ? "收起评论" : `查看评论（${post.comment_count || 0}）`}
                </span>
              </div>
              {expandedPostIds.includes(postId) && (
                <div style={{ marginTop: "10px", background: "#f9fcfa", borderRadius: "12px", padding: "10px", border: "1px solid #edf4f0" }}>
                  {loadingCommentPostIds.includes(postId) && <div style={{ fontSize: "12px", color: "#8fa39a" }}>评论加载中...</div>}
                  {!loadingCommentPostIds.includes(postId) && comments.length === 0 && <div style={{ fontSize: "12px", color: "#9aac9f" }}>暂无评论，来抢沙发吧</div>}
                  {!loadingCommentPostIds.includes(postId) && comments.map((comment) => {
                    const parent = comment.parent_id ? commentMap.get(Number(comment.parent_id)) : null;
                    const isSelfComment = String(comment.user_phone || "") === String(currentUser?.phone || "");
                    return (
                      <div key={comment.id} style={{ borderBottom: "1px dashed #e5eeea", padding: "8px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12px", color: "#39664f", fontWeight: 700 }}>{comment.username}</span>
                          {isSelfComment && (
                            <span style={selfBadgeStyle}>
                              <span>{badgeIcon}</span>
                              <span>{activeBadgeTitle || "未解锁称号"}</span>
                            </span>
                          )}
                          {parent && <span style={{ fontSize: "11px", color: "#7f968a" }}>回复 @{parent.username}</span>}
                          <span style={{ marginLeft: "auto", fontSize: "11px", color: "#a3b3ac" }}>{formatCommentTime(comment.created_at)}</span>
                        </div>
                        <div style={{ marginTop: "4px", fontSize: "13px", color: "#2d4439", whiteSpace: "pre-wrap" }}>{comment.content}</div>
                        <div style={{ marginTop: "4px" }}>
                          <span onClick={() => setReplyTargetMap((prev) => ({ ...prev, [postId]: comment }))} style={{ fontSize: "11px", color: "#5aa77b", cursor: "pointer" }}>回复</span>
                        </div>
                      </div>
                    );
                  })}
                  {replying && (
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "#5aa77b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>正在回复 @{replying.username}</span>
                      <span onClick={() => setReplyTargetMap((prev) => ({ ...prev, [postId]: null }))} style={{ cursor: "pointer", color: "#8ea39a" }}>取消</span>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <input
                      value={commentDraftMap[postId] || ""}
                      onChange={(event) => setCommentDraftMap((prev) => ({ ...prev, [postId]: event.target.value }))}
                      placeholder={replying ? `回复 @${replying.username}` : "写下评论..."}
                      style={{ flex: 1, border: "1px solid #d8e5de", borderRadius: "10px", padding: "8px 10px", outline: "none" }}
                    />
                    <button onClick={() => handleSubmitComment(postId)} disabled={submittingCommentPostIds.includes(postId)} style={{ ...btnMainStyle, marginTop: 0, width: "78px", borderRadius: "10px", padding: "8px 10px" }}>
                      {submittingCommentPostIds.includes(postId) ? "发送中" : "发送"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ForumModal;
