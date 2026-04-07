import { useEffect, useRef } from "react";

export const MAX_ROUTE_PLACES = 5;
export const START_MODE_CURRENT = "current";
export const START_MODE_CUSTOM = "custom";
export const BAIDU_DIRECTION_BASE_URL = "https://api.map.baidu.com/direction";
export const BAIDU_REGION = "海口";
export const ORIGIN_SEARCH_DEBOUNCE_MS = 260;
export const ROUTE_PREVIEW_MAP_CONTAINER_ID = "route-preview-map";
export const ROUTE_PREVIEW_Z_INDEX = 4100;

export function isValidCoordinate(value) {
  return Number.isFinite(Number(value));
}

export function toCoordinateText(lat, lng) {
  return `${Number(lat)},${Number(lng)}`;
}

export function normalizePoi(poi) {
  const lat = Number(poi?.point?.lat);
  const lng = Number(poi?.point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    name: String(poi?.title || "自定义起点"),
    address: String(poi?.address || ""),
    lat,
    lng,
  };
}

export function buildDirectionUrl({ origin, destination, waypoints }) {
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

export function mapSelectedPlaces(favoritePlaces, selectedIds) {
  const idSet = new Set(selectedIds);
  const selected = favoritePlaces.filter((place) => idSet.has(String(place.id)));
  selected.sort((a, b) => selectedIds.indexOf(String(a.id)) - selectedIds.indexOf(String(b.id)));
  return selected;
}

export function getTypeLabel(type) {
  if (type === "food") return "美食";
  if (type === "view") return "景点";
  if (type === "cafe") return "咖啡";
  if (type === "shop") return "商圈";
  if (type === "recommend") return "推荐";
  return "地点";
}

export function buildRelationNodes(originPoint, selectedPlaces) {
  return [{ name: originPoint.name || "起点", type: "起点" }, ...selectedPlaces.map((place) => ({ name: place.name, type: getTypeLabel(place.type) }))];
}

export function useOriginSuggestions({ enabled, keyword, setSuggestions, setSearchMessage }) {
  const searchSeqRef = useRef(0);

  useEffect(() => {
    if (!enabled) return resetSearchState(setSuggestions, setSearchMessage);
    const text = keyword.trim();
    if (text.length < 2) return promptInput(setSuggestions, setSearchMessage);

    const BMap = window.BMapGL || window.BMap;
    if (!BMap) return handleSdkMissing(setSuggestions, setSearchMessage);

    setSearchMessage("正在搜索...");
    const currentSeq = ++searchSeqRef.current;
    const timer = setTimeout(() => runPoiSearch(BMap, text, currentSeq, searchSeqRef, setSuggestions, setSearchMessage), ORIGIN_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [enabled, keyword, setSuggestions, setSearchMessage]);
}

function resetSearchState(setSuggestions, setSearchMessage) {
  setSuggestions([]);
  setSearchMessage("");
}

function promptInput(setSuggestions, setSearchMessage) {
  setSuggestions([]);
  setSearchMessage("请输入至少 2 个字搜索起点");
}

function handleSdkMissing(setSuggestions, setSearchMessage) {
  console.error("起点搜索失败：百度地图 SDK 未加载");
  setSuggestions([]);
  setSearchMessage("地图搜索不可用，请稍后重试");
}

function runPoiSearch(BMap, text, currentSeq, searchSeqRef, setSuggestions, setSearchMessage) {
  const local = new BMap.LocalSearch("海口市", {
    onSearchComplete: (results) => handleSearchResult(local, results, currentSeq, searchSeqRef, setSuggestions, setSearchMessage),
  });
  local.search(text);
}

function handleSearchResult(local, results, currentSeq, searchSeqRef, setSuggestions, setSearchMessage) {
  if (searchSeqRef.current !== currentSeq) return;
  if (local.getStatus() !== 0) return updateSuggestions([], setSuggestions, setSearchMessage);
  const nextSuggestions = [];
  for (let i = 0; i < results.getCurrentNumPois(); i += 1) nextSuggestions.push(results.getPoi(i));
  updateSuggestions(nextSuggestions, setSuggestions, setSearchMessage);
}

function updateSuggestions(nextSuggestions, setSuggestions, setSearchMessage) {
  setSuggestions(nextSuggestions);
  setSearchMessage(nextSuggestions.length > 0 ? `找到 ${nextSuggestions.length} 个候选位置，请点选确认` : "未找到相关位置，请换个关键词");
}
