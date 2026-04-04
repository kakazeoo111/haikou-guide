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
      : new BMapGL.Point(110.331398, 20.031957);
      
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
    if (userMarkerRef.current) {
      map.removeOverlay(userMarkerRef.current);
    }

    if (userLocation && userLocation.lng) {
      const myPoint = new BMapGL.Point(userLocation.lng, userLocation.lat);
      const myMarker = new BMapGL.Marker(myPoint);
      
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

      if (targetPlaces.length === 0) {
        map.panTo(myPoint);
      }
    }

    // --- 🔴 处理“标记点” (targetPlaces) ---
    // 🧹 1️⃣ 先清空旧的地点 Marker
    markersRef.current.forEach((marker) => {
      map.removeOverlay(marker);
    });
    markersRef.current = [];

    // 🚗 2️⃣ 给每个 targetPlace 画 Marker 并添加【精致名字标签】
    targetPlaces.forEach((place) => {
      const point = new BMapGL.Point(place.lng, place.lat);
      const marker = new BMapGL.Marker(point);

      // ✅ 创建地点名字标签
      const placeLabel = new BMapGL.Label(place.name, {
        offset: new BMapGL.Size(18, -12), // 相对于红点的位置偏移
      });

      // ✅ 设置标签样式：精致、小巧、不遮挡
      placeLabel.setStyle({
        color: "#d94f5c",               // 深红色文字（呼应红点）
        fontSize: "11px",               // ✅ 字体更小一些
        backgroundColor: "rgba(255, 255, 255, 0.85)", // ✅ 半透明白底
        border: "1px solid #d94f5c",    // 细红色边框
        borderRadius: "3px",
        padding: "1px 4px",
        whiteSpace: "nowrap",           // 禁止换行
        boxShadow: "2px 2px 4px rgba(0,0,0,0.1)" // 增加轻微投影，更有质感
      });

      marker.setLabel(placeLabel); // ✅ 将名字绑定到红点上
      map.addOverlay(marker);
      markersRef.current.push(marker);

      const info = new BMapGL.InfoWindow(
        `<b>${place.name}</b><br/>${place.desc}`
      );

      marker.addEventListener("click", () => {
        map.openInfoWindow(info, point);
      });
    });

    // 🎯 3️⃣ 如果有地点，自动居中到最新标记的那个地点
    if (targetPlaces.length > 0) {
      const p = targetPlaces[targetPlaces.length - 1];
      map.panTo(new BMapGL.Point(p.lng, p.lat));
    }
  }, [targetPlaces, userLocation]); 

  return <div id="map" style={{ width: "100%", height: "100%" }} />;
}

export default BaiduMap;