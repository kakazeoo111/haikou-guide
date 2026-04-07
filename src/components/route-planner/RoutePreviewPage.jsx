import { useMemo } from "react";
import BaiduMap from "../../BaiduMap";
import { btnCancelStyle, btnMainStyle } from "../../styles/appStyles";
import { buildRelationNodes, ROUTE_PREVIEW_MAP_CONTAINER_ID, ROUTE_PREVIEW_Z_INDEX } from "../../logic/routePlannerUtils";

function RelationNodes({ nodes }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", lineHeight: 1.8 }}>
      {nodes.map((node, index) => (
        <div key={`${node.name}-${index}`} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <span style={{ padding: "4px 10px", borderRadius: "999px", background: "#e9f6ee", color: "#2d6a49", fontSize: "12px", fontWeight: 700 }}>{node.name}</span>
          {index < nodes.length - 1 && <span style={{ color: "#9bb3a7", fontSize: "12px" }}>→</span>}
        </div>
      ))}
    </div>
  );
}

function RoutePreviewPage({ previewRoute, isMobile, onBack, onClose }) {
  const routePath = useMemo(() => [previewRoute.originPoint, ...previewRoute.selectedPlaces], [previewRoute]);
  const relationNodes = useMemo(() => buildRelationNodes(previewRoute.originPoint, previewRoute.selectedPlaces), [previewRoute]);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "#f4fbf6", zIndex: ROUTE_PREVIEW_Z_INDEX, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 16px", background: "#fff", borderBottom: "1px solid #e6f0ea", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span onClick={onBack} style={{ color: "#5aa77b", cursor: "pointer", fontWeight: 700 }}>返回调整</span>
        <span style={{ fontWeight: 800, color: "#2e6a4a" }}>路线关系预览</span>
        <span onClick={onClose} style={{ color: "#7a8f84", cursor: "pointer", fontSize: "22px", lineHeight: 1 }}>×</span>
      </div>

      <div style={{ height: "42vh", minHeight: "240px" }}>
        <BaiduMap targetPlaces={previewRoute.selectedPlaces} userLocation={previewRoute.originPoint} routePath={routePath} isMobile={isMobile} containerId={ROUTE_PREVIEW_MAP_CONTAINER_ID} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", background: "#fff" }}>
        <div style={{ fontSize: "13px", color: "#5b7b6a", fontWeight: 700, marginBottom: "10px" }}>位置关系</div>
        <RelationNodes nodes={relationNodes} />
      </div>

      <div style={{ padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", background: "#fff", borderTop: "1px solid #e6f0ea", display: "flex", gap: "10px" }}>
        <button onClick={onBack} style={btnCancelStyle}>
          返回
        </button>
        <button onClick={() => window.open(previewRoute.routeUrl, "_blank")} style={btnMainStyle}>
          开始导航
        </button>
      </div>
    </div>
  );
}

export default RoutePreviewPage;
