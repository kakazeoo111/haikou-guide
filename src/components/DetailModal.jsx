import { albumThumbStyle, btnMainStyle, horizontalScrollWrapper, modalContentStyle, modalOverlayStyle } from "../styles/appStyles";
import { buildImageLoadingProps } from "../logic/imageProps";

const ALBUM_THUMB_HEIGHT_PX = 150;

function DetailModal({ place, onClose, onPreviewAlbum }) {
  if (!place) return null;
  const albumEntries = Array.isArray(place.albumEntries) && place.albumEntries.length > 0
    ? place.albumEntries
    : Array.isArray(place.album)
      ? place.album.map((url) => ({ url, thumbnail: url }))
      : [];

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, color: "#2e6a4a" }}>{place.name}</h2>
          <span style={{ cursor: "pointer", fontSize: "28px" }} onClick={onClose}>
            ×
          </span>
        </div>
        <p style={{ color: "#666", fontSize: "14px", margin: "10px 0" }}>{place.desc}</p>
        <div style={horizontalScrollWrapper}>
          {albumEntries.map((entry, idx) => (
            <img
              key={`${entry.url}-${idx}`}
              src={entry.thumbnail || entry.url}
              style={albumThumbStyle}
              height={ALBUM_THUMB_HEIGHT_PX}
              {...buildImageLoadingProps()}
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
