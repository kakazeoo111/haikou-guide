import { albumThumbStyle, btnMainStyle, horizontalScrollWrapper, modalContentStyle, modalOverlayStyle } from "../styles/appStyles";

function DetailModal({ place, onClose, onPreviewAlbum }) {
  if (!place) return null;

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, color: "#2e6a4a" }}>{place.name}</h2>
          <span style={{ cursor: "pointer", fontSize: "28px" }} onClick={onClose}>
            ×
          </span>
        </div>
        <p style={{ color: "#666", fontSize: "14px", margin: "10px 0" }}>{place.desc}</p>
        <div style={horizontalScrollWrapper}>
          {place.album?.map((img, idx) => (
            <img
              key={`${img}-${idx}`}
              src={img}
              style={albumThumbStyle}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              onClick={() => onPreviewAlbum(idx)}
              alt="detail-album"
            />
          ))}
        </div>
        <button onClick={onClose} style={{ ...btnMainStyle, marginTop: "15px" }}>
          返回列表
        </button>
      </div>
    </div>
  );
}

export default DetailModal;
