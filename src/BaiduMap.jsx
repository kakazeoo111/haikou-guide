import { useEffect, useRef } from "react";

function BaiduMap({ targetPlaces, userLocation }) {
  const mapRef = useRef(null);
  const markersRef = useRef([]);      // 用来保存地点的 Marker
  const userMarkerRef = useRef(null); // 用来保存“我的位置”的专用 Marker

  // ================================
  // ✅ 1. 初始化地图（只执行一次）
  // ================================
  useEffect(() => {
    const BMapGL = window.BMapGL;
    const map = new BMapGL.Map("map");
    
    // 初始视角：如果有定位就选定位，没有就选海口市中心
    const initPoint = userLocation 
      ? new BMapGL.Point(userLocation.lng, userLocation.lat)
      : new BMapGL.Point(110.326392, 20.055302);
      
    map.centerAndZoom(initPoint, 13);
    map.enableScrollWheelZoom(true);
    mapRef.current = map;
  }, []);

  // ================================
  // ✅ 2. 监听并绘制“我的位置”和“标记点”
  // ================================
  useEffect(() => {
    const map = mapRef.current;
    const BMapGL = window.BMapGL;
    if (!map) return;

    // --- 🟢 处理“我的位置” ---
    // 先清理旧的定位点
    if (userMarkerRef.current) {
      map.removeOverlay(userMarkerRef.current);
    }

    if (userLocation && userLocation.lng) {
      const myPoint = new BMapGL.Point(userLocation.lng, userLocation.lat);
      const myMarker = new BMapGL.Marker(myPoint);
      
      // 添加一个显眼的标签
      const label = new BMapGL.Label("🚶 我的位置", {
        offset: new BMapGL.Size(20, -10),
      });
      label.setStyle({
        color: "#2e6a4a",
        fontSize: "12px",
        fontWeight: "bold",
        backgroundColor: "white",
        border: "1px solid #5aa77b",
        borderRadius: "4px",
        padding: "2px 5px"
      });
      
      myMarker.setLabel(label);
      map.addOverlay(myMarker);
      userMarkerRef.current = myMarker;

      // 如果只有我的位置而没有标记点，则自动居中到我
      if (targetPlaces.length === 0) {
        map.panTo(myPoint);
      }
    }

    // --- 🔴 处理“标记点” (targetPlaces) ---
    // 🧹 先清空旧的地点 Marker
    markersRef.current.forEach((marker) => {
      map.removeOverlay(marker);
    });
    markersRef.current = [];

    // 🚗 给每个 targetPlace 画 Marker
    targetPlaces.forEach((place) => {
      const point = new BMapGL.Point(place.lng, place.lat);
      const marker = new BMapGL.Marker(point);

      map.addOverlay(marker);
      markersRef.current.push(marker);

      const info = new BMapGL.InfoWindow(
        `<b>${place.name}</b><br/>${place.desc}`
      );

      marker.addEventListener("click", () => {
        map.openInfoWindow(info, point);
      });
    });

    // 🎯 如果有标记点，自动居中到第一个标记点
    if (targetPlaces.length > 0) {
      const p = targetPlaces[0];
      map.panTo(new BMapGL.Point(p.lng, p.lat));
    }
  }, [targetPlaces, userLocation]); // 🚀 关键：监听这两个参数的变化

  return <div id="map" style={{ width: "100%", height: "100%" }} />;
}

export default BaiduMap;