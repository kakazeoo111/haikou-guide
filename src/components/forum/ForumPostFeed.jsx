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
  { lang: "zh", text: "人生在世不称意，明朝散发弄扁舟。", author: "李白" },
  { lang: "zh", text: "旅途最珍贵的不是终点，是有人陪你偏离一下路线。", author: "余秋雨" },
  { lang: "zh", text: "自由大概就是，今天的风往哪吹，你就往哪走一小段。", author: "林清玄" },
  { lang: "zh", text: "有趣的人生，往往始于一次不那么标准的出发。", author: "韩寒" },
  { lang: "zh", text: "喜欢一座城市，有时只因为傍晚的光刚好落在你身上。", author: "席慕蓉" },
  { lang: "zh", text: "回首向来萧瑟处，归去，也无风雨也无晴。", author: "苏轼" },
  { lang: "zh", text: "愿你在陌生的地方，也能捡到一点熟悉的温柔。", author: "毕淑敏" },
  { lang: "zh", text: "一箫一剑平生意，负尽狂名十五年。", author: "龚自珍" },
  { lang: "zh", text: "山一程，水一程，身向榆关那畔行，夜深千帐灯。", author: "纳兰性德" },
  { lang: "zh", text: "我们热爱远方，也热爱回头时那个更轻盈的自己。", author: "余华" },
  { lang: "en", text: "There is a pleasure in the pathless woods,I love not Man the less, but Nature more.", author: "Lord Byron" },
  { lang: "en", text: "I took the one less traveled by,And that has made all the difference.", author: "Robert Frost" },
  { lang: "en", text: "A good trip changes the map outside and the weather inside.", author: "Pico Iyer" },
  { lang: "en", text: "Some cities do not ask you to stay, only to feel more alive.", author: "James Baldwin" },
  { lang: "en", text: "The most beautiful plans usually begin with a small and brave yes.", author: "Mary Oliver" },
  { lang: "en", text: "Travel teaches the heart how to be curious without being afraid.", author: "Alain de Botton" },
  { lang: "en", text: "Romance is not a place, but the way the world opens when you arrive together.", author: "F. Scott Fitzgerald" },
  { lang: "en", text: "there isn't a train I wouldn't take,No matter where it's going.", author: "Edna St. Vincent Millay" },
  { lang: "en", text: "A free soul does not rush. It notices.", author: "Henry David Thoreau" },
  { lang: "en", text: "Afoot and light-hearted I take to the open road,I myself am good-fortune.", author: "Walt Whitman" },
];

const QUOTE_WRAP_STYLE = {
  ...forumHintBannerStyle,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "14px 16px",
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
const QUOTE_AUTHOR_STYLE = {
  alignSelf: "flex-end",
  marginTop: "10px",
  fontSize: "12px",
  color: "#6f877a",
  fontWeight: 600,
  letterSpacing: "0.2px",
  textAlign: "right",
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
      <div style={quote.lang === "en" ? QUOTE_TEXT_EN_STYLE : QUOTE_TEXT_STYLE}>{quote.text}</div>
      <div style={QUOTE_AUTHOR_STYLE}>{quote.lang === "en" ? `— ${quote.author}` : `—— ${quote.author}`}</div>
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
  activeCommentPostId,
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

      {!loadingPosts && posts.map((post) => {
        const postId = Number(post.id);
        const commentsOpen = Number(activeCommentPostId) === Number(postId);
        return (
          <div key={post.id} id={getForumPostDomId(post.id)} style={{ marginBottom: "12px" }}>
            <ForumPostCard
              post={post}
              currentUser={currentUser}
              activeBadgeTitle={activeBadgeTitle}
              badgeIcon={badgeIcon}
              badgeTheme={badgeTheme}
              callingPost={callingPostIds.includes(postId)}
              commentsOpen={commentsOpen}
              onOpenComments={onOpenComments}
              onToggleCall={onToggleCall}
              onZoomImage={onZoomImage}
              formatCommentTime={formatCommentTime}
            />
          </div>
        );
      })}
    </div>
  );
}

export default ForumPostFeed;
