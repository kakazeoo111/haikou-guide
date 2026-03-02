import { useEffect, useRef } from "react";

function BaiduMap({ targetPlaces }) {
  const mapRef = useRef(null);
  const markersRef = useRef([]); // 用来保存当前的 Marker

  // ================================
  // ✅ 初始化地图（只执行一次）
  useEffect(() => {
    const BMapGL = window.BMapGL;

    const map = new BMapGL.Map("map");
    map.centerAndZoom(new BMapGL.Point(110.326392, 20.055302), 13);
    map.enableScrollWheelZoom(true);

    mapRef.current = map;
  }, []);

  // ================================
  // ✅ 监听 targetPlaces → 动态标记
  useEffect(() => {
    const map = mapRef.current;
    const BMapGL = window.BMapGL;

    if (!map) return;

    // 🧹 1️⃣ 先清空旧 Marker
    markersRef.current.forEach((marker) => {
      map.removeOverlay(marker);
    });
    markersRef.current = [];

    // 🚗 2️⃣ 给每个 targetPlace 画 Marker
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

    // 🎯 3️⃣ 如果有地点，自动居中到第一个
    if (targetPlaces.length > 0) {
      const p = targetPlaces[0];
      map.panTo(new BMapGL.Point(p.lng, p.lat));
    }
  }, [targetPlaces]);

  return <div id="map" style={{ width: "100%", height: "100%" }} />;
}

export default BaiduMap;
