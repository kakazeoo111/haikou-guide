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
          maxWidth: "320px",
          background: "#fff",
          borderRadius: "24px",
          border: "1px solid #dfeee6",
          boxShadow: "0 18px 40px rgba(29,72,49,0.18)",
          padding: "18px 16px",
        }}
      >
        {loading && <div style={{ textAlign: "center", color: "#6f8b7e", fontSize: "14px", padding: "18px 0" }}>加载中...</div>}
        {!loading && data && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <img
              src={data.avatarUrl}
              alt="user-avatar"
              style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", border: "2px solid #5aa77b", background: "#f5fbf7" }}
            />
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#386851", background: "#eef9f2", borderRadius: "999px", padding: "5px 10px", border: "1px solid #cde8d8" }}>
              <span>{data.badgeIcon || "🏅"}</span>
              <span>{data.badgeTitle || "未解锁称号"}</span>
            </div>
            <div style={{ width: "100%", borderRadius: "16px", background: "linear-gradient(135deg,#edf9f1,#eaf3ff)", border: "1px solid #d6ebe0", padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#6f8b7e", marginBottom: "4px" }}>点数</div>
              <div style={{ fontSize: "28px", color: "#1f8f66", fontWeight: 800, letterSpacing: "0.4px", lineHeight: 1 }}>{Number(data.points || 0).toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserPointsCardModal;
