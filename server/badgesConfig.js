export const DEFAULT_BADGE_TITLE = "未解锁称号";
export const FORUM_POST_TARGET = 7;
export const FORUM_CALL_TARGET = 31; // >30

export const BADGE_PRIORITY = [
  "无私奉献",
  "快乐种草机",
  "论坛居士",
  "人气椰",
  "小夜猫",
  "评论小子",
  "探店能手",
  "佛系椰",
  "椰岛新兵",
];

export const BADGE_CATALOG = [
  { name: "椰岛新兵", icon: "🌴", mood: "刚登陆，先热身", sourceType: "quant", ruleText: "登录三天即可获得" },
  { name: "探店能手", icon: "✨", mood: "发现好店达人", sourceType: "quant", ruleText: "推荐数 >= 3" },
  { name: "评论小子", icon: "💬", mood: "发言有料选手", sourceType: "quant", ruleText: "评论总数 >= 15" },
  { name: "人气椰", icon: "🔥", mood: "全场高光体质", sourceType: "quant", ruleText: "收到点赞总数 >= 50" },
  { name: "快乐种草机", icon: "✨", mood: "一发入魂种草王", sourceType: "quant", ruleText: "收到点赞总数 >= 100" },
  { name: "论坛居士", icon: "🪩", mood: "深夜发光体，句句都有人共鸣", sourceType: "quant", ruleText: "论坛发帖 >= 7 且累计被打call > 30" },
  { name: "佛系椰", icon: "🧘", mood: "静静看世界", sourceType: "quant", ruleText: "近7天只浏览不发布" },
  { name: "小夜猫", icon: "🌙", mood: "深夜营业常驻", sourceType: "quant", ruleText: "22:00-02:00评论+发布 >= 15" },
  { name: "无私奉献", icon: "🤝", mood: "站主特别认可", sourceType: "manual", ruleText: "站主手动授权" },
];

export const QUANT_BADGE_RULES = [
  { name: "椰岛新兵", isEarned: (metrics) => metrics.accountAgeDays >= 3 },
  { name: "探店能手", isEarned: (metrics) => metrics.recommendationCount >= 3 },
  { name: "评论小子", isEarned: (metrics) => metrics.commentCount >= 15 },
  { name: "人气椰", isEarned: (metrics) => metrics.receivedLikesTotal >= 50 },
  { name: "快乐种草机", isEarned: (metrics) => metrics.receivedLikesTotal >= 100 },
  { name: "论坛居士", isEarned: (metrics) => metrics.forumPostCount >= FORUM_POST_TARGET && metrics.forumCallReceivedCount > 30 },
  { name: "佛系椰", isEarned: (metrics) => metrics.accountAgeDays >= 7 && metrics.postCountLast7Days === 0 },
  { name: "小夜猫", isEarned: (metrics) => metrics.nightActiveCount >= 15 },
];

export const BADGE_NAME_SET = new Set(BADGE_CATALOG.map((badge) => badge.name));
