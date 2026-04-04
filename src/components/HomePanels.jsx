import BaiduMap from "../BaiduMap";
import {
  avatarStyle,
  btnCodeStyle,
  btnDetailStyle,
  btnNavStyle,
  btnSmallStyle,
  categoryTagStyle,
  floatBtnStyle,
  inputStyle,
  listThumbStyle,
  photoTagStyle,
  placeLikeBtnStyle,
  rankBadgeStyle,
} from "../styles/appStyles";
import { getBadgeEmoji, getBadgeTheme } from "../logic/badgeTheme";

const FILTER_ITEMS = [
  { key: "all", label: "鍏ㄩ儴" },
  { key: "recommend", label: "鉁?鎺ㄨ崘" },
  { key: "top10", label: "馃弳 姒滃崟" },
  { key: "favorite", label: "猸?鏀惰棌" },
  { key: "food", label: "馃嵄 缇庨" },
  { key: "view", label: "馃彏锔?鏅偣" },
  { key: "street", label: "馃泹锔?鍟嗗湀" },
  { key: "cafe", label: "鈽?鍜栧暋" },
];

const UNREAD_BADGE_LIMIT = 99;
const FAVORITE_ICON_SIZE = "32px";
const FAVORITE_ICON_FONT_SIZE = "18px";
const FAVORITE_ICON_ACTIVE_COLOR = "#ffffff";
const FAVORITE_ICON_ACTIVE_BACKGROUND = "linear-gradient(135deg, #ff86b6, #ffb347)";
const FAVORITE_ICON_ACTIVE_SHADOW = "0 6px 14px rgba(255, 150, 105, 0.28)";
const FAVORITE_ICON_INACTIVE_COLOR = "#ffae42";
const FAVORITE_ICON_INACTIVE_BACKGROUND = "#fff7ea";
const FAVORITE_ICON_INACTIVE_BORDER = "1px solid #ffe2b8";
const FAVORITE_ICON_INACTIVE_SHADOW = "0 2px 8px rgba(255, 174, 66, 0.2)";
const unreadBadgeStyle = {
  minWidth: "16px",
  height: "16px",
  padding: "0 4px",
  borderRadius: "999px",
  background: "#ff4d6d",
  color: "white",
  fontSize: "10px",
  fontWeight: "bold",
  lineHeight: "16px",
  textAlign: "center",
  boxSizing: "border-box",
  boxShadow: "0 2px 6px rgba(255,77,109,0.35)",
};

const userBadgeBaseStyle = {
  marginTop: "6px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "4px 10px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #e8fff1, #edf7ff)",
  border: "1px solid #d6eee2",
  boxShadow: "0 8px 16px rgba(90,167,123,0.16)",
  width: "fit-content",
};

function formatPlaceTypeTag(type) {
  if (type === "food") return "馃嵄 缇庨";
  if (type === "view") return "馃彏锔?鏅偣";
  if (type === "cafe") return "鈽?鍜栧暋";
  if (type === "recommend") return "鉁?鎺ㄨ崘";
  return "馃泹锔?鍟嗗湀";
}

