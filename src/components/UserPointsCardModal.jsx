import { useEffect, useMemo, useState } from "react";

const CARD_OVERLAY_Z_INDEX = 4100;
const AVATAR_PREVIEW_Z_INDEX = 4200;

function AvatarPreview({ visible, avatarUrl, onClose }) {
  if (!visible) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: AVATAR_PREVIEW_Z_INDEX,
        background: "rgba(8,16,12,0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "22px",
      }}
    >
      <img
        onClick={(event) => event.stopPropagation()}
        src={avatarUrl}
        alt="user-avatar-preview"
        style={{
          width: "min(82vw, 360px)",
          aspectRatio: "1 / 1",
          borderRadius: "24px",
          border: "3px solid #d7efe3",
          objectFit: "cover",
          boxShadow: "0 18px 48px rgba(0,0,0,0.38)",
          background: "#fff",
        }}
      />
    </div>
  );
}

function RecommendedPlaces({ places }) {
  if (!places.length) {
    return (
      <div style={{ fontSize: "12px", color: "#89a298", textAlign: "center", padding: "10px 0" }}>
        暂未推荐景点
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
      {places.map((place) => (
        <span
          key={`${place.id}-${place.name}`}
          style={{
            maxWidth: "100%",
            borderRadius: "999px",
            border: "1px solid #c9e5d7",
            background: "#f4fbf7",
            color: "#2f6950",
            fontSize: "12px",
            padding: "5px 10px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {place.name}
        </span>
      ))}
    </div>
  );
}

function SummaryHeader({ data, onAvatarClick }) {
  return (
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
        onClick={onAvatarClick}
        style={{
          width: "74px",
          height: "74px",
          borderRadius: "50%",
          objectFit: "cover",
          border: "3px solid #5aa77b",
          background: "#f5fbf7",
          boxShadow: "0 8px 18px rgba(58,155,120,0.2)",
          cursor: "zoom-in",
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: "19px", fontWeight: 800, color: "#1f3e31", lineHeight: 1.1, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.username}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#386851", background: "rgba(255,255,255,0.75)", borderRadius: "999px", padding: "5px 10px", border: "1px solid #c8e4d5", marginTop: "8px", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span>{data.badgeIcon || "🏅"}</span>
          <span>{data.badgeTitle || "未解锁称号"}</span>
        </div>
        <div style={{ fontSize: "11px", color: "#7f9a8d", marginTop: "6px" }}>点击头像查看大图</div>
      </div>
    </div>
  );
}

function StatsGrid({ data }) {
  return (
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
  );
}

function PlacesPanel({ places }) {
  return (
    <div style={{ borderRadius: "16px", border: "1px solid #d9ece2", background: "#f9fffc", padding: "11px 12px" }}>
      <div style={{ fontSize: "12px", color: "#5a7a6a", fontWeight: 700, marginBottom: "8px" }}>推荐过的景点</div>
      <RecommendedPlaces places={places} />
    </div>
  );
}

function UserSummaryContent({ data, onAvatarClick, recommendedPlaces }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <SummaryHeader data={data} onAvatarClick={onAvatarClick} />
      <StatsGrid data={data} />
      <PlacesPanel places={recommendedPlaces} />
    </div>
  );
}

function UserPointsCardModal({ visible, loading, data, onClose }) {
  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false);
  const recommendedPlaces = useMemo(() => {
    if (!Array.isArray(data?.recommendedPlaces)) return [];
    return data.recommendedPlaces.filter((item) => item?.name);
  }, [data]);

  useEffect(() => {
    if (!visible) setAvatarPreviewVisible(false);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: CARD_OVERLAY_Z_INDEX, background: "rgba(18,24,20,0.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
        <div onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: "340px", background: "#fff", borderRadius: "24px", border: "1px solid #d8ebe1", boxShadow: "0 24px 52px rgba(26,76,54,0.22)", padding: "16px" }}>
          {loading && <div style={{ textAlign: "center", color: "#6f8b7e", fontSize: "14px", padding: "24px 0" }}>加载中...</div>}
          {!loading && data && <UserSummaryContent data={data} onAvatarClick={() => setAvatarPreviewVisible(true)} recommendedPlaces={recommendedPlaces} />}
        </div>
      </div>
      <AvatarPreview visible={avatarPreviewVisible} avatarUrl={data?.avatarUrl} onClose={() => setAvatarPreviewVisible(false)} />
    </>
  );
}

export default UserPointsCardModal;
