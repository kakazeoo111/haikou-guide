import { suggestionItemStyle, suggestionListStyle } from "../../styles/appStyles";
import { getTypeLabel, MAX_ROUTE_PLACES, START_MODE_CURRENT, START_MODE_CUSTOM } from "../../logic/routePlannerUtils";

const MODAL_LIST_MAX_HEIGHT = "38vh";
const PRIMARY_GREEN = "#5aa77b";
const PRIMARY_DARK_GREEN = "#2e6a4a";
const LOCATION_OK_BG = "#ebf8f1";
const LOCATION_OK_BORDER = "#d2ebde";
const LOCATION_FAIL_BG = "#fdeeef";
const LOCATION_FAIL_BORDER = "#f9d3d7";
const LOCATION_FAIL_COLOR = "#d94f5c";
const FAVORITES_CARD_STYLE = {
  border: "1px solid #e6f0ea",
  borderRadius: "20px",
  overflow: "hidden",
  background: "#f9fcfa",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
};
const FAVORITES_LIST_STYLE = {
  maxHeight: MODAL_LIST_MAX_HEIGHT,
  minHeight: 0,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  overscrollBehavior: "contain",
  touchAction: "pan-y",
  padding: "10px",
};

export function RoutePlannerHeader({ onClose }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
      <h2 style={{ margin: 0, color: PRIMARY_DARK_GREEN, fontSize: "20px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "22px" }}>📍</span>
        <span>规划路线</span>
      </h2>
      <button
        onClick={onClose}
        style={{ border: "none", background: "transparent", fontSize: "24px", lineHeight: 1, cursor: "pointer", color: "#9fb2a8", padding: "4px 8px" }}
        aria-label="close-planner"
      >
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
        padding: "8px 16px",
        borderRadius: "999px",
        border: active ? `1px solid ${PRIMARY_GREEN}` : "1px solid #d4e7dc",
        background: active ? PRIMARY_GREEN : "#f2f8f4",
        color: active ? "#fff" : "#3e5f4d",
        cursor: "pointer",
        fontWeight: active ? 700 : 500,
        fontSize: "13px",
        boxShadow: active ? "0 6px 14px rgba(90,167,123,0.3)" : "none",
        transition: "all 0.2s ease",
      }}
    >
      {children}
    </button>
  );
}

function LocationStatusPill({ ok }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 700,
        background: ok ? LOCATION_OK_BG : LOCATION_FAIL_BG,
        color: ok ? PRIMARY_DARK_GREEN : LOCATION_FAIL_COLOR,
        border: `1px solid ${ok ? LOCATION_OK_BORDER : LOCATION_FAIL_BORDER}`,
      }}
    >
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: ok ? PRIMARY_GREEN : LOCATION_FAIL_COLOR }} />
      {ok ? "定位可用" : "定位不可用"}
    </span>
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
        {startMode === START_MODE_CURRENT && <LocationStatusPill ok={hasCurrentLocation} />}
      </div>

      {startMode === START_MODE_CUSTOM && (
        <div style={{ position: "relative" }}>
          <input
            placeholder="搜索起点，例如：海口东站"
            value={customOriginText}
            onChange={(event) => onCustomOriginChange(event.target.value)}
            style={{ width: "100%", padding: "12px 14px", borderRadius: "14px", border: "1px solid #dbe7de", outline: "none", boxSizing: "border-box", background: "#f9fcfa", fontSize: "14px" }}
          />
          <OriginSuggestionList suggestions={suggestions} onPick={onPickSuggestion} />
          <div style={{ marginTop: "8px", fontSize: "11px", color: customOriginPoint ? PRIMARY_GREEN : "#7a9186" }}>
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
  const isSelected = Boolean(selectedOrder);

  return (
    <div
      onClick={() => onTogglePlace(placeId)}
      style={{
        display: "flex",
        gap: "12px",
        alignItems: "center",
        padding: "12px",
        borderRadius: "14px",
        marginBottom: "8px",
        cursor: "pointer",
        background: isSelected ? "linear-gradient(90deg, #eaf7ef, #f5fcf8)" : "#fff",
        border: isSelected ? "1px solid #b8dfc6" : "1px solid #e8f0eb",
        borderLeft: isSelected ? `3px solid ${PRIMARY_GREEN}` : "1px solid #e8f0eb",
        boxShadow: isSelected ? "0 6px 14px rgba(90,167,123,0.12)" : "none",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          width: "26px",
          height: "26px",
          borderRadius: "50%",
          background: isSelected ? PRIMARY_GREEN : "#edf4f0",
          color: isSelected ? "#fff" : "#8aa296",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: 700,
          flexShrink: 0,
          boxShadow: isSelected ? "0 3px 8px rgba(90,167,123,0.35)" : "none",
        }}
      >
        {selectedOrder || "○"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", color: "#33473c", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{place.name}</div>
        <div style={{ fontSize: "11px", color: "#7d9086", marginTop: "3px" }}>{getTypeLabel(place.type)}</div>
      </div>
    </div>
  );
}

export function FavoritePlacesSection({ favoritePlaces, selectedIds, onTogglePlace }) {
  return (
    <div style={FAVORITES_CARD_STYLE}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8f2ec", fontSize: "12px", color: PRIMARY_DARK_GREEN, fontWeight: 700, letterSpacing: "0.3px", flexShrink: 0 }}>
        可规划收藏点 ({favoritePlaces.length})
      </div>
      <div style={FAVORITES_LIST_STYLE}>
        {favoritePlaces.length === 0 && <div style={{ padding: "14px 10px", fontSize: "13px", color: "#7f8f86", textAlign: "center" }}>你当前没有可用于路线规划的收藏点</div>}
        {favoritePlaces.map((place) => (
          <FavoritePlaceRow key={String(place.id)} place={place} selectedIds={selectedIds} onTogglePlace={onTogglePlace} />
        ))}
      </div>
    </div>
  );
}

export function RouteSummary({ selectedPlaces }) {
  const count = selectedPlaces.length;
  const isEmpty = count === 0;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#6f877a", padding: "0 4px", gap: "12px", flexWrap: "wrap" }}>
      <span>
        已选择 <strong style={{ color: PRIMARY_GREEN, fontSize: "13px" }}>{count}</strong>/{MAX_ROUTE_PLACES} 个
      </span>
      <span style={{ color: isEmpty ? "#a5b5ad" : PRIMARY_DARK_GREEN }}>
        {isEmpty ? "勾选景点开始规划吧" : `终点：${selectedPlaces[count - 1].name}`}
      </span>
    </div>
  );
}
