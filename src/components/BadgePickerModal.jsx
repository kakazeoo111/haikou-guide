const pickerOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(6,14,10,0.55)",
  zIndex: 4000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "18px",
  boxSizing: "border-box",
};

const pickerPanelStyle = {
  width: "100%",
  maxWidth: "560px",
  maxHeight: "78vh",
  overflowY: "auto",
  background: "linear-gradient(180deg, #ffffff 0%, #f4fbf6 100%)",
  borderRadius: "24px",
  border: "1px solid #dff1e6",
  boxShadow: "0 24px 48px rgba(34,72,55,0.22)",
  padding: "18px",
};

function getCardStyle(item, activeBadgeTitle) {
  const isActive = item.name === activeBadgeTitle;
  const activeGlow = isActive ? "0 10px 24px rgba(90,167,123,0.24)" : "none";
  const activeBorder = isActive ? "2px solid #5aa77b" : "1px solid #e5eee8";
  return {
    borderRadius: "16px",
    padding: "12px",
    border: activeBorder,
    boxShadow: activeGlow,
    background: item.owned ? "linear-gradient(135deg, #f3fff8, #edfff5)" : "#f6f7f6",
    opacity: item.owned ? 1 : 0.65,
    cursor: item.owned ? "pointer" : "not-allowed",
    transition: "all 0.2s ease",
  };
}

function getBadgeProgress(item) {
  if (item?.progress?.text) {
    const rawPercent = Number(item?.progress?.percent || 0);
    const percent = item.owned ? 100 : Math.max(0, Math.min(100, Number.isFinite(rawPercent) ? rawPercent : 0));
    return { text: item.progress.text, percent };
  }
  if (item.owned) return { text: "已达成，随时切换佩戴", percent: 100 };
  const rawPercent = Number(item?.progress?.percent || 0);
  const percent = Math.max(0, Math.min(100, Number.isFinite(rawPercent) ? rawPercent : 0));
  return { text: item?.progress?.text || "继续冲刺，马上解锁", percent };
}

function BadgeCard({ item, activeBadgeTitle, onSelect }) {
  const progress = getBadgeProgress(item);
  return (
    <div style={getCardStyle(item, activeBadgeTitle)} onClick={() => item.owned && onSelect(item.name)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontSize: "18px" }}>{item.icon || "🏅"}</span>
        <span style={{ fontSize: "11px", color: item.owned ? "#2e6a4a" : "#9aa7a0", fontWeight: 700 }}>{item.owned ? "已拥有" : "未解锁"}</span>
      </div>
      <div style={{ fontSize: "14px", color: "#1f3a2d", fontWeight: 700 }}>{item.name}</div>
      <div style={{ fontSize: "12px", color: "#4f6b5e", marginTop: "4px" }}>{item.mood || "继续探索解锁更多称号"}</div>
      <div style={{ fontSize: "11px", color: "#7a8f84", marginTop: "4px" }}>{item.ruleText || ""}</div>
      <div style={{ marginTop: "8px" }}>
        <div style={{ fontSize: "11px", color: "#3f5f51", fontWeight: 700 }}>{progress.text}</div>
        <div style={{ marginTop: "5px", width: "100%", height: "6px", borderRadius: "999px", background: "rgba(153,177,165,0.25)", overflow: "hidden" }}>
          <div
            style={{
              width: `${progress.percent}%`,
              height: "100%",
              borderRadius: "999px",
              background: "linear-gradient(90deg, #5aa77b 0%, #39b8a3 52%, #52c9ff 100%)",
              boxShadow: "0 0 10px rgba(57,184,163,0.45)",
              transition: "width 0.25s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyOwnedHint() {
  return (
    <div style={{ marginTop: "8px", borderRadius: "14px", padding: "10px 12px", background: "#f8faf8", color: "#7b8f84", fontSize: "12px", border: "1px dashed #d7e5dc" }}>
      当前还没有可切换称号，继续发评论、发推荐或收获点赞就能解锁。
    </div>
  );
}

function BadgePickerModal({ visible, badgeSummary, activeBadgeTitle, onClose, onSelect }) {
  if (!visible) return null;
  const catalog = badgeSummary?.badgeCatalog || [];
  const ownedBadges = catalog.filter((item) => item.owned);

  return (
    <div style={pickerOverlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={pickerPanelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#134834" }}>称号衣柜</div>
            <div style={{ marginTop: "4px", color: "#6b8477", fontSize: "12px" }}>已解锁 {ownedBadges.length} / {catalog.length}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "#eef5f1", color: "#2e6a4a", width: "34px", height: "34px", borderRadius: "999px", fontSize: "20px", cursor: "pointer" }}>
            ×
          </button>
        </div>

        <div style={{ marginTop: "12px", borderRadius: "14px", padding: "10px 12px", background: "linear-gradient(135deg, #e9fff0, #eff8ff)", border: "1px solid #dff0e7" }}>
          <div style={{ fontSize: "12px", color: "#6f8579" }}>当前佩戴</div>
          <div style={{ marginTop: "4px", fontSize: "16px", color: "#1f5f45", fontWeight: 800 }}>{activeBadgeTitle || "未解锁称号"}</div>
        </div>

        {ownedBadges.length === 0 && <EmptyOwnedHint />}

        <div style={{ marginTop: "12px", display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fill,minmax(145px,1fr))" }}>
          {catalog.map((item) => (
            <BadgeCard key={item.name} item={item} activeBadgeTitle={activeBadgeTitle} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default BadgePickerModal;
