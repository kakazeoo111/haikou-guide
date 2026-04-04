const BADGE_THEMES = [
  { background: "linear-gradient(135deg, #ffe4f1, #ffd5e6)", border: "#ffb9d5", textColor: "#a92f63", shadow: "0 8px 16px rgba(255, 116, 168, 0.24)" },
  { background: "linear-gradient(135deg, #fff0d9, #ffe2b3)", border: "#ffd299", textColor: "#9f6200", shadow: "0 8px 16px rgba(255, 173, 69, 0.24)" },
  { background: "linear-gradient(135deg, #e6f4ff, #d6ecff)", border: "#b7dcff", textColor: "#1a5d9e", shadow: "0 8px 16px rgba(76, 155, 255, 0.2)" },
  { background: "linear-gradient(135deg, #e8ffef, #d8fbe7)", border: "#bceecf", textColor: "#1f6e45", shadow: "0 8px 16px rgba(71, 180, 116, 0.2)" },
  { background: "linear-gradient(135deg, #f0e9ff, #e5d8ff)", border: "#d1b8ff", textColor: "#5b3b99", shadow: "0 8px 16px rgba(136, 95, 255, 0.24)" },
  { background: "linear-gradient(135deg, #e8fff9, #d6fff1)", border: "#b8f7e4", textColor: "#0e6a58", shadow: "0 8px 16px rgba(40, 194, 155, 0.22)" },
];

const BADGE_EMOJIS = ["✨", "🎯", "🌈", "🧃", "🧠", "🚀", "🎧", "🫧", "🎨", "💫"];

function hashText(input) {
  const text = String(input || "badge-seed");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getBadgeTheme(seed) {
  const index = hashText(seed) % BADGE_THEMES.length;
  return BADGE_THEMES[index];
}

export function getBadgeEmoji(seed, fallback = "") {
  if (fallback) return fallback;
  const index = hashText(`emoji-${seed}`) % BADGE_EMOJIS.length;
  return BADGE_EMOJIS[index];
}
