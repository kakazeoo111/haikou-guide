import XhsImageUploadButton from "../common/XhsImageUploadButton";
import { forumPostCardStyle, forumSubmitPostButtonStyle, forumTextAreaStyle, MAX_FORUM_IMAGES } from "../../logic/forumModalUtils";

const previewGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "10px", maxWidth: "280px" };
const previewImgStyle = { width: "100%", aspectRatio: "1 / 1", borderRadius: "10px", objectFit: "cover" };
const previewRemoveStyle = {
  position: "absolute",
  top: "-6px",
  right: "-6px",
  width: "20px",
  height: "20px",
  borderRadius: "50%",
  background: "#ff4d4f",
  color: "#fff",
  textAlign: "center",
  lineHeight: "20px",
  cursor: "pointer",
  fontSize: "14px",
  boxShadow: "0 2px 6px rgba(255,77,79,0.35)",
};
const toolbarStyle = { display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" };
const countTextStyle = { fontSize: "12px", color: "#6e867a", fontWeight: 600 };

function ForumPostComposer({ postContent, onContentChange, postImages, onRemoveImage, onSelectImages, onSubmitPost, submitting, inputId }) {
  return (
    <div style={forumPostCardStyle}>
      <textarea
        value={postContent}
        onChange={(event) => onContentChange(event.target.value)}
        placeholder="你可以在这里分享你的有趣..."
        style={forumTextAreaStyle}
      />
      {postImages.length > 0 && (
        <div style={previewGridStyle}>
          {postImages.map((file, index) => (
            <div key={`${file.name}-${index}`} style={{ position: "relative" }}>
              <img src={URL.createObjectURL(file)} alt="forum-post-preview" style={previewImgStyle} />
              <span onClick={() => onRemoveImage(index)} style={previewRemoveStyle}>×</span>
            </div>
          ))}
        </div>
      )}
      <div style={toolbarStyle}>
        <XhsImageUploadButton onClick={() => document.getElementById(inputId)?.click()} ariaLabel="upload-forum-post-images" size={42} radius={12} iconSize={20} />
        <span style={countTextStyle}>已选 {postImages.length}/{MAX_FORUM_IMAGES}</span>
        <input id={inputId} type="file" hidden accept="image/*" multiple onChange={onSelectImages} />
        <button onClick={onSubmitPost} disabled={submitting} style={{ ...forumSubmitPostButtonStyle, opacity: submitting ? 0.6 : 1 }}>
          {submitting ? "发布中..." : "发布"}
        </button>
      </div>
    </div>
  );
}

export default ForumPostComposer;
