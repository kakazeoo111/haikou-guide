import React, { useEffect, useRef } from "react";

export default function BaiduMap({ targetPlaces }) {
  const mapRef = useRef(null);

  const userPointRef = useRef(null);
  const userMarkerRef = useRef(null);

  const targetMarkersRef = useRef([]); // ✅多个 marker

  // ✅地图初始化（只执行一次）
  useEffect(() => {
    if (mapRef.current) return;

    const map = new window.BMapGL.Map("map-container");
    mapRef.current = map;

    map.enableScrollWheelZoom(true);

    // 默认海口中心
    const point = new window.BMapGL.Point(110.33119, 20.031971);
    map.centerAndZoom(point, 13);

    // ✅定位
    const geo = new window.BMapGL.Geolocation();

    geo.getCurrentPosition((result) => {
      if (geo.getStatus() === 0) {
        const userPoint = result.point;
        userPointRef.current = userPoint;

        // 用户 Marker
        const marker = new window.BMapGL.Marker(userPoint);
        map.addOverlay(marker);

        marker.setLabel(
          new window.BMapGL.Label("📍你在这里", {
            offset: new window.BMapGL.Size(20, -10),
          })
        );

        userMarkerRef.current = marker;
        map.centerAndZoom(userPoint, 15);
      }
    });
  }, []);

  // ✅监听多个目标点变化
  useEffect(() => {
    if (!mapRef.current) return;
    if (!userPointRef.current) return;

    const map = mapRef.current;

    // ✅清除旧目标 markers
    targetMarkersRef.current.forEach((m) => map.removeOverlay(m));
    targetMarkersRef.current = [];

    // ✅所有点：用户 + 多目标
    const points = [userPointRef.current];

    // ✅添加多个目标 Marker
    targetPlaces.forEach((place) => {
      const destPoint = new window.BMapGL.Point(place.lng, place.lat);
      points.push(destPoint);

      const marker = new window.BMapGL.Marker(destPoint);
      map.addOverlay(marker);

      marker.setLabel(
        new window.BMapGL.Label("🎯 " + place.name, {
          offset: new window.BMapGL.Size(20, -10),
        })
      );

      targetMarkersRef.current.push(marker);
    });

    // ✅自动缩放：显示所有点
    if (points.length > 1) {
      const view = map.getViewport(points);
      map.centerAndZoom(view.center, view.zoom);
    }
  }, [targetPlaces]);

  return (
    <div
      id="map-container"
      style={{
        width: "100%",
        height: "100vh",
      }}
    />
  );
}