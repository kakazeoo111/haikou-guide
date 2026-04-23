import ForumPostCard from "./ForumPostCard";
import ForumPostComposer from "./ForumPostComposer";
import { getForumPostDomId } from "../../logic/useForumJumpTo";
import {
  forumHintBannerStyle,
  forumNoticeButtonStyle,
  forumOnlinePillStyle,
  forumSearchButtonStyle,
  forumSearchInputStyle,
  forumSearchRowStyle,
  forumSortButtonStyle,
} from "../../logic/forumModalUtils";

function ForumPostFeed({
  posts,
  loadingPosts,
  postContent,
  postImages,
  searchKeyword,
  sortMode,
  forumUnreadCount,
  onlineCount,
  callingPostIds,
  currentUser,
  activeBadgeTitle,
  badgeIcon,
  badgeTheme,
  onPostContentChange,
  onRemovePostImage,
  onSelectPostImages,
  onSubmitPost,
  submittingPost,
  postInputId,
  onSearchKeywordChange,
  onSearch,
  onToggleSortMode,
  onOpenForumNotices,
  onOpenNotice,
  onOpenComments,
  onToggleCall,
  onZoomImage,
  formatCommentTime,
  forumUnreadDotStyle,
}) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 24px 14px" }}>
      <div style={forumHintBannerStyle}>💬 记录你7天内的心情 · 7天后自动消散</div>

      <ForumPostComposer
        postContent={postContent}
        onContentChange={onPostContentChange}
        postImages={postImages}
        onRemoveImage={onRemovePostImage}
        onSelectImages={onSelectPostImages}
        onSubmitPost={onSubmitPost}
        submitting={submittingPost}
        inputId={postInputId}
      />

      <div style={forumSearchRowStyle}>
        <input
          value={searchKeyword}
          onChange={(event) => onSearchKeywordChange(event.target.value)}
          placeholder="搜索用户或帖子内容"
          style={forumSearchInputStyle}
        />
        <button onClick={onSearch} style={forumSearchButtonStyle}>搜索</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <button onClick={onToggleSortMode} style={forumSortButtonStyle}>
          <span>⚡</span>
          <span>{sortMode === "chill" ? "按最新排序" : "按chill排序"}</span>
        </button>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <button onClick={onOpenForumNotices} style={forumNoticeButtonStyle}>
            <span>互动</span>
            {forumUnreadCount > 0 && <span style={forumUnreadDotStyle} />}
          </button>
          <button onClick={onOpenNotice} style={forumNoticeButtonStyle}>公告</button>
          <span style={forumOnlinePillStyle}>
            <span style={{ fontSize: "10px" }}>●</span>
            <span>在线 {onlineCount}</span>
          </span>
        </div>
      </div>

      {loadingPosts && <div style={{ textAlign: "center", color: "#7a8f85", padding: "12px 0" }}>论坛内容加载中...</div>}
      {!loadingPosts && posts.length === 0 && <div style={{ textAlign: "center", color: "#97a8a0", padding: "16px 0" }}>7天内暂无相关帖子</div>}

      {!loadingPosts && posts.map((post) => (
        <div key={post.id} id={getForumPostDomId(post.id)}>
          <ForumPostCard
            post={post}
            currentUser={currentUser}
            activeBadgeTitle={activeBadgeTitle}
            badgeIcon={badgeIcon}
            badgeTheme={badgeTheme}
            callingPost={callingPostIds.includes(Number(post.id))}
            onOpenComments={onOpenComments}
            onToggleCall={onToggleCall}
            onZoomImage={onZoomImage}
            formatCommentTime={formatCommentTime}
          />
        </div>
      ))}
    </div>
  );
}

export default ForumPostFeed;
