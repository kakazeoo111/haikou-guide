import { useState } from "react";
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
  { lang: "zh", text: "人生在世不称意，明朝散发弄扁舟。", author: "李白", translation: "When life does not go as one wishes, tomorrow I will loosen my hair and drift away in a small boat." },
  { lang: "zh", text: "旅途最珍贵的不是终点，是有人陪你偏离一下路线。", author: "余秋雨", translation: "The most precious part of a journey is not the destination, but having someone beside you when you wander off route." },
  { lang: "zh", text: "自由大概就是，今天的风往哪吹，你就往哪走一小段。", author: "林清玄", translation: "Freedom may be simply walking a little way in the direction today's wind is blowing." },
  { lang: "zh", text: "有趣的人生，往往始于一次不那么标准的出发。", author: "韩寒", translation: "An interesting life often begins with a departure that is not quite by the book." },
  { lang: "zh", text: "喜欢一座城市，有时只因为傍晚的光刚好落在你身上。", author: "席慕蓉", translation: "Sometimes you fall for a city simply because the evening light happens to fall on you." },
  { lang: "zh", text: "回首向来萧瑟处，归去，也无风雨也无晴。", author: "苏轼", translation: "Looking back at the storm I came through, I return with neither rain nor shine in my heart." },
  { lang: "zh", text: "愿你在陌生的地方，也能捡到一点熟悉的温柔。", author: "毕淑敏", translation: "May you find a familiar tenderness even in unfamiliar places." },
  { lang: "zh", text: "一箫一剑平生意，负尽狂名十五年。", author: "龚自珍", translation: "With a flute and a sword I carried my lifelong will, bearing fifteen years of wild reputation." },
  { lang: "zh", text: "山一程，水一程，身向榆关那畔行，夜深千帐灯。", author: "纳兰性德", translation: "Past mountains and waters we travel toward the frontier; deep in the night, a thousand tents glow with lamps." },
  { lang: "zh", text: "我们热爱远方，也热爱回头时那个更轻盈的自己。", author: "余华", translation: "We love distant places, and we also love the lighter self we find when we look back." },
  { lang: "en", text: "There is a pleasure in the pathless woods,I love not Man the less, but Nature more.", author: "Lord Byron", translation: "无径之林中自有一种乐趣；我并非少爱人类，只是更爱自然。" },
  { lang: "en", text: "I took the one less traveled by,And that has made all the difference.", author: "Robert Frost", translation: "我选择了人迹更少的那条路，而这一切从此不同。" },
  { lang: "en", text: "A good trip changes the map outside and the weather inside.", author: "Pico Iyer", translation: "一场好的旅行，会改变外面的地图，也改变内心的天气。" },
  { lang: "en", text: "Some cities do not ask you to stay, only to feel more alive.", author: "James Baldwin", translation: "有些城市并不要求你留下，只让你感到自己更鲜活。" },
  { lang: "en", text: "The most beautiful plans usually begin with a small and brave yes.", author: "Mary Oliver", translation: "最美的计划，往往始于一个小小却勇敢的“好”。" },
  { lang: "en", text: "Travel teaches the heart how to be curious without being afraid.", author: "Alain de Botton", translation: "旅行教会内心保持好奇，而不必害怕。" },
  { lang: "en", text: "Romance is not a place, but the way the world opens when you arrive together.", author: "F. Scott Fitzgerald", translation: "浪漫不是某个地方，而是你们一同抵达时，世界为你们展开的样子。" },
  { lang: "en", text: "there isn't a train I wouldn't take,No matter where it's going.", author: "Edna St. Vincent Millay", translation: "没有哪一班火车是我不愿搭乘的，无论它要开往哪里。" },
  { lang: "en", text: "A free soul does not rush. It notices.", author: "Henry David Thoreau", translation: "自由的灵魂不匆忙，它会认真看见。" },
  { lang: "en", text: "Afoot and light-hearted I take to the open road,I myself am good-fortune.", author: "Walt Whitman", translation: "我步履轻快、心情明朗地走向开阔的路；我自己就是好运。" },
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
const QUOTE_TOP_ROW_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
};
const QUOTE_BADGE_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "3px 9px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.74)",
  border: "1px solid rgba(121, 170, 142, 0.22)",
  color: "#5d806d",
  fontSize: "11px",
  fontWeight: 800,
};
const QUOTE_TRANSLATE_BUTTON_STYLE = {
  border: "1px solid rgba(90, 167, 123, 0.26)",
  borderRadius: "999px",
  background: "#ffffff",
  color: "#4f946d",
  fontSize: "12px",
  fontWeight: 800,
  padding: "5px 10px",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(63, 120, 86, 0.08)",
};
const QUOTE_TRANSLATION_NOTE_STYLE = {
  marginTop: "-4px",
  fontSize: "11px",
  color: "#8aa296",
  fontWeight: 700,
};

function getDailyQuoteIndex(length) {
  const today = new Date();
  const seed = Number(
    `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`,
  );
  return seed % length;
}

function DailyForumQuote() {
  const [showTranslation, setShowTranslation] = useState(false);
  const quote = FORUM_DAILY_QUOTES[getDailyQuoteIndex(FORUM_DAILY_QUOTES.length)];
  const displayText = showTranslation ? quote.translation : quote.text;
  const displayLang = showTranslation ? (quote.lang === "en" ? "zh" : "en") : quote.lang;
  const translateLabel = showTranslation ? "原文" : quote.lang === "en" ? "译中文" : "译英文";
  return (
    <div style={QUOTE_WRAP_STYLE}>
      <div style={QUOTE_TOP_ROW_STYLE}>
        <span style={QUOTE_BADGE_STYLE}>{quote.lang === "en" ? "English Quote" : "今日诗句"}</span>
        <button type="button" onClick={() => setShowTranslation((value) => !value)} style={QUOTE_TRANSLATE_BUTTON_STYLE}>
          {translateLabel}
        </button>
      </div>
      <div style={displayLang === "en" ? QUOTE_TEXT_EN_STYLE : QUOTE_TEXT_STYLE}>{displayText}</div>
      {showTranslation && <div style={QUOTE_TRANSLATION_NOTE_STYLE}>机器辅助润色，仅供参考</div>}
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
