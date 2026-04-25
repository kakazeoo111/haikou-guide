import { useEffect, useState } from "react";
import { getBadgeEmoji, getBadgeTheme } from "../logic/badgeTheme";
import { useForumData } from "../logic/useForumData";
import { useOnlineCount } from "../logic/useOnlineCount";
import { useForumNotice } from "../logic/useForumNotice";
import { useForumJumpTo } from "../logic/useForumJumpTo";
import { forumHeaderStyle, forumPageStyle } from "../logic/forumModalUtils";
import NoticeListModal from "./NoticeListModal";
import ForumNoticeModal from "./forum/ForumNoticeModal";
import ForumCommentsOverlay from "./forum/ForumCommentsOverlay";
import ForumPostFeed from "./forum/ForumPostFeed";

const FORUM_POST_INPUT_ID = "forum-post-images-input";
const FORUM_UNREAD_DOT_STYLE = {
  width: "7px",
  height: "7px",
  borderRadius: "50%",
  background: "#ff4d4f",
  boxShadow: "0 0 0 2px #ffe4ec",
};

function getPostIdFromNotice(notice) {
  const placeId = String(notice?.place_id || "");
  const matched = placeId.match(/^forum_(\d+)$/);
  const postId = matched ? Number(matched[1]) : null;
  if (!Number.isInteger(postId) || postId <= 0) return null;
  return postId;
}

