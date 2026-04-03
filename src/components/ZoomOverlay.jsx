import { closeZoomStyle, swipeContainerStyle, swipeItemStyle, zoomOverlayStyle, zoomedImgStyle } from "../styles/appStyles";

function ZoomOverlay({ visible, zoomMode, detailPlace, zoomedSingleImage, scrollContainerRef, onClose }) {
  if (!visible) return null;

  return (
    <div style={zoomOverlayStyle} onClick={onClose}>
      {zoomMode && detailPlace?.album && (
        <div ref={scrollContainerRef} style={swipeContainerStyle} onClick={(e) => e.stopPropagation()}>
          {detailPlace.album.map((img, i) => (
            <div key={`${img}-${i}`} style={swipeItemStyle} onClick={onClose}>
              <img src={img} style={zoomedImgStyle} alt="zoom" />
            </div>
          ))}
        </div>
      )}
      {zoomedSingleImage && <img src={zoomedSingleImage} style={zoomedImgStyle} onClick={onClose} alt="single-zoom" />}
      <div style={closeZoomStyle}>×</div>
    </div>
  );
}

export default ZoomOverlay;
