import { useEffect, useMemo, useState } from "react";
import { JUMP_TO_RECOMMEND_EVENT } from "../constants/jumpEvents";

const CARD_OVERLAY_Z_INDEX = 4100;
const AVATAR_PREVIEW_Z_INDEX = 4200;
const CARD_MAX_WIDTH = 360;
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
          boxShadow: "0 20px 52px rgba(0,0,0,0.42)",
          background: "#fff",
        }}
      />
    </div>
  );
}

function SummaryHeader({ data, onAvatarClick }) {
  return (
    <div
      style={{
        borderRadius: "24px",
        padding: "14px",
        border: "1px solid #cce8db",
        background: "linear-gradient(135deg, #f2fff7 0%, #ecf7ff 100%)",
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
          width: "76px",
          height: "76px",
          borderRadius: "50%",
          objectFit: "cover",
          border: "3px solid #5aa77b",
          boxShadow: "0 10px 22px rgba(53,157,118,0.24)",
          cursor: "zoom-in",
          background: "#fff",
        }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: "20px", fontWeight: 900, color: "#1f3e31", lineHeight: 1.05, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {data.username}
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#2f6950", background: "rgba(255,255,255,0.8)", borderRadius: "999px", padding: "6px 11px", border: "1px solid #cce8da", marginTop: "8px", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span>{data.badgeIcon || "🏅"}</span>
          <span>{data.badgeTitle || "未解锁称号"}</span>
        </div>
      </div>
    </div>
  );
}

function StatsGrid({ data }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
      <div style={{ borderRadius: "20px", background: "linear-gradient(160deg, #e9fff3 0%, #f4fbff 100%)", border: "1px solid #d2ebdf", padding: "13px 10px", textAlign: "center" }}>
        <div style={{ fontSize: "12px", color: "#5f8878", marginBottom: "4px" }}>点数</div>
        <div style={{ fontSize: "30px", color: "#109162", fontWeight: 900, letterSpacing: "0.5px", lineHeight: 1 }}>{Number(data.points || 0).toLocaleString()}</div>
      </div>
      <div style={{ borderRadius: "20px", background: "linear-gradient(160deg, #f2faff 0%, #edfff8 100%)", border: "1px solid #dbe9ef", padding: "13px 10px", textAlign: "center" }}>
        <div style={{ fontSize: "12px", color: "#5f8878", marginBottom: "4px" }}>最近活跃</div>
        <div style={{ fontSize: "30px", color: "#1f6fda", fontWeight: 900, letterSpacing: "0.5px", lineHeight: 1 }}>{Number(data.recentActiveDays || 0)}天</div>
        <div style={{ fontSize: "10px", color: "#88a2b2", marginTop: "4px" }}>近{Number(data.activeWindowDays || 30)}天</div>
      </div>
    </div>
  );
}

function PlaceChip({ place, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1px solid #cde6da",
        background: "#f7fffb",
        color: "#2f6a52",
        borderRadius: "999px",
        padding: "7px 12px",
        maxWidth: "100%",
        fontSize: "12px",
        fontWeight: active ? 800 : 700,
        cursor: "pointer",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        boxShadow: active ? "0 6px 18px rgba(60,156,120,0.22)" : "none",
        transition: "all .18s ease",
      }}
    >
      {place.name}
    </button>
  );
}

function jumpToRecommendList(place, onClose) {
  const recommendationId = Number(place?.id || 0);
  const placeName = String(place?.name || "").trim();
  if (!recommendationId || !placeName) return;
  window.dispatchEvent(new CustomEvent(JUMP_TO_RECOMMEND_EVENT, { detail: { recommendationId, placeName } }));
  onClose?.();
}

function RecommendedPlacesSection({ places, onJump }) {
  if (!places.length) {
    return (
      <div style={{ borderRadius: "20px", border: "1px solid #d9ece2", background: "linear-gradient(145deg, #fcfffd, #f7fffb)", padding: "12px" }}>
        <div style={{ fontSize: "13px", color: "#4f7465", fontWeight: 800, marginBottom: "6px" }}>推荐过的景点</div>
        <div style={{ fontSize: "12px", color: "#89a298", padding: "4px 0" }}>暂未推荐景点</div>
      </div>
    );
  }
  return (
    <div style={{ borderRadius: "20px", border: "1px solid #d9ece2", background: "linear-gradient(145deg, #fcfffd, #f1fff8)", padding: "12px" }}>
      <div style={{ fontSize: "13px", color: "#4f7465", fontWeight: 800, marginBottom: "8px" }}>推荐过的景点</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {places.map((place) => (
          <PlaceChip key={`${place.id}-${place.name}`} place={place} active={false} onClick={() => onJump(place)} />
        ))}
      </div>
      <div style={{ fontSize: "12px", color: "#7e9b8d", padding: "10px 0 2px" }}>点击地点名称，跳转到推荐列表中的对应地点</div>
    </div>
  );
}

function SummaryPanel({ loading, data, recommendedPlaces, onAvatarClick, onJumpPlace }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: `${CARD_MAX_WIDTH}px`,
        background: "linear-gradient(155deg, #ffffff 0%, #f6fffa 48%, #f2f9ff 100%)",
        borderRadius: "24px",
        border: "1px solid #d6ebe1",
        boxShadow: "0 26px 56px rgba(24,84,59,0.24)",
        padding: "16px",
      }}
    >
      {loading && <div style={{ textAlign: "center", color: "#6f8b7e", fontSize: "14px", padding: "24px 0" }}>加载中...</div>}
      {!loading && data && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <SummaryHeader data={data} onAvatarClick={onAvatarClick} />
          <StatsGrid data={data} />
          <RecommendedPlacesSection places={recommendedPlaces} onJump={onJumpPlace} />
        </div>
      )}
    </div>
  );
}

function ModalShell({ visible, onClose, children }) {
  if (!visible) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: CARD_OVERLAY_Z_INDEX,
        background: "rgba(18,24,20,0.42)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div onClick={(event) => event.stopPropagation()}>{children}</div>
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
    if (!visible) {
      setAvatarPreviewVisible(false);
    }
  }, [visible]);

  return (
    <>
      <ModalShell visible={visible} onClose={onClose}>
        <SummaryPanel
          loading={loading}
          data={data}
          recommendedPlaces={recommendedPlaces}
          onAvatarClick={() => setAvatarPreviewVisible(true)}
          onJumpPlace={(place) => jumpToRecommendList(place, onClose)}
        />
      </ModalShell>
      <AvatarPreview visible={avatarPreviewVisible} avatarUrl={data?.avatarUrl} onClose={() => setAvatarPreviewVisible(false)} />
    </>
  );
}

export default UserPointsCardModal;