function ForumModal({
  currentUser,
  authApiBase,
  activeBadgeTitle,
  activeBadgeMeta,
  notifications,
  forumUnreadCount = 0,
  onRefreshNotices,
  onNoticeClick,
  onBack,
  onZoomImage,
  formatCommentTime,
}) {
  const [showForumNotices, setShowForumNotices] = useState(false);
  const badgeSeed = `${currentUser?.phone || ""}-${activeBadgeTitle || ""}`;
  const badgeTheme = getBadgeTheme(badgeSeed);
  const badgeIcon = getBadgeEmoji(badgeSeed, activeBadgeMeta?.icon || "");
  const onlineCount = useOnlineCount({ enabled: Boolean(currentUser?.phone), authApiBase, phone: currentUser?.phone });
  const { showNotice, openNotice, closeNotice, dontShowAgain, updateDontShowAgain } = useForumNotice(currentUser?.phone);
  const forum = useForumData({ currentUser, authApiBase, notifications });

  useForumJumpTo({ posts: forum.posts, loadComments: forum.loadComments, loadingPosts: forum.loadingPosts, onOpenComments: forum.openComments });

  useEffect(() => {
    forum.loadPosts("", forum.sortMode);
  }, [currentUser?.phone]);

  useEffect(() => {
    if (forum.searchKeyword.trim()) return;
    forum.loadPosts("", forum.sortMode);
  }, [forum.searchKeyword]);

  useEffect(() => {
    if (!currentUser?.phone) return;
    onRefreshNotices?.(false);
  }, [currentUser?.phone]);

  const handleToggleSortMode = () => {
    const nextSortMode = forum.sortMode === "latest" ? "chill" : "latest";
    forum.setSortMode(nextSortMode);
    forum.loadPosts(forum.searchKeyword, nextSortMode);
  };

  const handleOpenForumNotices = async () => {
    await onRefreshNotices?.(false);
    setShowForumNotices(true);
  };

  const handleForumNoticeClick = async (notice) => {
    const postId = getPostIdFromNotice(notice);
    setShowForumNotices(false);
    if (!postId) return;
    if (forum.searchKeyword.trim()) forum.setSearchKeyword("");
    await forum.loadPosts("", forum.sortMode);
    window.dispatchEvent(new CustomEvent("forum:jumpTo", { detail: { postId } }));
    onNoticeClick?.(notice);
  };

  const handleReplySelect = (comment) => {
    if (!forum.activeCommentPostId) return;
    forum.setReplyTargetMap((prev) => ({ ...prev, [forum.activeCommentPostId]: comment }));
    setTimeout(() => document.getElementById("forum-comment-input-overlay")?.focus(), 0);
  };

  const handleToggleExpand = (parentId) => {
    const postId = forum.activeCommentPostId;
    if (!postId) return;
    forum.setExpandedCommentParentIdsMap((prev) => {
      const currentIds = prev[postId] || [];
      const nextIds = currentIds.includes(parentId) ? currentIds.filter((id) => id !== parentId) : [...currentIds, parentId];
      return { ...prev, [postId]: nextIds };
    });
  };

  const handleToggleShowOnlyImages = () => {
    const postId = forum.activeCommentPostId;
    if (!postId) return;
    forum.setShowOnlyImageCommentMap((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const activePost = forum.posts.find((item) => Number(item.id) === Number(forum.activeCommentPostId)) || null;
  const activePostComments = forum.activeCommentPostId ? (forum.commentsMap[forum.activeCommentPostId] || []) : [];
  const effectiveForumUnreadCount = Math.max(Number(forumUnreadCount || 0), Number(forum.forumUnreadCount || 0));

  return (
    <div style={forumPageStyle}>
      <div style={forumHeaderStyle}>
        <span onClick={onBack} style={{ cursor: "pointer", fontSize: "18px", color: "#5a6e65" }}>&lt; 返回</span>
        <span style={{ fontWeight: 700, color: "#2e6a4a", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <span>🗐</span>
          <span>7天论坛</span>
        </span>
        <span style={{ width: "58px" }} />
      </div>

      <ForumPostFeed
        posts={forum.posts}
        loadingPosts={forum.loadingPosts}
        postContent={forum.postContent}
        postImages={forum.postImages}
        searchKeyword={forum.searchKeyword}
        sortMode={forum.sortMode}
        forumUnreadCount={effectiveForumUnreadCount}
        onlineCount={onlineCount}
        callingPostIds={forum.callingPostIds}
        currentUser={currentUser}
        activeBadgeTitle={activeBadgeTitle}
        badgeIcon={badgeIcon}
        badgeTheme={badgeTheme}
        onPostContentChange={forum.setPostContent}
        onRemovePostImage={(index) => forum.setPostImages((prev) => prev.filter((_, i) => i !== index))}
        onSelectPostImages={forum.handleSelectPostImages}
        onSubmitPost={forum.handleSubmitPost}
        submittingPost={forum.submittingPost}
        postInputId={FORUM_POST_INPUT_ID}
        onSearchKeywordChange={forum.setSearchKeyword}
        onSearch={() => forum.loadPosts(forum.searchKeyword, forum.sortMode)}
        onToggleSortMode={handleToggleSortMode}
        onOpenForumNotices={handleOpenForumNotices}
        onOpenNotice={openNotice}
        onOpenComments={forum.openComments}
        onToggleCall={forum.handleToggleCall}
        onZoomImage={onZoomImage}
        formatCommentTime={formatCommentTime}
        forumUnreadDotStyle={FORUM_UNREAD_DOT_STYLE}
      />

      <ForumCommentsOverlay
        visible={Boolean(activePost)}
        post={activePost}
        comments={activePostComments}
        loading={forum.loadingCommentPostIds.includes(Number(forum.activeCommentPostId))}
        sortMode={forum.commentSortMode}
        showOnlyImages={Boolean(forum.showOnlyImageCommentMap[forum.activeCommentPostId])}
        expandedParentIds={forum.expandedCommentParentIdsMap[forum.activeCommentPostId] || []}
        currentUser={currentUser}
        activeBadgeTitle={activeBadgeTitle}
        activeBadgeMeta={activeBadgeMeta}
        replyTarget={forum.replyTargetMap[forum.activeCommentPostId] || null}
        commentDraft={forum.commentDraftMap[forum.activeCommentPostId] || ""}
        commentImages={forum.commentImagesMap[forum.activeCommentPostId] || []}
        submitting={forum.submittingCommentPostIds.includes(Number(forum.activeCommentPostId))}
        onClose={() => forum.setActiveCommentPostId(null)}
        onSortChange={forum.setCommentSortMode}
        onToggleShowOnlyImages={handleToggleShowOnlyImages}
        onToggleExpand={handleToggleExpand}
        onReplySelect={handleReplySelect}
        onReplyCancel={() => forum.setReplyTargetMap((prev) => ({ ...prev, [forum.activeCommentPostId]: null }))}
        onCommentDraftChange={(value) => forum.setCommentDraftMap((prev) => ({ ...prev, [forum.activeCommentPostId]: value }))}
        onSelectCommentImages={(event) => forum.handleSelectCommentImages(forum.activeCommentPostId, event)}
        onRemoveCommentImage={(index) => forum.handleRemoveCommentImage(forum.activeCommentPostId, index)}
        onSubmitComment={() => forum.handleSubmitComment(forum.activeCommentPostId)}
        onLikeComment={(commentId) => forum.handleLikeComment(forum.activeCommentPostId, commentId)}
        onZoomImage={onZoomImage}
        formatCommentTime={formatCommentTime}
      />

      <ForumNoticeModal visible={showNotice} dontShowAgain={dontShowAgain} onToggleDontShowAgain={updateDontShowAgain} onClose={closeNotice} />
      <NoticeListModal
        visible={showForumNotices}
        notifications={forum.forumNotifications}
        currentUser={currentUser}
        authApiBase={authApiBase}
        onClose={() => setShowForumNotices(false)}
        onNoticeClick={handleForumNoticeClick}
        onRefresh={() => onRefreshNotices?.(false)}
        formatCommentTime={formatCommentTime}
        modalTitle="论坛互动"
        emptyText="暂无互动"
        markReadPath="/api/notifications/read-forum"
        clearPath="/api/notifications/clear-forum"
        clearButtonText="全部删除"
        clearConfirmText="确定要删除全部互动消息吗？"
        clearSuccessText="互动消息已删除"
        showClearButton
      />
    </div>
  );
}

export default ForumModal;
