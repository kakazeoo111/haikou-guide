import { useState } from "react";
import BadgePickerModal from "./BadgePickerModal";
import { badgeStyle, navHeaderStyle, profileAvatarLarge, profilePageStyle } from "../styles/appStyles";
import { getBadgeEmoji, getBadgeTheme } from "../logic/badgeTheme";
import { APP_CACHE_TTL_MS, readCachedValue } from "../logic/clientCache";
import { getAvatarWithFallback } from "../logic/avatarFallback";
import { buildImageLoadingProps } from "../logic/imageProps";
import { formatCommentTime, parseRecommendationAlbum, parseRecommendationAlbumEntries } from "../logic/placeUtils";
import { DEFAULT_PLACE_COVER } from "../constants/imageFallbacks";
import { authFetch } from "../logic/apiClient";

const MY_RECOMMEND_THUMB_SIZE_PX = 78;
const MENU_ICON_CONTAINER_SIZE_PX = 38;
const PROFILE_CARD_GRADIENT = "radial-gradient(ellipse at top, #eefbf3 0%, #ffffff 62%)";
const MENU_ICON_BG = "linear-gradient(135deg, #eaf7ef, #dff1e7)";

const activeBadgePillBaseStyle = {
  marginTop: "8px",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, #eafff1, #e9f7ff)",
  border: "1px solid #d9f0e4",
  boxShadow: "0 8px 18px rgba(90,167,123,0.18)",
  color: "#1f5f45",
  fontWeight: 700,
  fontSize: "12px",
};

const profileCardEnhancedStyle = {
  background: PROFILE_CARD_GRADIENT,
  borderRadius: "24px",
  padding: "36px 20px 28px",
  textAlign: "center",
  border: "1px solid #eaf3ee",
  boxShadow: "0 10px 28px rgba(90,167,123,0.08)",
};

const menuItemEnhancedStyle = {
  background: "white",
  padding: "16px 18px",
  borderRadius: "18px",
  marginBottom: "12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid #eef4f0",
  boxShadow: "0 4px 14px rgba(90,167,123,0.06)",
  cursor: "pointer",
};

const menuIconWrapperStyle = {
  width: `${MENU_ICON_CONTAINER_SIZE_PX}px`,
  height: `${MENU_ICON_CONTAINER_SIZE_PX}px`,
  borderRadius: "12px",
  background: MENU_ICON_BG,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  flexShrink: 0,
};

const menuItemLeftStyle = { display: "flex", alignItems: "center", gap: "12px", color: "#2b3a33", fontWeight: 600, fontSize: "15px" };

const enhancedLogOutStyle = {
  width: "100%",
  marginTop: "24px",
  padding: "15px",
  borderRadius: "16px",
  border: "1px solid #ffd2d5",
  color: "#ff4d4f",
  background: "#fff",
  fontWeight: 700,
  fontSize: "15px",
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(255,77,79,0.08)",
};

const myRecommendOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100%",
  background: "#f8fbf9",
  zIndex: 3200,
  display: "flex",
  flexDirection: "column",
};

