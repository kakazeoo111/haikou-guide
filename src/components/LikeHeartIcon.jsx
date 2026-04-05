function LikeHeartIcon({ liked, size = 15 }) {
  const strokeColor = liked ? "#ff2f76" : "#92a19a";
  const fillColor = liked ? "#ff5c93" : "rgba(255,255,255,0.8)";
  const highlightColor = "rgba(255,255,255,0.45)";
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      style={{
        display: "block",
        filter: liked ? "drop-shadow(0 2px 4px rgba(255, 95, 151, 0.35))" : "none",
        transition: "all 0.2s ease",
      }}
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09A5.98 5.98 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {liked && (
        <path
          d="M8.1 8.6c0.55-0.95 1.55-1.4 2.35-1.4"
          fill="none"
          stroke={highlightColor}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export default LikeHeartIcon;
