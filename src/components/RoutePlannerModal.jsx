import { useEffect, useMemo, useState } from "react";
import { modalContentStyle, modalOverlayStyle } from "../styles/appStyles";
import {
  buildDirectionUrl,
  isValidCoordinate,
  mapSelectedPlaces,
  MAX_ROUTE_PLACES,
  normalizePoi,
  START_MODE_CURRENT,
  START_MODE_CUSTOM,
  toCoordinateText,
  useOriginSuggestions,
} from "../logic/routePlannerUtils";
import { FavoritePlacesSection, RoutePlannerHeader, RouteStartSection, RouteSummary } from "./route-planner/RoutePlannerSections";
import RoutePreviewPage from "./route-planner/RoutePreviewPage";

const PRIMARY_GREEN = "#5aa77b";
const HINT_BAR_STYLE = {
  fontSize: "12px",
  color: "#3e6b52",
  lineHeight: 1.6,
  background: "#f2fbf6",
  border: "1px solid #dceee3",
  borderRadius: "12px",
  padding: "10px 14px",
};
const CANCEL_BUTTON_STYLE = {
  flex: "0 0 auto",
  padding: "12px 28px",
  borderRadius: "14px",
  border: "1px solid #dfe8e2",
  background: "#fff",
  color: "#5b6e65",
  fontWeight: 600,
  fontSize: "14px",
  cursor: "pointer",
};
const PLAN_BUTTON_STYLE = {
  flex: 1,
  padding: "14px",
  borderRadius: "14px",
  border: "none",
  background: PRIMARY_GREEN,
  color: "white",
  fontWeight: 700,
  fontSize: "15px",
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(90,167,123,0.28)",
};

function getOriginData({ startMode, hasCurrentLocation, userLocation, customOriginPoint }) {
  if (startMode === START_MODE_CURRENT) {
    if (!hasCurrentLocation) {
      console.error("路线规划失败：用户当前位置不可用", userLocation);
      alert("当前位置不可用，请切换为手动输入起点");
      return null;
    }
    return {
      originText: toCoordinateText(userLocation.lat, userLocation.lng),
      originPoint: { name: "我的位置", lat: Number(userLocation.lat), lng: Number(userLocation.lng) },
    };
  }
  if (!customOriginPoint) {
    alert("请先搜索并点选一个候选起点");
    return null;
  }
  return {
    originText: toCoordinateText(customOriginPoint.lat, customOriginPoint.lng),
    originPoint: customOriginPoint,
  };
}

function buildPreviewRoute(originData, selectedPlaces) {
  const destination = selectedPlaces[selectedPlaces.length - 1];
  const routeUrl = buildDirectionUrl({
    origin: originData.originText,
    destination: toCoordinateText(destination.lat, destination.lng),
    waypoints: selectedPlaces.slice(0, -1).map((place) => toCoordinateText(place.lat, place.lng)),
  });
  return { routeUrl, originPoint: originData.originPoint, selectedPlaces };
}

function usePlannerState(visible) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [startMode, setStartMode] = useState(START_MODE_CURRENT);
  const [customOriginText, setCustomOriginText] = useState("");
  const [customOriginPoint, setCustomOriginPoint] = useState(null);
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [originSearchMessage, setOriginSearchMessage] = useState("");
  const [previewRoute, setPreviewRoute] = useState(null);
  useEffect(() => {
    if (!visible) return;
    setSelectedIds([]);
    setStartMode(START_MODE_CURRENT);
    setCustomOriginText("");
    setCustomOriginPoint(null);
    setOriginSuggestions([]);
    setOriginSearchMessage("");
    setPreviewRoute(null);
  }, [visible]);
  return {
    selectedIds,
    setSelectedIds,
    startMode,
    setStartMode,
    customOriginText,
    setCustomOriginText,
    customOriginPoint,
    setCustomOriginPoint,
    originSuggestions,
    setOriginSuggestions,
    originSearchMessage,
    setOriginSearchMessage,
    previewRoute,
    setPreviewRoute,
  };
}