function ProfileOverlay({
  currentUser,
  notifications,
  activeBadgeTitle,
  activeBadgeMeta,
  badgeSummary,
  showBadgePicker,
  onBackHome,
  onShowNoticeList,
  onOpenBadgePicker,
  onCloseBadgePicker,
  onSelectBadge,
  authApiBase,
  onAvatarUpload,
  onLogout,
}) {
  const [showMyRecommendations, setShowMyRecommendations] = useState(false);
  const [myRecommendations, setMyRecommendations] = useState([]);
  const [myRecommendationsLoading, setMyRecommendationsLoading] = useState(false);
  const unreadCount = notifications.filter((notice) => !notice.is_read).length;
  const badgeSeed = `${currentUser?.phone || ""}-${activeBadgeTitle || ""}`;
  const badgeTheme = getBadgeTheme(badgeSeed);
  const badgeIcon = getBadgeEmoji(badgeSeed, activeBadgeMeta?.icon || "");
  const activeBadgePillStyle = {
    ...activeBadgePillBaseStyle,
    background: badgeTheme.background,
    border: `1px solid ${badgeTheme.border}`,
    boxShadow: badgeTheme.shadow,
    color: badgeTheme.textColor,
  };

  const handleOpenMyRecommendations = async () => {
    if (!currentUser?.phone) return;
    const cachedData = readCachedValue(`recommendations_${currentUser.phone}`, APP_CACHE_TTL_MS.recommendations);
    if (cachedData?.ok) {
      const cachedMine = (cachedData.data || []).filter((item) => String(item.user_phone || "") === String(currentUser.phone));
      setMyRecommendations(cachedMine);
      setShowMyRecommendations(true);
    }
    setMyRecommendationsLoading(true);
    try {
      const res = await authFetch(`${authApiBase}/api/recommendations?phone=${currentUser.phone}`);
      const data = await res.json();
      if (!data.ok) {
        console.error("获取我的推荐失败:", data);
        alert("获取我的推荐失败，请稍后重试");
        return;
      }
      const mine = (data.data || []).filter((item) => String(item.user_phone || "") === String(currentUser.phone));
      setMyRecommendations(mine);
      setShowMyRecommendations(true);
    } catch (error) {
      console.error("获取我的推荐失败:", error);
      alert("获取我的推荐失败，请稍后重试");
    } finally {
      setMyRecommendationsLoading(false);
    }
  };

  return (
    <div style={profilePageStyle}>
      <div style={navHeaderStyle}>
        <span onClick={onBackHome} style={{ cursor: "pointer", fontSize: "18px" }}>
          ← 返回
        </span>
        <span style={{ fontWeight: "bold" }}>个人中心</span>
        <span style={{ width: "40px" }}></span>
      </div>

      <div style={{ padding: "20px" }}>
        <div style={profileCardEnhancedStyle}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <img
              src={getAvatarWithFallback(currentUser.avatar_url, currentUser.phone, currentUser.username)}
              {...buildImageLoadingProps({ eager: true, priority: "high" })}
              style={{ ...profileAvatarLarge, cursor: "pointer", boxShadow: "0 6px 18px rgba(90,167,123,0.25)" }}
              onClick={() => document.getElementById("profile-avatar-input").click()}
              title="点击更换头像"
              alt="profile-avatar"
            />
            <div
              style={{
                position: "absolute",
                bottom: "5px",
                right: "5px",
                background: "#5aa77b",
                borderRadius: "50%",
                width: "26px",
                height: "26px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "14px",
                border: "2px solid white",
                boxShadow: "0 2px 8px rgba(90,167,123,0.35)",
              }}
            >
              📷
            </div>
          </div>

          <input type="file" id="profile-avatar-input" hidden accept="image/*" onChange={onAvatarUpload} />

          <h2 style={{ marginTop: "15px", color: "#2e6a4a", marginBottom: "5px" }}>{currentUser.username}</h2>
          <div style={activeBadgePillStyle}>
            <span>{badgeIcon}</span>
            <span>{activeBadgeTitle || "未解锁称号"}</span>
          </div>
          <p style={{ color: "#99a8a1", fontSize: "13px", margin: "12px 0 0" }}>手机号: {currentUser.phone}</p>
        </div>

        <div style={{ marginTop: "22px" }}>
          <div style={menuItemEnhancedStyle} onClick={onShowNoticeList}>
            <div style={menuItemLeftStyle}>
              <span style={menuIconWrapperStyle}>🔔</span>
              <span>消息回复提醒</span>
            </div>
            {unreadCount > 0 && <span style={badgeStyle}>{unreadCount}</span>}
          </div>

          <div style={menuItemEnhancedStyle} onClick={onOpenBadgePicker}>
            <div style={menuItemLeftStyle}>
              <span style={menuIconWrapperStyle}>🏆</span>
              <span>荣誉称号获得</span>
            </div>
            <div style={{ fontSize: "12px", color: "#5aa77b", fontWeight: "bold" }}>{activeBadgeTitle || "未解锁称号"}</div>
          </div>

          <div style={menuItemEnhancedStyle} onClick={handleOpenMyRecommendations}>
            <div style={menuItemLeftStyle}>
              <span style={menuIconWrapperStyle}>✨</span>
              <span>我的推荐</span>
            </div>
            <span style={{ color: "#8ca397", fontSize: "16px" }}>{myRecommendationsLoading ? "加载中..." : "›"}</span>
          </div>
        </div>

        <button onClick={onLogout} style={enhancedLogOutStyle}>
          退出当前账号
        </button>
      </div>

      <BadgePickerModal
        visible={showBadgePicker}
        badgeSummary={badgeSummary}
        activeBadgeTitle={activeBadgeTitle}
        onClose={onCloseBadgePicker}
        onSelect={onSelectBadge}
      />

      {showMyRecommendations && (
        <div style={myRecommendOverlayStyle}>
          <div style={navHeaderStyle}>
            <span onClick={() => setShowMyRecommendations(false)} style={{ cursor: "pointer", fontSize: "18px" }}>
              ← 返回
            </span>
            <span style={{ fontWeight: "bold" }}>我的推荐</span>
            <span style={{ width: "40px" }}></span>
          </div>
          <div style={{ padding: "16px 20px 30px", overflowY: "auto", flex: 1 }}>
            {myRecommendations.length === 0 && (
              <div style={{ textAlign: "center", color: "#97a39e", marginTop: "120px" }}>你还没有发布推荐景点</div>
            )}
            {myRecommendations.map((item) => {
              const album = parseRecommendationAlbum(item.image_url);
              const albumEntries = parseRecommendationAlbumEntries(item.image_url);
              const cover = albumEntries[0]?.thumbnail || album[0] || DEFAULT_PLACE_COVER;
              return (
                <div
                  key={item.id}
                  style={{
                    background: "white",
                    borderRadius: "20px",
                    border: "1px solid #ebf3ee",
                    padding: "14px",
                    marginBottom: "14px",
                    boxShadow: "0 4px 14px rgba(20,47,35,0.04)",
                  }}
                >
                  <div style={{ display: "flex", gap: "12px" }}>
                    <img
                      src={cover}
                      {...buildImageLoadingProps()}
                      width={MY_RECOMMEND_THUMB_SIZE_PX}
                      height={MY_RECOMMEND_THUMB_SIZE_PX}
                      alt={item.place_name}
                      style={{ width: "78px", height: "78px", borderRadius: "12px", objectFit: "cover", flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#1f4133", marginBottom: "4px" }}>{item.place_name}</div>
                      <div style={{ fontSize: "12px", color: "#6c7f77", lineHeight: 1.45 }}>{item.description || "暂无描述"}</div>
                      <div style={{ marginTop: "8px", fontSize: "11px", color: "#97a39e" }}>
                        发布于 {formatCommentTime(item.created_at)} · 点赞 {item.like_count || 0}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileOverlay;
