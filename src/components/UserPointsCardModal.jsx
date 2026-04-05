function UserPointsCardModal({ visible, loading, data, onClose }) {
  if (!visible) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 4100,
        background: "rgba(18,24,20,0.42)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "340px",
          background: "#fff",
          borderRadius: "24px",
          border: "1px solid #d8ebe1",
          boxShadow: "0 24px 52px rgba(26,76,54,0.22)",
          padding: "16px",
        }}
      >
        {loading && <div style={{ textAlign: "center", color: "#6f8b7e", fontSize: "14px", padding: "24px 0" }}>加载中...</div>}
        {!loading && data && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div
              style={{
                borderRadius: "20px",
                padding: "14px",
                border: "1px solid #d3ecdf",
                background: "linear-gradient(135deg, #effff4 0%, #eff6ff 100%)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <img
                src={data.avatarUrl}
                alt="user-avatar"
                style={{ width: "74px", height: "74px", borderRadius: "50%", objectFit: "cover", border: "3px solid #5aa77b", background: "#f5fbf7", boxShadow: "0 8px 18px rgba(58,155,120,0.2)" }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "19px", fontWeight: 800, color: "#1f3e31", lineHeight: 1.1, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {data.username}
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#386851", background: "rgba(255,255,255,0.75)", borderRadius: "999px", padding: "5px 10px", border: "1px solid #c8e4d5", marginTop: "8px", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span>{data.badgeIcon || "🏅"}</span>
                  <span>{data.badgeTitle || "未解锁称号"}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ borderRadius: "16px", background: "linear-gradient(145deg, #ebfdf4, #eef8ff)", border: "1px solid #d1eadd", padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "#6f8b7e", marginBottom: "4px" }}>点数</div>
                <div style={{ fontSize: "28px", color: "#1f8f66", fontWeight: 800, letterSpacing: "0.4px", lineHeight: 1 }}>{Number(data.points || 0).toLocaleString()}</div>
              </div>
              <div style={{ borderRadius: "16px", background: "linear-gradient(145deg, #f5fbff, #f0fff9)", border: "1px solid #d9e7ef", padding: "12px 10px", textAlign: "center" }}>
                <div style={{ fontSize: "12px", color: "#6f8b7e", marginBottom: "4px" }}>最近活跃</div>
                <div style={{ fontSize: "24px", color: "#2f6fd1", fontWeight: 800, letterSpacing: "0.4px", lineHeight: 1 }}>{Number(data.recentActiveDays || 0)}天</div>
                <div style={{ fontSize: "10px", color: "#8fa4b4", marginTop: "3px" }}>近{Number(data.activeWindowDays || 30)}天</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserPointsCardModal;
