import { useEffect, useState } from "react";
import { btnMainStyle, modalContentStyle, modalOverlayStyle } from "../styles/appStyles";
import { parseForumImageUrls } from "../logic/forumImageUtils";

const MAX_FORUM_IMAGES = 9;
const FORUM_POST_INPUT_ID = "forum-post-images-input";

function getAvatarSrc(userPhone, avatarUrl) {
  const normalized = String(avatarUrl || "").trim();
  if (normalized) return normalized.replace("http://", "https://");
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${userPhone || "forum-user"}`;
}

function ForumModal({ visible, currentUser, authApiBase, onClose, formatCommentTime }) {
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

  useEffect(() => {
    if (!visible || !currentUser?.phone) return;
    loadPosts("");
  }, [visible, currentUser?.phone]);

  const isLoadingComments = (postId) => loadingCommentPostIds.includes(postId);
  const isSubmittingComment = (postId) => submittingCommentPostIds.includes(postId);
  const isExpanded = (postId) => expandedPostIds.includes(postId);

  const loadPosts = async (keyword) => {
    setLoadingPosts(true);
    try {
      const query = encodeURIComponent(String(keyword || "").trim());
      const res = await fetch(`${authApiBase}/api/forum/posts?phone=${currentUser.phone}&search=${query}`);
      const data = await res.json();
      if (!data.ok) {
        alert(data.message || "论坛内容获取失败");
        return;
      }
      setPosts(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error("论坛帖子加载失败:", error);
      alert("网络错误，论坛内容加载失败");
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadComments = async (postId) => {
    setLoadingCommentPostIds((prev) => [...prev, postId]);
    try {
      const res = await fetch(`${authApiBase}/api/forum/comments/${postId}?phone=${currentUser.phone}`);
      const data = await res.json();
      if (!data.ok) {
        alert(data.message || "论坛评论加载失败");
        return;
      }
      setCommentsMap((prev) => ({ ...prev, [postId]: Array.isArray(data.data) ? data.data : [] }));
    } catch (error) {
      console.error("论坛评论加载失败:", error);
      alert("网络错误，评论加载失败");
    } finally {
      setLoadingCommentPostIds((prev) => prev.filter((id) => id !== postId));
    }
  };

  const handleToggleComments = async (postId) => {
    if (isExpanded(postId)) {
      setExpandedPostIds((prev) => prev.filter((id) => id !== postId));
      return;
    }
    setExpandedPostIds((prev) => [...prev, postId]);
    if (!commentsMap[postId]) await loadComments(postId);
  };

  const handleSearch = async () => {
    await loadPosts(searchKeyword);
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
    const text = postContent.trim();
    if (!text && postImages.length === 0) return alert("发布内容不能为空");
    setSubmittingPost(true);
    try {
      const formData = new FormData();
      formData.append("phone", currentUser.phone);
      formData.append("content", text);
      postImages.forEach((file) => formData.append("images", file));
      const res = await fetch(`${authApiBase}/api/forum/post/add`, { method: "POST", body: formData });
      const data = await res.json();
      if (!data.ok) {
        alert(data.message || "发帖失败");
        return;
      }
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
        body: JSON.stringify({
          phone: currentUser.phone,
          postId,
          content,
          parentId: replyTarget ? replyTarget.id : null,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.message || "评论发布失败");
        return;
      }
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

  if (!visible) return null;

  return (
    <div style={{ ...modalOverlayStyle, zIndex: 4200 }}>
      <div style={{ ...modalContentStyle, maxWidth: "720px", maxHeight: "88vh", overflowY: "auto", borderRadius: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ margin: 0, color: "#2e6a4a" }}>24小时论坛</h3>
          <span style={{ cursor: "pointer", fontSize: "24px", color: "#888" }} onClick={onClose}>
            ×
          </span>
        </div>

        <div style={{ background: "#f4fbf6", borderRadius: "20px", padding: "12px", border: "1px solid #e7f1eb", marginBottom: "12px" }}>
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
                  <div
                    onClick={() => setPostImages((prev) => prev.filter((_, i) => i !== index))}
                    style={{ position: "absolute", top: "-5px", right: "-5px", width: "18px", height: "18px", borderRadius: "50%", background: "#ff4d4f", color: "#fff", textAlign: "center", lineHeight: "18px", cursor: "pointer" }}
                  >
                    ×
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
            <button onClick={() => document.getElementById(FORUM_POST_INPUT_ID)?.click()} style={{ ...btnMainStyle, marginTop: 0, width: "auto", padding: "8px 14px", borderRadius: "999px" }}>
              添加图片
            </button>
            <span style={{ fontSize: "12px", color: "#6e867a" }}>已选 {postImages.length}/{MAX_FORUM_IMAGES}</span>
            <input id={FORUM_POST_INPUT_ID} type="file" hidden accept="image/*" multiple onChange={handleSelectPostImages} />
            <button onClick={handleSubmitPost} disabled={submittingPost} style={{ ...btnMainStyle, marginTop: 0, marginLeft: "auto", width: "auto", padding: "8px 16px" }}>
              {submittingPost ? "发布中..." : "发布"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <input
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            placeholder="搜索用户或帖子内容，点击即达"
            style={{ flex: 1, border: "1px solid #dce8e1", borderRadius: "12px", padding: "10px 12px", outline: "none" }}
          />
          <button onClick={handleSearch} style={{ ...btnMainStyle, marginTop: 0, width: "90px" }}>
            搜索
          </button>
        </div>

        {loadingPosts && <div style={{ textAlign: "center", color: "#7a8f85", padding: "12px 0" }}>论坛内容加载中...</div>}
        {!loadingPosts && posts.length === 0 && <div style={{ textAlign: "center", color: "#97a8a0", padding: "16px 0" }}>24小时内暂无相关帖子</div>}

        {!loadingPosts &&
          posts.map((post) => {
            const postId = Number(post.id);
            const postImages = parseForumImageUrls(post.image_url);
            const comments = commentsMap[postId] || [];
            const commentMap = new Map(comments.map((item) => [Number(item.id), item]));
            const replying = replyTargetMap[postId];

            return (
              <div key={post.id} style={{ border: "1px solid #ebf2ee", borderRadius: "20px", padding: "12px", marginBottom: "12px", background: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <img src={getAvatarSrc(post.user_phone, post.avatar_url)} alt="forum-user-avatar" style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover" }} />
                  <div style={{ fontSize: "13px", color: "#456a56", fontWeight: 700 }}>{post.username}</div>
                  <div style={{ fontSize: "11px", color: "#9db0a7", marginLeft: "auto" }}>{formatCommentTime(post.created_at)}</div>
                </div>

                <div style={{ marginTop: "8px", whiteSpace: "pre-wrap", color: "#233a2f", lineHeight: 1.55, fontSize: "14px" }}>{post.content || "（图片帖）"}</div>
                {postImages.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px", maxWidth: "320px" }}>
                    {postImages.map((url, index) => (
                      <img key={`${post.id}-${index}`} src={url} alt="forum-post-img" style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "8px", objectFit: "cover" }} />
                    ))}
                  </div>
                )}

                <div style={{ marginTop: "10px" }}>
                  <span onClick={() => handleToggleComments(postId)} style={{ fontSize: "12px", color: "#5aa77b", cursor: "pointer", fontWeight: 700 }}>
                    {isExpanded(postId) ? "收起评论" : `查看评论（${post.comment_count || 0}）`}
                  </span>
                </div>

                {isExpanded(postId) && (
                  <div style={{ marginTop: "10px", background: "#f9fcfa", borderRadius: "12px", padding: "10px", border: "1px solid #edf4f0" }}>
                    {isLoadingComments(postId) && <div style={{ fontSize: "12px", color: "#8fa39a" }}>评论加载中...</div>}
                    {!isLoadingComments(postId) && comments.length === 0 && <div style={{ fontSize: "12px", color: "#9aac9f" }}>暂无评论，来抢沙发吧</div>}

                    {!isLoadingComments(postId) &&
                      comments.map((comment) => {
                        const parent = comment.parent_id ? commentMap.get(Number(comment.parent_id)) : null;
                        return (
                          <div key={comment.id} style={{ borderBottom: "1px dashed #e5eeea", padding: "8px 0" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "12px", color: "#39664f", fontWeight: 700 }}>{comment.username}</span>
                              {parent && <span style={{ fontSize: "11px", color: "#7f968a" }}>回复 @{parent.username}</span>}
                              <span style={{ marginLeft: "auto", fontSize: "11px", color: "#a3b3ac" }}>{formatCommentTime(comment.created_at)}</span>
                            </div>
                            <div style={{ marginTop: "4px", fontSize: "13px", color: "#2d4439", whiteSpace: "pre-wrap" }}>{comment.content}</div>
                            <div style={{ marginTop: "4px" }}>
                              <span onClick={() => setReplyTargetMap((prev) => ({ ...prev, [postId]: comment }))} style={{ fontSize: "11px", color: "#5aa77b", cursor: "pointer" }}>
                                回复
                              </span>
                            </div>
                          </div>
                        );
                      })}

                    {replying && (
                      <div style={{ marginTop: "8px", fontSize: "12px", color: "#5aa77b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>正在回复 @{replying.username}</span>
                        <span onClick={() => setReplyTargetMap((prev) => ({ ...prev, [postId]: null }))} style={{ cursor: "pointer", color: "#8ea39a" }}>
                          取消
                        </span>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <input
                        value={commentDraftMap[postId] || ""}
                        onChange={(event) => setCommentDraftMap((prev) => ({ ...prev, [postId]: event.target.value }))}
                        placeholder={replying ? `回复 @${replying.username}` : "写下评论..."}
                        style={{ flex: 1, border: "1px solid #d8e5de", borderRadius: "10px", padding: "8px 10px", outline: "none" }}
                      />
                      <button
                        onClick={() => handleSubmitComment(postId)}
                        disabled={isSubmittingComment(postId)}
                        style={{ ...btnMainStyle, marginTop: 0, width: "78px", borderRadius: "10px", padding: "8px 10px" }}
                      >
                        {isSubmittingComment(postId) ? "发送中" : "发送"}
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
