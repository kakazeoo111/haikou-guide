import { useEffect, useState } from "react";

const FORUM_JUMP_EVENT = "forum:jumpTo";
const FORUM_POST_DOM_ID_PREFIX = "forum-post-";

function parsePositiveInt(value) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) return null;
  return normalized;
}

export function getForumPostDomId(postId) {
  const normalized = parsePositiveInt(postId);
  return normalized ? `${FORUM_POST_DOM_ID_PREFIX}${normalized}` : `${FORUM_POST_DOM_ID_PREFIX}unknown`;
}

export function useForumJumpTo({ posts, expandedPostIds, setExpandedPostIds, loadComments, commentsMap, loadingPosts }) {
  const [jumpPostId, setJumpPostId] = useState(null);

  useEffect(() => {
    const handleJumpTo = (event) => {
      const nextPostId = parsePositiveInt(event?.detail?.postId);
      if (!nextPostId) return;
      setJumpPostId(nextPostId);
    };
    window.addEventListener(FORUM_JUMP_EVENT, handleJumpTo);
    return () => window.removeEventListener(FORUM_JUMP_EVENT, handleJumpTo);
  }, []);

  useEffect(() => {
    if (!jumpPostId || loadingPosts) return;
    const exists = (posts || []).some((post) => Number(post.id) === Number(jumpPostId));
    if (!exists) return;
    if (!expandedPostIds.includes(jumpPostId)) {
      setExpandedPostIds((prev) => [...prev, jumpPostId]);
    }
    if (!commentsMap?.[jumpPostId]) {
      Promise.resolve(loadComments?.(jumpPostId)).catch((error) => console.error("论坛跳转加载评论失败:", error));
    }
    setTimeout(() => {
      document.getElementById(getForumPostDomId(jumpPostId))?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    setJumpPostId(null);
  }, [jumpPostId, loadingPosts, posts, expandedPostIds, setExpandedPostIds, loadComments, commentsMap]);
}
