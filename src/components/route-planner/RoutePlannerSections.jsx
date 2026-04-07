import { suggestionItemStyle, suggestionListStyle } from "../../styles/appStyles";
import { getTypeLabel, MAX_ROUTE_PLACES, START_MODE_CURRENT, START_MODE_CUSTOM } from "../../logic/routePlannerUtils";

const MODAL_LIST_MAX_HEIGHT = "38vh";

export function RoutePlannerHeader({ onClose }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h2 style={{ margin: 0, color: "#2e6a4a", fontSize: "20px" }}>规划路线</h2>
      <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: "24px", lineHeight: 1, cursor: "pointer", color: "#7a8c82" }}>
        ×
      </button>
    </div>
  );
}

function StartModeButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: "999px",
        border: "1px solid #d4e7dc",
        background: active ? "#5aa77b" : "#f2f8f4",
        color: active ? "#fff" : "#3e5f4d",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function OriginSuggestionList({ suggestions, onPick }) {
  if (suggestions.length === 0) return null;
  return (
    <div style={{ ...suggestionListStyle, top: "44px", zIndex: 4200 }}>
      {suggestions.map((poi, idx) => (
        <div key={`${poi.title}-${idx}`} style={suggestionItemStyle} onClick={() => onPick(poi)}>
          <div style={{ fontWeight: 700, fontSize: "13px", color: "#32463a" }}>{poi.title}</div>
          <div style={{ fontSize: "11px", color: "#778c82", marginTop: "2px" }}>{poi.address || "海口市"}</div>
        </div>
      ))}
    </div>
  );
}

export function RouteStartSection({
  startMode,
  setStartMode,
  hasCurrentLocation,
  customOriginText,
  onCustomOriginChange,
  suggestions,
  onPickSuggestion,
  customOriginPoint,
  searchMessage,
}) {
  return (
    <>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <StartModeButton active={startMode === START_MODE_CURRENT} onClick={() => setStartMode(START_MODE_CURRENT)}>
          当前位置
        </StartModeButton>
        <StartModeButton active={startMode === START_MODE_CUSTOM} onClick={() => setStartMode(START_MODE_CUSTOM)}>
          手动输入起点
        </StartModeButton>
        {startMode === START_MODE_CURRENT && <span style={{ fontSize: "12px", color: hasCurrentLocation ? "#5aa77b" : "#d94f5c" }}>{hasCurrentLocation ? "定位可用" : "定位不可用"}</span>}
      </div>

      {startMode === START_MODE_CUSTOM && (
        <div style={{ position: "relative" }}>
          <input
            placeholder="搜索起点（如：海口东站）"
            value={customOriginText}
            onChange={(event) => onCustomOriginChange(event.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1px solid #dbe7de", outline: "none", boxSizing: "border-box" }}
          />
          <OriginSuggestionList suggestions={suggestions} onPick={onPickSuggestion} />
          <div style={{ marginTop: "8px", fontSize: "11px", color: customOriginPoint ? "#5aa77b" : "#7a9186" }}>
            {customOriginPoint ? `已确认起点：${customOriginPoint.name}${customOriginPoint.address ? ` · ${customOriginPoint.address}` : ""}` : searchMessage}
          </div>
        </div>
      )}
    </>
  );
}

function FavoritePlaceRow({ place, selectedIds, onTogglePlace }) {
  const placeId = String(place.id);
  const selectedIndex = selectedIds.indexOf(placeId);
  const selectedOrder = selectedIndex >= 0 ? selectedIndex + 1 : null;
  return (
    <div
      onClick={() => onTogglePlace(placeId)}
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "center",
        padding: "10px",
        borderRadius: "14px",
        marginBottom: "8px",
        cursor: "pointer",
        background: selectedOrder ? "#eaf7ef" : "#fff",
        border: selectedOrder ? "1px solid #b8dfc6" : "1px solid #e8f0eb",
      }}
    >
      <div
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: selectedOrder ? "#5aa77b" : "#edf4f0",
          color: selectedOrder ? "#fff" : "#8aa296",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {selectedOrder || "○"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", color: "#33473c", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{place.name}</div>
        <div style={{ fontSize: "11px", color: "#7d9086", marginTop: "2px" }}>{getTypeLabel(place.type)}</div>
      </div>
    </div>
  );
}

export function FavoritePlacesSection({ favoritePlaces, selectedIds, onTogglePlace }) {
  return (
    <div style={{ border: "1px solid #e6f0ea", borderRadius: "20px", overflow: "hidden", background: "#f9fcfa" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #e8f2ec", fontSize: "12px", color: "#658275", fontWeight: 700 }}>可规划收藏点 ({favoritePlaces.length})</div>
      <div style={{ maxHeight: MODAL_LIST_MAX_HEIGHT, overflowY: "auto", padding: "8px" }}>
        {favoritePlaces.length === 0 && <div style={{ padding: "14px 10px", fontSize: "13px", color: "#7f8f86" }}>你当前没有可用于路线规划的收藏点</div>}
        {favoritePlaces.map((place) => (
          <FavoritePlaceRow key={String(place.id)} place={place} selectedIds={selectedIds} onTogglePlace={onTogglePlace} />
        ))}
      </div>
    </div>
  );
}

export function RouteSummary({ selectedPlaces }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#6f877a" }}>
      <span>已选择 {selectedPlaces.length}/{MAX_ROUTE_PLACES} 个</span>
      <span>{selectedPlaces.length > 0 ? `终点：${selectedPlaces[selectedPlaces.length - 1].name}` : "请先选择景点"}</span>
    </div>
  );
}
