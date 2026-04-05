export const suggestionListStyle = { position: "absolute", top: "45px", left: 0, width: "100%", background: "white", border: "1px solid #eee", borderRadius: "10px", boxShadow: "0 10px 20px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: "200px", overflowY: "auto" };
export const suggestionItemStyle = { padding: "10px 15px", borderBottom: "1px solid #f9f9f9", cursor: "pointer" };
export const rankBadgeStyle = (idx) => ({ position: "absolute", top: "-5px", left: "-5px", width: "24px", height: "24px", background: idx === 0 ? "#FFD700" : idx === 1 ? "#C0C0C0" : idx === 2 ? "#CD7F32" : "#7dbf96", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", zIndex: 1, boxShadow: "0 2px 5px rgba(0,0,0,0.1)" });
const LIKE_ACTIVE_BORDER = "1px solid #ffb7ce";
const LIKE_IDLE_BORDER = "1px solid #dfe9e3";
const LIKE_ACTIVE_BACKGROUND = "linear-gradient(135deg, #ffe8f1 0%, #ffd9e9 100%)";
const LIKE_IDLE_BACKGROUND = "linear-gradient(135deg, #f9fbfa 0%, #f2f7f4 100%)";
const LIKE_ACTIVE_TEXT = "#ff2f75";
const LIKE_IDLE_TEXT = "#7b8882";
const LIKE_ACTIVE_SHADOW = "0 8px 18px rgba(255, 92, 150, 0.24)";
const LIKE_IDLE_SHADOW = "0 2px 6px rgba(90, 167, 123, 0.08)";

function getLikeButtonBaseStyle(liked, padding, minWidth, fontSize) {
  return {
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    minWidth,
    padding,
    borderRadius: "999px",
    border: liked ? LIKE_ACTIVE_BORDER : LIKE_IDLE_BORDER,
    background: liked ? LIKE_ACTIVE_BACKGROUND : LIKE_IDLE_BACKGROUND,
    color: liked ? LIKE_ACTIVE_TEXT : LIKE_IDLE_TEXT,
    fontSize,
    fontWeight: 700,
    lineHeight: 1,
    userSelect: "none",
    fontVariantNumeric: "tabular-nums",
    transition: "all 0.2s ease",
    boxShadow: liked ? LIKE_ACTIVE_SHADOW : LIKE_IDLE_SHADOW,
    transform: liked ? "translateY(-1px)" : "translateY(0)",
  };
}

export const placeLikeBtnStyle = (liked) => getLikeButtonBaseStyle(liked, "6px 14px", "72px", "13px");
export const fullPageOverlayStyle = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100%", background: "#f8fbf9", zIndex: 2000, display: "flex", flexDirection: "column" };
export const navHeaderStyle = { background: "white", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", zIndex: 2100 };
export const sortContainerStyle = { background: "white", padding: "8px 20px", display: "flex", gap: "15px", borderBottom: "1px solid #eee" };
export const sortBtnStyle = (active) => ({ border: "none", background: "transparent", fontSize: "12px", color: active ? "#5aa77b" : "#999", fontWeight: active ? "bold" : "normal", cursor: "pointer", padding: "4px 0", borderBottom: active ? "2px solid #5aa77b" : "2px solid transparent" });
export const scrollContentStyle = { flex: 1, overflowY: "auto", padding: "20px" };
export const fixedBottomBarStyle = { background: "white", padding: "12px 20px", borderTop: "1px solid #eee", zIndex: 2100, position: "relative", paddingBottom: "calc(12px + env(safe-area-inset-bottom))" };
export const bottomInputContainer = { display: "flex", gap: "12px", alignItems: "center", background: "#f5f5f5", padding: "8px 16px", borderRadius: "25px" };
export const bottomRealInput = { flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "14px" };
export const commentCardStyle = { background: "white", padding: "16px", borderRadius: "16px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" };
export const commentAvatarStyle = { width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" };
export const commentImgStyle = { width: "160px", borderRadius: "10px", marginTop: "10px", display: "block", cursor: "zoom-in" };
export const likeBtnStyle = (liked) => getLikeButtonBaseStyle(liked, "4px 11px", "58px", "12px");
export const feedbackItemStyle = { padding: "10px", borderBottom: "1px solid #eee", background: "#f9fcf9", borderRadius: "10px", marginBottom: "10px" };
export const zoomOverlayStyle = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "black", zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center" };
export const zoomedImgStyle = { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" };
export const closeZoomStyle = { position: "absolute", top: "30px", right: "30px", color: "white", fontSize: "50px", zIndex: 5100, cursor: "pointer" };
export const swipeContainerStyle = { display: "flex", overflowX: "auto", overflowY: "hidden", width: "100vw", height: "100vh", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", touchAction: "pan-x", overscrollBehaviorX: "contain" };
export const swipeItemStyle = { flexShrink: 0, width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", scrollSnapAlign: "start" };
export const modalOverlayStyle = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.7)", zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" };
export const modalContentStyle = { background: "white", width: "100%", maxWidth: "500px", borderRadius: "24px", padding: "24px" };
export const avatarStyle = { width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover", border: "2px solid #5aa77b", cursor: "pointer" };
export const listThumbStyle = { width: "70px", height: "70px", borderRadius: "12px", objectFit: "cover", cursor: "zoom-in" };
export const categoryTagStyle = { fontSize: "10px", color: "#5aa77b", background: "#e8f5eb", padding: "2px 6px", borderRadius: "4px" };
export const photoTagStyle = { fontSize: "10px", color: "#ff9800", background: "#fff3e0", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", border: "1px solid #ffe0b2" };
export const btnMainStyle = { width: "100%", padding: "14px", background: "#5aa77b", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" };
export const btnSmallStyle = (marked) => ({ padding: "8px 12px", borderRadius: "8px", border: "none", background: marked ? "#df6b76" : "#e8f5eb", color: marked ? "white" : "#2e6a4a", fontSize: "12px", cursor: "pointer" });
export const btnDetailStyle = { padding: "8px 12px", borderRadius: "8px", border: "none", background: "#e8f5eb", color: "#2e6a4a", fontSize: "12px", cursor: "pointer" };
export const btnNavStyle = { padding: "8px 12px", borderRadius: "8px", border: "none", background: "#5aa77b", color: "white", fontSize: "12px", cursor: "pointer" };
export const btnSendStyle = { background: "#5aa77b", color: "white", border: "none", borderRadius: "20px", padding: "6px 16px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" };
export const btnCancelStyle = { flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #ddd", background: "white" };
export const btnIconStyle = { padding: "12px", borderRadius: "12px", border: "1px solid #ddd", background: "white", cursor: "pointer", fontSize: "18px" };
export const textAreaStyle = { width: "100%", height: "120px", borderRadius: "12px", padding: "12px", border: "1px solid #eee", outline: "none" };
export const floatBtnStyle = { position: "absolute", right: "15px", bottom: "15px", width: "45px", height: "45px", borderRadius: "50%", background: "white", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", fontSize: "20px", zIndex: 20 };
export const inputStyle = { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "10px", border: "1px solid #ddd", boxSizing: "border-box" };
export const btnCodeStyle = { background: "#7dbf96", color: "white", border: "none", borderRadius: "10px", width: "70px", fontSize: "12px" };
export const horizontalScrollWrapper = { display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "15px" };
export const albumThumbStyle = { height: "150px", borderRadius: "12px", flexShrink: 0 };
export const linkStyle = { color: "#5aa77b", cursor: "pointer", textDecoration: "underline" };
export const profilePageStyle = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100%", background: "#f8fbf9", zIndex: 3000, overflowY: "auto" };
export const profileInfoCard = { background: "white", borderRadius: "24px", padding: "40px 20px", textAlign: "center" };
export const profileAvatarLarge = { width: "80px", height: "80px", borderRadius: "50%", border: "3px solid #5aa77b" };
export const menuItemStyle = { background: "white", padding: "18px 20px", borderRadius: "16px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" };
export const badgeStyle = { background: "#ff4d4f", color: "white", padding: "2px 8px", borderRadius: "10px", fontSize: "10px" };
export const btnLogOutStyle = { width: "100%", marginTop: "20px", padding: "15px", borderRadius: "15px", border: "1px solid #ff4d4f", color: "#ff4d4f", background: "none", fontWeight: "bold" };
