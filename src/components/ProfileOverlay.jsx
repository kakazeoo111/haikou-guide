import {
  badgeStyle,
  btnLogOutStyle,
  menuItemStyle,
  navHeaderStyle,
  profileAvatarLarge,
  profileInfoCard,
  profilePageStyle,
} from "../styles/appStyles";

function ProfileOverlay({
  currentUser,
  notifications,
  onBackHome,
  onShowNoticeList,
  onGoRecommend,
  onAvatarUpload,
  onLogout,
}) {
  const unreadCount = notifications.filter((notice) => !notice.is_read).length;

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
        <div style={profileInfoCard}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <img
              src={currentUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.phone}`}
              style={{ ...profileAvatarLarge, cursor: "pointer" }}
              onClick={() => document.getElementById("profile-avatar-input").click()}
              title="点击更换头像"
            />
            <div
              style={{
                position: "absolute",
                bottom: "5px",
                right: "5px",
                background: "#5aa77b",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "14px",
                border: "2px solid white",
              }}
            >
              📷
            </div>
          </div>

          <input type="file" id="profile-avatar-input" hidden accept="image/*" onChange={onAvatarUpload} />

          <h2 style={{ marginTop: "15px", color: "#2e6a4a", marginBottom: "5px" }}>{currentUser.username}</h2>
          <p style={{ color: "#999", fontSize: "13px", margin: 0 }}>手机号：{currentUser.phone}</p>
          <p style={{ color: "#5aa77b", fontSize: "11px", marginTop: "5px" }}>点击头像可更换</p>
        </div>

        <div style={{ marginTop: "20px" }}>
          <div style={menuItemStyle} onClick={onShowNoticeList}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>🔔</span> 消息回复提醒
            </div>
            {unreadCount > 0 && <span style={badgeStyle}>{unreadCount}</span>}
          </div>

          <div style={menuItemStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>🏆</span> 荣誉称号获得
            </div>
            <div style={{ fontSize: "12px", color: "#5aa77b", fontWeight: "bold" }}>椰城探路者</div>
          </div>

          <div style={menuItemStyle} onClick={onGoRecommend}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>✨</span> 我的分享记录
            </div>
            <span>❯</span>
          </div>
        </div>

        <button onClick={onLogout} style={btnLogOutStyle}>
          退出当前账号
        </button>
      </div>
    </div>
  );
}

export default ProfileOverlay;
