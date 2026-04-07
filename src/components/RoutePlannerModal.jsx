import { useEffect, useMemo, useState } from "react";
import { btnCancelStyle, btnMainStyle, modalContentStyle, modalOverlayStyle } from "../styles/appStyles";

const MAX_ROUTE_PLACES = 5;
const START_MODE_CURRENT = "current";
const START_MODE_CUSTOM = "custom";
const BAIDU_DIRECTION_BASE_URL = "https://api.map.baidu.com/direction";
const BAIDU_REGION = "海口";
const MODAL_LIST_MAX_HEIGHT = "42vh";

function isValidCoordinate(value) {
  return Number.isFinite(Number(value));
}

function toCoordinateText(lat, lng) {
  return `${Number(lat)},${Number(lng)}`;
}

function buildDirectionUrl({ origin, destination, waypoints }) {
  const params = new URLSearchParams({
    origin,
    destination,
    mode: "driving",
    region: BAIDU_REGION,
    output: "html",
  });
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  return `${BAIDU_DIRECTION_BASE_URL}?${params.toString()}`;
}

function mapSelectedPlaces(favoritePlaces, selectedIds) {
  const idSet = new Set(selectedIds);
  const selected = favoritePlaces.filter((place) => idSet.has(String(place.id)));
  selected.sort((a, b) => selectedIds.indexOf(String(a.id)) - selectedIds.indexOf(String(b.id)));
  return selected;
}

function getTypeLabel(type) {
  if (type === "food") return "美食";
  if (type === "view") return "景点";
  if (type === "cafe") return "咖啡";
  if (type === "shop") return "商圈";
  if (type === "recommend") return "推荐";
  return "地点";
}

function RoutePlannerHeader({ onClose }) {
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

function RouteStartSection({ startMode, setStartMode, hasCurrentLocation, customOrigin, setCustomOrigin }) {
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
        <input
          placeholder="例如：海口东站"
          value={customOrigin}
          onChange={(event) => setCustomOrigin(event.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1px solid #dbe7de", outline: "none", boxSizing: "border-box" }}
        />
      )}
    </>
  );
}

function FavoritePlacesSection({ favoritePlaces, selectedIds, onTogglePlace }) {
  return (
    <div style={{ border: "1px solid #e6f0ea", borderRadius: "20px", overflow: "hidden", background: "#f9fcfa" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #e8f2ec", fontSize: "12px", color: "#658275", fontWeight: 700 }}>可规划收藏点 ({favoritePlaces.length})</div>
      <div style={{ maxHeight: MODAL_LIST_MAX_HEIGHT, overflowY: "auto", padding: "8px" }}>
        {favoritePlaces.length === 0 && <div style={{ padding: "14px 10px", fontSize: "13px", color: "#7f8f86" }}>你当前没有可用于路线规划的收藏点</div>}
        {favoritePlaces.map((place) => {
          const placeId = String(place.id);
          const selectedIndex = selectedIds.indexOf(placeId);
          const selectedOrder = selectedIndex >= 0 ? selectedIndex + 1 : null;
          return (
            <div
              key={placeId}
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
        })}
      </div>
    </div>
  );
}

function RouteSummary({ selectedPlaces }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#6f877a" }}>
      <span>已选择 {selectedPlaces.length}/{MAX_ROUTE_PLACES} 个</span>
      <span>{selectedPlaces.length > 0 ? `终点：${selectedPlaces[selectedPlaces.length - 1].name}` : "请先选择景点"}</span>
    </div>
  );
}

function RoutePlannerModal({ visible, onClose, favoritePlaces, userLocation }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [startMode, setStartMode] = useState(START_MODE_CURRENT);
  const [customOrigin, setCustomOrigin] = useState("");

  useEffect(() => {
    if (!visible) return;
    setSelectedIds([]);
    setStartMode(START_MODE_CURRENT);
    setCustomOrigin("");
  }, [visible]);

  const hasCurrentLocation = isValidCoordinate(userLocation?.lat) && isValidCoordinate(userLocation?.lng);
  const selectedPlaces = useMemo(() => mapSelectedPlaces(favoritePlaces, selectedIds), [favoritePlaces, selectedIds]);

  const handleTogglePlace = (placeId) => {
    const normalizedId = String(placeId);
    setSelectedIds((prev) => {
      if (prev.includes(normalizedId)) return prev.filter((id) => id !== normalizedId);
      if (prev.length >= MAX_ROUTE_PLACES) {
        alert(`最多只能选择 ${MAX_ROUTE_PLACES} 个景点`);
        return prev;
      }
      return [...prev, normalizedId];
    });
  };

  const getOriginText = () => {
    if (startMode === START_MODE_CUSTOM) {
      const trimmed = customOrigin.trim();
      if (!trimmed) {
        alert("请先输入起始位置");
        return "";
      }
      return trimmed;
    }
    if (!hasCurrentLocation) {
      console.error("路线规划失败：用户当前位置不可用", userLocation);
      alert("当前位置不可用，请切换为手动输入起点");
      return "";
    }
    return toCoordinateText(userLocation.lat, userLocation.lng);
  };

  const handlePlanRoute = () => {
    if (selectedPlaces.length === 0) {
      alert("请先从收藏中选择至少 1 个景点");
      return;
    }
    const originText = getOriginText();
    if (!originText) return;
    const destination = selectedPlaces[selectedPlaces.length - 1];
    const routeUrl = buildDirectionUrl({
      origin: originText,
      destination: toCoordinateText(destination.lat, destination.lng),
      waypoints: selectedPlaces.slice(0, -1).map((place) => toCoordinateText(place.lat, place.lng)),
    });
    window.open(routeUrl, "_blank");
  };

  if (!visible) return null;

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div
        style={{ ...modalContentStyle, maxWidth: "560px", maxHeight: "82vh", display: "flex", flexDirection: "column", gap: "14px" }}
        onClick={(event) => event.stopPropagation()}
      >
        <RoutePlannerHeader onClose={onClose} />
        <div style={{ fontSize: "12px", color: "#688579", lineHeight: 1.6 }}>仅支持你已收藏且有坐标的景点，最多选择 {MAX_ROUTE_PLACES} 个，按你勾选的顺序规划。</div>
        <RouteStartSection startMode={startMode} setStartMode={setStartMode} hasCurrentLocation={hasCurrentLocation} customOrigin={customOrigin} setCustomOrigin={setCustomOrigin} />
        <FavoritePlacesSection favoritePlaces={favoritePlaces} selectedIds={selectedIds} onTogglePlace={handleTogglePlace} />
        <RouteSummary selectedPlaces={selectedPlaces} />
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose} style={btnCancelStyle}>
            取消
          </button>
          <button onClick={handlePlanRoute} style={btnMainStyle}>
            开始规划
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoutePlannerModal;
