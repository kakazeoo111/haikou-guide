const RECOMMEND_CARD_ID_PREFIX = "recommend-card-";
const SCROLL_RETRY_INTERVAL_MS = 80;
const SCROLL_RETRY_MAX_TIMES = 12;

export function getRecommendCardDomId(recommendationId) {
  const safeId = Number.parseInt(recommendationId, 10);
  if (!Number.isFinite(safeId) || safeId <= 0) return "";
  return `${RECOMMEND_CARD_ID_PREFIX}${safeId}`;
}

export function scrollToRecommendCard(recommendationId) {
  const cardId = getRecommendCardDomId(recommendationId);
  if (!cardId) return;

  let attempts = 0;
  const tryScroll = () => {
    const target = document.getElementById(cardId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    attempts += 1;
    if (attempts >= SCROLL_RETRY_MAX_TIMES) {
      console.error(`Jump to recommendation failed: missing card ${cardId}`);
      return;
    }
    window.setTimeout(tryScroll, SCROLL_RETRY_INTERVAL_MS);
  };

  tryScroll();
}
