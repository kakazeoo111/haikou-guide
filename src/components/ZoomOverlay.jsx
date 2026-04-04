import { closeZoomStyle, swipeContainerStyle, swipeItemStyle, zoomOverlayStyle, zoomedImgStyle } from "../styles/appStyles";

function getGroupedZoomData(zoomedSingleImage) {
  if (!zoomedSingleImage || typeof zoomedSingleImage !== "object") return null;
  if (!Array.isArray(zoomedSingleImage.images)) return null;
  return zoomedSingleImage;
}

function ZoomOverlay({ visible, zoomMode, detailPlace, zoomedSingleImage, scrollContainerRef, onClose }) {
  if (!visible) return null;

  const groupedZoomData = getGroupedZoomData(zoomedSingleImage);
  const groupedImages = groupedZoomData?.images || [];
  const swipeImages = groupedImages.length > 0 ? groupedImages : detailPlace?.album || [];
  const singleImage = typeof zoomedSingleImage === "string" ? zoomedSingleImage : "";

  return (
    <div style={zoomOverlayStyle} onClick={onClose}>
      {zoomMode && swipeImages.length > 0 && (
        <div ref={scrollContainerRef} style={swipeContainerStyle} onClick={(event) => event.stopPropagation()}>
          {swipeImages.map((img, index) => (
            <div key={`${img}-${index}`} style={swipeItemStyle}>
              <img src={img} style={zoomedImgStyle} alt="zoom" />
            </div>
          ))}
        </div>
      )}
      {!zoomMode && singleImage && <img src={singleImage} style={zoomedImgStyle} onClick={onClose} alt="single-zoom" />}
      <div
        style={closeZoomStyle}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        ×
      </div>
    </div>
  );
}

export default ZoomOverlay;
