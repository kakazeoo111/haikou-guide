const baseButtonStyle = {
  border: "1.5px solid #d8ddd9",
  background: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
  boxShadow: "0 6px 16px rgba(31, 61, 50, 0.05)",
};

function PhotoUploadIcon({ size, stroke }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.25" y="4.25" width="17.5" height="15.5" rx="4.5" stroke={stroke} strokeWidth="1.7" />
      <circle cx="16.3" cy="8.3" r="1.45" stroke={stroke} strokeWidth="1.5" />
      <path
        d="M6.4 16.35 10.15 12.4c.31-.33.84-.34 1.17-.03l1.9 1.8c.34.32.87.3 1.18-.04l1.77-1.95c.32-.35.88-.36 1.21-.02l1.22 1.28"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XhsImageUploadButton({
  onClick,
  disabled = false,
  ariaLabel = "upload-images",
  size = 52,
  radius = 16,
  iconSize = 24,
  iconStroke = "#4c534f",
  style = {},
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        ...baseButtonStyle,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${radius}px`,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      <PhotoUploadIcon size={iconSize} stroke={iconStroke} />
    </button>
  );
}

export default XhsImageUploadButton;
