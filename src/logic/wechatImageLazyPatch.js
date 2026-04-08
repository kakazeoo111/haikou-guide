const WECHAT_UA_PATTERN = /MicroMessenger/i;
const LAZY_IMAGE_SELECTOR = 'img[loading="lazy"]';
const WX_LAZY_PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const VIEWPORT_MARGIN = 260;

function isWechatWebView() {
  return WECHAT_UA_PATTERN.test(navigator.userAgent || "");
}

function isNearViewport(element, margin = VIEWPORT_MARGIN) {
  const rect = element.getBoundingClientRect();
  return rect.top <= window.innerHeight + margin && rect.bottom >= -margin;
}

function canDeferImage(element) {
  if (!(element instanceof HTMLImageElement)) return false;
  if (element.dataset.wxLazyPatched === "1") return false;
  if (String(element.loading || "").toLowerCase() !== "lazy") return false;
  const source = String(element.getAttribute("src") || "").trim();
  if (!source || source.startsWith("data:") || source.startsWith("blob:")) return false;
  if (isNearViewport(element)) return false;
  return true;
}

function applyDeferredSource(image, observer) {
  const source = String(image.getAttribute("src") || "").trim();
  if (!source) return;
  image.dataset.wxLazyPatched = "1";
  image.dataset.wxLazySrc = source;
  image.setAttribute("src", WX_LAZY_PLACEHOLDER);
  observer.observe(image);
}

function restoreDeferredSource(image, observer) {
  const source = String(image.dataset.wxLazySrc || "").trim();
  if (!source) return;
  image.setAttribute("src", source);
  delete image.dataset.wxLazySrc;
  observer.unobserve(image);
}

function patchLazyImagesIn(root, observer) {
  const lazyImages = root instanceof HTMLImageElement ? [root] : Array.from(root.querySelectorAll?.(LAZY_IMAGE_SELECTOR) || []);
  lazyImages.forEach((image) => {
    if (!canDeferImage(image)) return;
    applyDeferredSource(image, observer);
  });
}

export function setupWechatAggressiveLazyLoading() {
  if (!isWechatWebView() || !window.IntersectionObserver || !window.MutationObserver) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        restoreDeferredSource(entry.target, observer);
      });
    },
    { rootMargin: `${VIEWPORT_MARGIN}px 0px`, threshold: 0.01 },
  );

  patchLazyImagesIn(document, observer);

  const mutationObserver = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        patchLazyImagesIn(node, observer);
      });
    });
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });

  return () => {
    mutationObserver.disconnect();
    observer.disconnect();
  };
}
