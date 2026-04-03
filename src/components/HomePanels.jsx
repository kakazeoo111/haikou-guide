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

const FILTER_ITEMS = [
  { key: "all", label: "全部" },
  { key: "recommend", label: "✨ 推荐" },
  { key: "top10", label: "🏆 榜单" },
  { key: "favorite", label: "⭐收藏" },
  { key: "food", label: "🍱美食" },
  { key: "view", label: "🏞️景点" },
  { key: "street", label: "🛍️商圈" },
  { key: "cafe", label: "☕咖啡" },
];

function formatPlaceTypeTag(type) {
  if (type === "food") return "🍱 美食";
  if (type === "view") return "🏞️ 景点";
  if (type === "cafe") return "☕ 咖啡";
  if (type === "recommend") return "✨ 推荐";
  return "🛍️ 商圈";
}

function HomePanels({
  isMobile,
  userLocation,
  targetPlaces,
  currentUser,
  adminPhone,
  search,
  filter,
  favoriteIds,
  filteredPlaces,
  onRefreshLocation,
  onAvatarUpload,
  onOpenProfile,
  onLogout,
  onShowFeedback,
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
  return (
    <>
      <div style={{ width: isMobile ? "100%" : "auto", height: isMobile ? "30vh" : "100%", flex: isMobile ? "none" : 1, position: "relative", zIndex: 10 }}>
        <BaiduMap targetPlaces={targetPlaces} userLocation={userLocation} />
        <button onClick={onRefreshLocation} style={floatBtnStyle}>
          🎯
        </button>
      </div>

      <div style={{ width: isMobile ? "100%" : "380px", height: isMobile ? "70vh" : "100vh", overflowY: "auto", background: "white", zIndex: 15, padding: "0", boxSizing: "border-box" }}>
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
              <h3 onClick={onOpenProfile} style={{ margin: 0, fontSize: "16px", color: "#333", cursor: "pointer" }}>
                {currentUser.username} <span style={{ fontSize: "12px", color: "#ccc" }}>❯</span>
              </h3>
              <div style={{ display: "flex", gap: "8px", fontSize: "12px", marginTop: "2px" }}>
                <span onClick={onLogout} style={{ color: "#d94f5c", cursor: "pointer" }}>
                  退出
                </span>
                <span onClick={onShowFeedback} style={{ color: "#5aa77b", cursor: "pointer" }}>
                  反馈建议
                </span>
                {currentUser.phone === adminPhone && (
                  <span onClick={onFetchAllFeedbacks} style={{ color: "#333", cursor: "pointer" }}>
                    反馈库
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input placeholder="搜索目的地..." value={search} onChange={(e) => onSearchChange(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
            <button onClick={onShowRecommendModal} style={{ ...btnCodeStyle, width: "100px", height: "42px", background: "#5aa77b" }}>
              我要推荐
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
          {filteredPlaces.map((place, index) => (
            <div key={place.id} style={{ padding: "16px", background: "#f9fcf9", borderRadius: "20px", marginBottom: "15px", border: "1px solid #f0f5f1", position: "relative" }}>
              {filter === "top10" && <div style={rankBadgeStyle(index)}>{index + 1}</div>}

              {place.type === "recommend" && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <img src={place.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${place.user_phone}`} style={{ width: "24px", height: "24px", borderRadius: "50%" }} alt="user-avatar" />
                  <span style={{ fontSize: "12px", fontWeight: "bold" }}>{place.username} 分享</span>
                  <span style={{ fontSize: "10px", color: "#999" }}>{formatCommentTime(place.created_at)}</span>
                  {place.user_phone === currentUser.phone && (
                    <span onClick={(e) => onDeleteRec(e, place.realId)} style={{ fontSize: "10px", color: "red", marginLeft: "auto", cursor: "pointer" }}>
                      删除
                    </span>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <img
                  src={(place.album && place.album[0]) || "https://api.suzcore.top/uploads/default_place.jpg"}
                  style={listThumbStyle}
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                  onClick={() => onOpenDetail(place, 0, true)}
                  alt="place-cover"
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>{place.name}</h3>
                    <span onClick={() => onToggleFavorite(place)} style={{ cursor: "pointer", fontSize: "22px" }}>
                      {favoriteIds.includes(String(place.id)) ? "⭐" : "☆"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                    <span style={categoryTagStyle}>{formatPlaceTypeTag(place.type)}</span>
                    {place.isPhotoReady && <span style={photoTagStyle}>📸 可出片</span>}
                    {place.hours && <span style={{ fontSize: "11px", color: "#888" }}>🕒 {place.hours}</span>}
                    {place.phone && place.phone !== "无" && (
                      <a href={`tel:${place.phone}`} style={{ fontSize: "11px", color: "#5aa77b", textDecoration: "none", display: "flex", alignItems: "center", gap: "2px" }}>
                        📞 {place.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: "12px", color: "#777", margin: "10px 0" }}>{place.desc}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontSize: "12px", color: "#5aa77b" }}>📏 距你：{place.distVal} km</div>
                <div onClick={(e) => (place.type === "recommend" ? onLikeRec(e, place.realId) : onLikePlace(e, place.id))} style={placeLikeBtnStyle(place.isPlaceLiked)}>
                  {place.isPlaceLiked ? "👍" : "🤍"} {place.likes}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => onOpenDetail(place, 0, false)} style={btnDetailStyle}>
                  🖼️ 详情
                </button>
                <button onClick={() => onToggleTarget(place)} style={btnSmallStyle(targetPlaces.some((target) => target.id === place.id))}>
                  {targetPlaces.some((target) => target.id === place.id) ? "取消" : "标记"}
                </button>
                <button onClick={() => onNavigate(place)} style={btnNavStyle}>
                  🧭 导航
                </button>
              </div>

              <div onClick={() => onOpenComments(place)} style={{ marginTop: "15px", borderTop: "1px dashed #eee", paddingTop: "10px", color: "#5aa77b", fontSize: "12px", cursor: "pointer" }}>
                💬 查看评论区
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default HomePanels;
