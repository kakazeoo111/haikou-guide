const IOS_UA_PATTERN = /iP(?:hone|ad|od)/i;
const LAZY_IMAGE_SELECTOR = 'img[loading="lazy"]';
const IOS_REFRESH_MARGIN = 900;
const IOS_RETRY_DELAY_MS = 700;
const IOS_RETRY_LIMIT = 2;

function isIOSDevice() {
  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  return IOS_UA_PATTERN.test(userAgent) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isHtmlImageElement(element) {
  return typeof HTMLImageElement !== "undefined" && element instanceof HTMLImageElement;
}

function getImageSource(image) {
  return String(image.getAttribute("src") || "").trim();
}

function isSkippableSource(source) {
  return !source || source.startsWith("data:") || source.startsWith("blob:");
}

function isNearViewport(element, margin = IOS_REFRESH_MARGIN) {
  const rect = element.getBoundingClientRect();
  return rect.top <= window.innerHeight + margin && rect.bottom >= -margin;
}

function scheduleIOSImageRetry(image, source, attempt = 0) {
  if (image.complete || attempt >= IOS_RETRY_LIMIT) return;

  const token = `${source}:${attempt}:${Date.now()}`;
  image.dataset.iosLazyRefreshToken = token;

  window.setTimeout(() => {
    if (image.dataset.iosLazyRefreshToken !== token) return;
    if (getImageSource(image) !== source || image.complete) return;
    image.src = source;
    scheduleIOSImageRetry(image, source, attempt + 1);
  }, IOS_RETRY_DELAY_MS * (attempt + 1));
}

function refreshIOSLazyImage(image, observer) {
  const source = getImageSource(image);
  if (isSkippableSource(source)) return;
  if (image.dataset.iosLazyRefreshSource === source) {
    observer?.unobserve(image);
    return;
  }

  image.dataset.iosLazyRefreshSource = source;
  image.loading = "eager";
  image.setAttribute("loading", "eager");
  if (!image.getAttribute("fetchpriority")) image.setAttribute("fetchpriority", "auto");
  if (!image.getAttribute("decoding")) image.setAttribute("decoding", "async");
  observer?.unobserve(image);
  scheduleIOSImageRetry(image, source);
}

function collectLazyImages(root) {
  if (isHtmlImageElement(root)) return [root];
  return Array.from(root.querySelectorAll?.(LAZY_IMAGE_SELECTOR) || []);
}

export function setupIOSLazyImageRefresh() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  if (!isIOSDevice()) return () => {};

  let disposed = false;
  let scanScheduled = false;

  const observer = typeof window.IntersectionObserver === "function"
    ? new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) refreshIOSLazyImage(entry.target, observer);
        });
      },
      { rootMargin: `${IOS_REFRESH_MARGIN}px 0px`, threshold: 0.01 },
    )
    : null;

  function processLazyImage(image) {
    if (!isHtmlImageElement(image)) return;
    const source = getImageSource(image);
    if (isSkippableSource(source) || image.dataset.iosLazyRefreshSource === source) return;
    if (isNearViewport(image)) {
      refreshIOSLazyImage(image, observer);
      return;
    }
    observer?.observe(image);
  }

  function scanLazyImages(root = document) {
    if (disposed) return;
    collectLazyImages(root).forEach(processLazyImage);
  }

  function scheduleScan() {
    if (disposed || scanScheduled) return;
    scanScheduled = true;
    const run = () => {
      scanScheduled = false;
      scanLazyImages(document);
    };
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(run);
      return;
    }
    window.setTimeout(run, 16);
  }

  const mutationObserver = typeof window.MutationObserver === "function"
    ? new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === "attributes") {
          processLazyImage(record.target);
          return;
        }
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) scanLazyImages(node);
        });
      });
    })
    : null;

  scanLazyImages(document);
  mutationObserver?.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["loading", "src"],
  });

  window.addEventListener("scroll", scheduleScan, true);
  window.addEventListener("resize", scheduleScan);
  window.addEventListener("pageshow", scheduleScan);
  document.addEventListener("visibilitychange", scheduleScan);

  return () => {
    disposed = true;
    observer?.disconnect();
    mutationObserver?.disconnect();
    window.removeEventListener("scroll", scheduleScan, true);
    window.removeEventListener("resize", scheduleScan);
    window.removeEventListener("pageshow", scheduleScan);
    document.removeEventListener("visibilitychange", scheduleScan);
  };
}