function HomePanels({
  isMobile,
  userLocation,
  targetPlaces,
  currentUser,
  adminPhone,
  activeBadgeTitle,
  activeBadgeMeta,
  unreadCount,
  search,
  filter,
  favoriteIds,
  filteredPlaces,
  onRefreshLocation,
  onAvatarUpload,
  onOpenProfile,
  onLogout,
  onShowFeedback,
  onShowAnnouncement,
  onManageBadge,
  onFetchAllFeedbacks,
  onSearchChange,
  onShowRecommendModal,
  onFilterChange,
  onDeleteRec,
  onToggleFavorite,
  onOpenDetail,
  onToggleTarget,
  onLikePlace,
  onLikeRec,
  onOpenComments,
  onNavigate,
  formatCommentTime,
}) {
  const unreadBadgeText = unreadCount > UNREAD_BADGE_LIMIT ? `${UNREAD_BADGE_LIMIT}+` : unreadCount;
  const badgeSeed = `${currentUser?.phone || ""}-${activeBadgeTitle || ""}`;
  const badgeTheme = getBadgeTheme(badgeSeed);
  const badgeIcon = getBadgeEmoji(badgeSeed, activeBadgeMeta?.icon || "");
  const userBadgeStyle = {
    ...userBadgeBaseStyle,
    background: badgeTheme.background,
    border: `1px solid ${badgeTheme.border}`,
    boxShadow: badgeTheme.shadow,
  };

  return (
    <>
      <div style={{ width: isMobile ? "100%" : "auto", height: isMobile ? "30vh" : "100%", flex: isMobile ? "none" : 1, position: "relative", zIndex: 10 }}>
        <BaiduMap targetPlaces={targetPlaces} userLocation={userLocation} isMobile={isMobile} />
        <button onClick={onRefreshLocation} style={floatBtnStyle}>
          馃幆
        </button>
      </div>

      <div style={{ width: isMobile ? "100%" : "380px", height: isMobile ? "70vh" : "100vh", overflowY: "auto", background: "white", zIndex: 15, padding: 0, boxSizing: "border-box" }}>
        <div style={{ padding: "20px 20px 0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <img
              src={currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.phone}`}
              style={avatarStyle}
              onClick={() => document.getElementById("avatar-input").click()}
              alt="avatar"
            />
            <input type="file" id="avatar-input" hidden accept="image/*" onChange={onAvatarUpload} />
            <div style={{ flex: 1 }}>
              <h3 onClick={onOpenProfile} style={{ margin: 0, fontSize: "16px", color: "#333", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", width: "fit-content" }}>
                <span>{currentUser.username}</span>
                {unreadCount > 0 && <span style={unreadBadgeStyle}>{unreadBadgeText}</span>}
                <span style={{ fontSize: "12px", color: "#ccc" }}>▼</span>
              </h3>
              <div style={userBadgeStyle}>
                <span style={{ fontSize: "13px" }}>{badgeIcon}</span>
                <span style={{ fontSize: "12px", color: badgeTheme.textColor, fontWeight: 800 }}>{activeBadgeTitle || "未解锁称号"}</span>
              </div>
              <div style={{ display: "flex", gap: "8px", fontSize: "12px", marginTop: "3px" }}>
                <span onClick={onLogout} style={{ color: "#d94f5c", cursor: "pointer" }}>
                  閫€鍑?
                </span>
                <span onClick={onShowFeedback} style={{ color: "#5aa77b", cursor: "pointer" }}>
                  鍙嶉寤鸿
                </span>
                <span onClick={onShowAnnouncement} style={{ color: "#5aa77b", cursor: "pointer" }}>
                  鍏憡
                </span>
                {currentUser.phone === adminPhone && (
                  <span onClick={onManageBadge} style={{ color: "#5aa77b", cursor: "pointer" }}>
                    绉板彿鎺堟潈
                  </span>
                )}
                {currentUser.phone === adminPhone && (
                  <span onClick={onFetchAllFeedbacks} style={{ color: "#333", cursor: "pointer" }}>
                    鍙嶉搴?
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input placeholder="鎼滅储鐩殑鍦?.." value={search} onChange={(e) => onSearchChange(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
            <button onClick={onShowRecommendModal} style={{ ...btnCodeStyle, width: "100px", height: "42px", background: "#5aa77b" }}>
              鎴戣鎺ㄨ崘
            </button>
          </div>
        </div>

        <div style={{ position: "sticky", top: 0, background: "white", zIndex: 100, padding: "10px 20px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-start" }}>
            {FILTER_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => onFilterChange(item.key)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  border: "none",
                  background: filter === item.key ? "#5aa77b" : "#f0f0f0",
                  color: filter === item.key ? "white" : "#666",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "10px 20px 30px 20px" }}>
          {filteredPlaces.map((place, index) => {
            const isMarked = targetPlaces.some((target) => target.id === place.id);
            const isFav = favoriteIds.includes(String(place.id));
            const coverImage = (place.album && place.album[0]) || "https://api.suzcore.top/uploads/default_place.jpg";
            return (
              <div key={place.id} style={{ padding: "16px", background: "#f9fcf9", borderRadius: "20px", marginBottom: "15px", border: "1px solid #f0f5f1", position: "relative" }}>
                {filter === "top10" && <div style={rankBadgeStyle(index)}>{index + 1}</div>}

                {place.type === "recommend" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <img src={place.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${place.user_phone}`} style={{ width: "24px", height: "24px", borderRadius: "50%" }} alt="user-avatar" />
                    <span style={{ fontSize: "12px", fontWeight: "bold" }}>{place.username} 鍒嗕韩</span>
                    <span style={{ fontSize: "10px", color: "#999" }}>{formatCommentTime(place.created_at)}</span>
                    {place.user_phone === currentUser.phone && (
                      <span onClick={(e) => onDeleteRec(e, place.realId)} style={{ fontSize: "10px", color: "red", marginLeft: "auto", cursor: "pointer" }}>
                        鍒犻櫎
                      </span>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <img src={coverImage} style={listThumbStyle} loading="lazy" decoding="async" fetchPriority="low" onClick={() => onOpenDetail(place, 0, true)} alt="place-cover" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>{place.name}</h3>
                      <span
                        onClick={() => onToggleFavorite(place)}
                        style={{
                          cursor: "pointer",
                          width: FAVORITE_ICON_SIZE,
                          height: FAVORITE_ICON_SIZE,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: FAVORITE_ICON_FONT_SIZE,
                          fontWeight: 600,
                          lineHeight: 1,
                          borderRadius: "12px",
                          background: isFav ? FAVORITE_ICON_ACTIVE_BACKGROUND : FAVORITE_ICON_INACTIVE_BACKGROUND,
                          color: isFav ? FAVORITE_ICON_ACTIVE_COLOR : FAVORITE_ICON_INACTIVE_COLOR,
                          border: isFav ? "none" : FAVORITE_ICON_INACTIVE_BORDER,
                          boxShadow: isFav ? FAVORITE_ICON_ACTIVE_SHADOW : FAVORITE_ICON_INACTIVE_SHADOW,
                          transition: "all 0.2s ease",
                        }}
                      >
                        {isFav ? "★" : "☆"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                      <span style={categoryTagStyle}>{formatPlaceTypeTag(place.type)}</span>
                      {place.isPhotoReady && <span style={photoTagStyle}>📸 可出片</span>}
                      {place.hours && <span style={{ fontSize: "11px", color: "#888" }}>馃晿 {place.hours}</span>}
                      {place.phone && place.phone !== "无" && (
                        <a href={`tel:${place.phone}`} style={{ fontSize: "11px", color: "#5aa77b", textDecoration: "none", display: "flex", alignItems: "center", gap: "2px" }}>
                          馃摓 {place.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: "12px", color: "#777", margin: "10px 0" }}>{place.desc}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ fontSize: "12px", color: "#5aa77b" }}>馃搹 璺濅綘: {place.distVal} km</div>
                  <div onClick={(e) => (place.type === "recommend" ? onLikeRec(e, place.realId) : onLikePlace(e, place.id))} style={placeLikeBtnStyle(place.isPlaceLiked)}>
                    <span style={{ fontSize: "13px" }}>{place.isPlaceLiked ? "❤️" : "🤍"}</span>
                    <span>{place.likes}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => onOpenDetail(place, 0, false)} style={btnDetailStyle}>
                    馃柤锔?璇︽儏
                  </button>
                  <button onClick={() => onToggleTarget(place)} style={btnSmallStyle(isMarked)}>
                    {isMarked ? "鍙栨秷" : "鏍囪"}
                  </button>
                  <button onClick={() => onNavigate(place)} style={btnNavStyle}>
                    馃Л 瀵艰埅
                  </button>
                </div>

                <div onClick={() => onOpenComments(place)} style={{ marginTop: "15px", borderTop: "1px dashed #eee", paddingTop: "10px", color: "#5aa77b", fontSize: "12px", cursor: "pointer" }}>
                  馃挰 鏌ョ湅璇勮鍖?
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default HomePanels;
