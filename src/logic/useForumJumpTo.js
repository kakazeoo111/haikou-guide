import { useEffect, useState } from "react";

const FORUM_JUMP_EVENT = "forum:jumpTo";
const FORUM_POST_DOM_ID_PREFIX = "forum-post-";
const FORUM_JUMP_SCROLL_RETRY_DELAY_MS = 120;
const FORUM_JUMP_SCROLL_MAX_RETRIES = 12;

function parsePositiveInt(value) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) return null;
  return normalized;
}

function scrollToForumPost(postId, attempt = 0) {
  const element = document.getElementById(getForumPostDomId(postId));
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (attempt >= FORUM_JUMP_SCROLL_MAX_RETRIES) return;
  setTimeout(() => scrollToForumPost(postId, attempt + 1), FORUM_JUMP_SCROLL_RETRY_DELAY_MS);
}

export function getForumPostDomId(postId) {
  const normalized = parsePositiveInt(postId);
  return normalized ? `${FORUM_POST_DOM_ID_PREFIX}${normalized}` : `${FORUM_POST_DOM_ID_PREFIX}unknown`;
}

export function useForumJumpTo({ posts, loadComments, loadingPosts, onOpenComments }) {
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
    Promise.resolve(loadComments?.(jumpPostId)).catch((error) => console.error("论坛跳转加载评论失败:", error));
    onOpenComments?.(jumpPostId);
    scrollToForumPost(jumpPostId);
    queueMicrotask(() => setJumpPostId(null));
  }, [jumpPostId, loadingPosts, posts, loadComments, onOpenComments]);
}