function usePlannerActions({
  selectedPlaces,
  startMode,
  hasCurrentLocation,
  userLocation,
  customOriginPoint,
  setSelectedIds,
  setCustomOriginPoint,
  setCustomOriginText,
  setOriginSuggestions,
  setOriginSearchMessage,
  setPreviewRoute,
}) {
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

  const handleSelectOriginSuggestion = (poi) => {
    const normalized = normalizePoi(poi);
    if (!normalized) {
      console.error("起点选择失败：候选位置坐标无效", poi);
      alert("该候选位置坐标异常，请换一个");
      return;
    }
    setCustomOriginPoint(normalized);
    setCustomOriginText(normalized.name);
    setOriginSuggestions([]);
    setOriginSearchMessage("已确认起点位置");
  };

  const handlePlanRoute = () => {
    if (selectedPlaces.length === 0) {
      alert("请先从收藏中选择至少 1 个景点");
      return;
    }
    const originData = getOriginData({ startMode, hasCurrentLocation, userLocation, customOriginPoint });
    if (!originData) return;
    setPreviewRoute(buildPreviewRoute(originData, selectedPlaces));
  };
  return { handleTogglePlace, handleSelectOriginSuggestion, handlePlanRoute };
}

function useRoutePlannerController({ visible, favoritePlaces, userLocation }) {
  const state = usePlannerState(visible);
  useOriginSuggestions({
    enabled: visible && state.startMode === START_MODE_CUSTOM,
    keyword: state.customOriginText,
    setSuggestions: state.setOriginSuggestions,
    setSearchMessage: state.setOriginSearchMessage,
  });
  const hasCurrentLocation = isValidCoordinate(userLocation?.lat) && isValidCoordinate(userLocation?.lng);
  const selectedPlaces = useMemo(() => mapSelectedPlaces(favoritePlaces, state.selectedIds), [favoritePlaces, state.selectedIds]);
  const actions = usePlannerActions({
    selectedPlaces,
    startMode: state.startMode,
    hasCurrentLocation,
    userLocation,
    customOriginPoint: state.customOriginPoint,
    setSelectedIds: state.setSelectedIds,
    setCustomOriginPoint: state.setCustomOriginPoint,
    setCustomOriginText: state.setCustomOriginText,
    setOriginSuggestions: state.setOriginSuggestions,
    setOriginSearchMessage: state.setOriginSearchMessage,
    setPreviewRoute: state.setPreviewRoute,
  });
  return {
    selectedIds: state.selectedIds,
    startMode: state.startMode,
    setStartMode: state.setStartMode,
    customOriginText: state.customOriginText,
    setCustomOriginText: state.setCustomOriginText,
    customOriginPoint: state.customOriginPoint,
    setCustomOriginPoint: state.setCustomOriginPoint,
    originSuggestions: state.originSuggestions,
    originSearchMessage: state.originSearchMessage,
    previewRoute: state.previewRoute,
    setPreviewRoute: state.setPreviewRoute,
    hasCurrentLocation,
    selectedPlaces,
    ...actions,
  };
}

function RoutePlannerModal({ visible, onClose, favoritePlaces, userLocation, isMobile }) {
  const controller = useRoutePlannerController({ visible, favoritePlaces, userLocation });
  if (!visible) return null;
  if (controller.previewRoute) return <RoutePreviewPage previewRoute={controller.previewRoute} isMobile={isMobile} onBack={() => controller.setPreviewRoute(null)} onClose={onClose} />;

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={{ ...modalContentStyle, maxWidth: "560px", maxHeight: "82vh", display: "flex", flexDirection: "column", gap: "14px" }} onClick={(event) => event.stopPropagation()}>
        <RoutePlannerHeader onClose={onClose} />
        <div style={HINT_BAR_STYLE}>仅支持你已收藏且有坐标的景点，最多选择 {MAX_ROUTE_PLACES} 个，按你勾选的顺序规划。</div>
        <RouteStartSection
          startMode={controller.startMode}
          setStartMode={controller.setStartMode}
          hasCurrentLocation={controller.hasCurrentLocation}
          customOriginText={controller.customOriginText}
          onCustomOriginChange={(nextText) => {
            controller.setCustomOriginText(nextText);
            controller.setCustomOriginPoint(null);
          }}
          suggestions={controller.originSuggestions}
          onPickSuggestion={controller.handleSelectOriginSuggestion}
          customOriginPoint={controller.customOriginPoint}
          searchMessage={controller.originSearchMessage}
        />
        <FavoritePlacesSection favoritePlaces={favoritePlaces} selectedIds={controller.selectedIds} onTogglePlace={controller.handleTogglePlace} />
        <RouteSummary selectedPlaces={controller.selectedPlaces} />
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose} style={CANCEL_BUTTON_STYLE}>
            取消
          </button>
          <button onClick={controller.handlePlanRoute} style={PLAN_BUTTON_STYLE}>
            开始规划
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoutePlannerModal;
