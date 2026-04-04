import { useEffect, useRef, useState } from "react";

const DEFAULT_CENTER = { lng: 110.331398, lat: 20.031957 };
const MAP_CONTAINER_ID = "main-baidu-map";
const MAP_ZOOM_LEVEL = 13;
const USER_LABEL_OFFSET_X = 20;
const USER_LABEL_OFFSET_Y = -10;
const PLACE_LABEL_OFFSET_X = 18;
const PLACE_LABEL_OFFSET_Y = -12;
const FALLBACK_DESKTOP = "电脑端已关闭地图渲染，请使用手机端查看地图。";
const FALLBACK_SDK = "地图加载失败：未检测到百度地图 SDK，请检查网络后重试。";
const FALLBACK_INIT = "地图初始化失败，请刷新后重试。";
const FALLBACK_RENDER = "地图渲染失败，请刷新后重试。";
const mapStyle = { width: "100%", height: "100%" };
const mapFallbackWrapStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  boxSizing: "border-box",
  background: "#eef4ef",
};
const mapFallbackTextStyle = {
  color: "#2e6a4a",
  fontSize: "13px",
  lineHeight: 1.6,
  textAlign: "center",
};

function toPoint(BMapGL, location) {
  return new BMapGL.Point(location.lng, location.lat);
}

function clearUserMarker(map, userMarkerRef) {
  if (!userMarkerRef.current) return;
  map.removeOverlay(userMarkerRef.current);
  userMarkerRef.current = null;
}

function drawUserMarker(map, BMapGL, userLocation, targetPlaces, userMarkerRef) {
  if (!userLocation?.lng) return;
  const myPoint = toPoint(BMapGL, userLocation);
  const myMarker = new BMapGL.Marker(myPoint);
  const label = new BMapGL.Label("🚶 我的位置", {
    offset: new BMapGL.Size(USER_LABEL_OFFSET_X, USER_LABEL_OFFSET_Y),
  });

  label.setStyle({
    color: "#2e6a4a",
    fontSize: "12px",
    fontWeight: "bold",
    backgroundColor: "white",
    border: "1px solid #5aa77b",
    borderRadius: "4px",
    padding: "2px 5px",
  });

  myMarker.setLabel(label);
  map.addOverlay(myMarker);
  userMarkerRef.current = myMarker;
  if (targetPlaces.length === 0) map.panTo(myPoint);
}

function clearPlaceMarkers(map, markersRef) {
  markersRef.current.forEach((marker) => map.removeOverlay(marker));
  markersRef.current = [];
}

function drawPlaceMarkers(map, BMapGL, targetPlaces, markersRef) {
  targetPlaces.forEach((place) => {
    const point = toPoint(BMapGL, { lng: place.lng, lat: place.lat });
    const marker = new BMapGL.Marker(point);
    const placeLabel = new BMapGL.Label(place.name, {
      offset: new BMapGL.Size(PLACE_LABEL_OFFSET_X, PLACE_LABEL_OFFSET_Y),
    });

    placeLabel.setStyle({
      color: "#d94f5c",
      fontSize: "11px",
      backgroundColor: "rgba(255, 255, 255, 0.85)",
      border: "1px solid #d94f5c",
      borderRadius: "3px",
      padding: "1px 4px",
      whiteSpace: "nowrap",
      boxShadow: "2px 2px 4px rgba(0,0,0,0.1)",
    });

    marker.setLabel(placeLabel);
    map.addOverlay(marker);
    markersRef.current.push(marker);
    const info = new BMapGL.InfoWindow(`<b>${place.name}</b><br/>${place.desc}`);
    marker.addEventListener("click", () => map.openInfoWindow(info, point));
  });
}

function useMapBootstrap(isMobile, userLocation, mapRef, setMapError) {
  useEffect(() => {
    if (!isMobile) {
      mapRef.current = null;
      setMapError(FALLBACK_DESKTOP);
      return;
    }

    const BMapGL = window.BMapGL;
    if (!BMapGL) {
      console.error(FALLBACK_SDK);
      setMapError(FALLBACK_SDK);
      return;
    }

    try {
      const map = new BMapGL.Map(MAP_CONTAINER_ID);
      const initPoint = toPoint(BMapGL, userLocation || DEFAULT_CENTER);
      map.centerAndZoom(initPoint, MAP_ZOOM_LEVEL);
      map.enableScrollWheelZoom(true);
      mapRef.current = map;
      setMapError("");
    } catch (error) {
      console.error("地图初始化异常:", error);
      setMapError(FALLBACK_INIT);
    }
  }, [isMobile, userLocation, mapRef, setMapError]);
}

function useMapOverlays(targetPlaces, userLocation, isMobile, mapError, mapRef, markersRef, userMarkerRef, setMapError) {
  useEffect(() => {
    if (!isMobile || mapError) return;

    const map = mapRef.current;
    const BMapGL = window.BMapGL;
    if (!map || !BMapGL) return;

    try {
      clearUserMarker(map, userMarkerRef);
      drawUserMarker(map, BMapGL, userLocation, targetPlaces, userMarkerRef);
      clearPlaceMarkers(map, markersRef);
      drawPlaceMarkers(map, BMapGL, targetPlaces, markersRef);
      if (targetPlaces.length > 0) map.panTo(toPoint(BMapGL, targetPlaces[targetPlaces.length - 1]));
    } catch (error) {
      console.error("地图渲染异常:", error);
      setMapError(FALLBACK_RENDER);
    }
  }, [targetPlaces, userLocation, isMobile, mapError, mapRef, markersRef, userMarkerRef, setMapError]);
}

function BaiduMap({ targetPlaces, userLocation, isMobile }) {
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const [mapError, setMapError] = useState("");

  useMapBootstrap(isMobile, userLocation, mapRef, setMapError);
  useMapOverlays(targetPlaces, userLocation, isMobile, mapError, mapRef, markersRef, userMarkerRef, setMapError);

  if (mapError) {
    return (
      <div style={mapFallbackWrapStyle}>
        <div style={mapFallbackTextStyle}>{mapError}</div>
      </div>
    );
  }

  return <div id={MAP_CONTAINER_ID} style={mapStyle} />;
}

export default BaiduMap;
