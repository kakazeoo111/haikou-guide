import { useEffect, useRef, useState } from "react";

const MAP_CONTAINER_ID = "map";
const MAP_LOAD_TIMEOUT_MS = 20000;
const MAP_CHECK_INTERVAL_MS = 250;
const DEFAULT_CENTER = { lng: 110.331398, lat: 20.031957 };
const DEFAULT_ZOOM = 13;
const MAP_ERROR_TEXT = "地图加载失败，请检查网络或百度地图配置";

function isValidNumber(value) {
  return Number.isFinite(Number(value));
}

function hasBMapGL() {
  return Boolean(window.BMapGL && typeof window.BMapGL.Map === "function");
}

function getPoint(BMapGL, lng, lat) {
  if (!isValidNumber(lng) || !isValidNumber(lat)) return null;
  return new BMapGL.Point(Number(lng), Number(lat));
}

function BaiduMap({ targetPlaces, userLocation }) {
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const timeoutReportedRef = useRef(false);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    if (mapRef.current) return undefined;

    let elapsedMs = 0;
    let timerId = 0;
    let isCancelled = false;

    const tryInitMap = () => {
      if (isCancelled) return;
      if (!hasBMapGL()) {
        elapsedMs += MAP_CHECK_INTERVAL_MS;
        if (elapsedMs >= MAP_LOAD_TIMEOUT_MS && !timeoutReportedRef.current) {
          timeoutReportedRef.current = true;
          console.error(
            `Baidu map load timeout after ${MAP_LOAD_TIMEOUT_MS}ms: window.BMapGL.Map is unavailable`
          );
          setMapError(MAP_ERROR_TEXT);
        }
        return;
      }

      try {
        timeoutReportedRef.current = false;
        const BMapGL = window.BMapGL;
        const map = new BMapGL.Map(MAP_CONTAINER_ID);
        const initPoint =
          getPoint(BMapGL, userLocation?.lng, userLocation?.lat) ||
          getPoint(BMapGL, DEFAULT_CENTER.lng, DEFAULT_CENTER.lat);
        if (!initPoint) {
          console.error("Map init failed: invalid default center point");
          setMapError(MAP_ERROR_TEXT);
          if (timerId) window.clearInterval(timerId);
          return;
        }

        map.centerAndZoom(initPoint, DEFAULT_ZOOM);
        map.enableScrollWheelZoom(true);
        mapRef.current = map;
        setMapError("");
      } catch (error) {
        console.error("Baidu map init failed:", error);
        setMapError(MAP_ERROR_TEXT);
      } finally {
        if (timerId) window.clearInterval(timerId);
      }
    };

    timerId = window.setInterval(tryInitMap, MAP_CHECK_INTERVAL_MS);
    tryInitMap();

    return () => {
      isCancelled = true;
      if (timerId) window.clearInterval(timerId);
    };
  }, [userLocation?.lat, userLocation?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasBMapGL()) return;

    const BMapGL = window.BMapGL;

    if (userMarkerRef.current) {
      map.removeOverlay(userMarkerRef.current);
    }

    const myPoint = getPoint(BMapGL, userLocation?.lng, userLocation?.lat);
    if (myPoint) {
      const myMarker = new BMapGL.Marker(myPoint);
      const myLabel = new BMapGL.Label("🚶 我的位置", { offset: new BMapGL.Size(20, -10) });
      myLabel.setStyle({
        color: "#2e6a4a",
        fontSize: "12px",
        fontWeight: "bold",
        backgroundColor: "white",
        border: "1px solid #5aa77b",
        borderRadius: "4px",
        padding: "2px 5px",
      });
      myMarker.setLabel(myLabel);
      map.addOverlay(myMarker);
      userMarkerRef.current = myMarker;

      if ((targetPlaces || []).length === 0) {
        map.panTo(myPoint);
      }
    } else {
      userMarkerRef.current = null;
    }

    markersRef.current.forEach((marker) => map.removeOverlay(marker));
    markersRef.current = [];

    (targetPlaces || []).forEach((place) => {
      const point = getPoint(BMapGL, place?.lng, place?.lat);
      if (!point) {
        console.error("Skip marker: invalid place point", place);
        return;
      }

      const marker = new BMapGL.Marker(point);
      const placeLabel = new BMapGL.Label(place.name, { offset: new BMapGL.Size(18, -12) });
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

      const info = new BMapGL.InfoWindow(`<b>${place.name}</b><br/>${place.desc || ""}`);
      marker.addEventListener("click", () => map.openInfoWindow(info, point));
    });

    if ((targetPlaces || []).length > 0) {
      const latest = targetPlaces[targetPlaces.length - 1];
      const latestPoint = getPoint(BMapGL, latest?.lng, latest?.lat);
      if (latestPoint) map.panTo(latestPoint);
    }
  }, [targetPlaces, userLocation]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div id={MAP_CONTAINER_ID} style={{ width: "100%", height: "100%" }} />
      {mapError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.72)",
            padding: "16px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              color: "#8a2f39",
              background: "white",
              border: "1px solid #f0c7cd",
              borderRadius: "12px",
              padding: "8px 12px",
              boxShadow: "0 6px 12px rgba(0,0,0,0.08)",
            }}
          >
            {mapError}
          </div>
        </div>
      )}
    </div>
  );
}

export default BaiduMap;
