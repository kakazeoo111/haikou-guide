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

const FORUM_DAILY_QUOTES = [
  { lang: "zh", text: "爱不是把彼此困住，而是一起看更远的风景。" },
  { lang: "zh", text: "旅途最珍贵的不是终点，是有人陪你偏离一下路线。" },
  { lang: "zh", text: "自由大概就是，今天的风往哪吹，你就往哪走一小段。" },
  { lang: "zh", text: "有趣的人生，往往始于一次不那么标准的出发。" },
  { lang: "zh", text: "喜欢一座城市，有时只因为傍晚的光刚好落在你身上。" },
  { lang: "zh", text: "爱和旅行很像，都是越靠近真实，越让人上瘾。" },
  { lang: "zh", text: "愿你在陌生的地方，也能捡到一点熟悉的温柔。" },
  { lang: "zh", text: "有些快乐不需要解释，背上包出门就是答案。" },
  { lang: "zh", text: "真正的松弛，是允许自己在路上慢一点，再慢一点。" },
  { lang: "zh", text: "我们热爱远方，也热爱回头时那个更轻盈的自己。" },
  { lang: "en", text: "Freedom is sometimes just a ticket and enough courage for one soft detour." },
  { lang: "en", text: "Love feels lighter when it walks beside you, not ahead of you." },
  { lang: "en", text: "A good trip changes the map outside and the weather inside." },
  { lang: "en", text: "Some cities do not ask you to stay, only to feel more alive." },
  { lang: "en", text: "The most beautiful plans usually begin with a small and brave yes." },
  { lang: "en", text: "Travel teaches the heart how to be curious without being afraid." },
  { lang: "en", text: "Romance is not a place, but the way the world opens when you arrive together." },
  { lang: "en", text: "Take the road that leaves a little room for wonder." },
  { lang: "en", text: "A free soul does not rush. It notices." },
  { lang: "en", text: "Sometimes the best destination is the version of you that comes back softer." },
];

const QUOTE_WRAP_STYLE = {
  ...forumHintBannerStyle,
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  padding: "14px 16px",
};
const QUOTE_TAG_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  width: "fit-content",
  padding: "4px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 700,
  color: "#2e6a4a",
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(209, 232, 219, 0.9)",
};
const QUOTE_TEXT_STYLE = {
  fontSize: "17px",
  lineHeight: 1.55,
  color: "#2f4c3f",
  fontWeight: 700,
  letterSpacing: "0.2px",
};
const QUOTE_TEXT_EN_STYLE = {
  ...QUOTE_TEXT_STYLE,
  fontWeight: 600,
  fontStyle: "italic",
  lineHeight: 1.7,
};

function getDailyQuoteIndex(length) {
  const today = new Date();
  const seed = Number(
    `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`,
  );
  return seed % length;
}

function DailyForumQuote() {
  const quote = FORUM_DAILY_QUOTES[getDailyQuoteIndex(FORUM_DAILY_QUOTES.length)];
  return (
    <div style={QUOTE_WRAP_STYLE}>
      <span style={QUOTE_TAG_STYLE}>今日句子</span>
      <div style={quote.lang === "en" ? QUOTE_TEXT_EN_STYLE : QUOTE_TEXT_STYLE}>{quote.text}</div>
    </div>
  );
}

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
      <DailyForumQuote />

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
          <span>{sortMode === "chill" ? "按最新排序" : "按 chill 排序"}</span>
        </button>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <button onClick={onOpenForumNotices} style={{ ...forumNoticeButtonStyle, position: "relative", paddingRight: "18px" }}>
            <span>互动</span>
            {forumUnreadCount > 0 && <span style={{ ...forumUnreadDotStyle, position: "absolute", top: "7px", right: "8px" }} />}
          </button>
          <button onClick={onOpenNotice} style={forumNoticeButtonStyle}>公告</button>
          <span style={forumOnlinePillStyle}>
            <span style={{ fontSize: "10px" }}>●</span>
            <span>在线 {onlineCount}</span>
          </span>
        </div>
      </div>

      {loadingPosts && <div style={{ textAlign: "center", color: "#7a8f85", padding: "12px 0" }}>论坛内容加载中...</div>}
      {!loadingPosts && posts.length === 0 && <div style={{ textAlign: "center", color: "#97a8a0", padding: "16px 0" }}>7 天内暂无相关帖子</div>}

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
