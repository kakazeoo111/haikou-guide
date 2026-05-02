const IOS_UA_PATTERN = /iP(?:hone|ad|od)/i;
const ANDROID_UA_PATTERN = /Android/i;
const WECHAT_UA_PATTERN = /MicroMessenger/i;

export function isIOSLikeDevice() {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  return IOS_UA_PATTERN.test(userAgent) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isAndroidLikeDevice() {
  if (typeof navigator === "undefined") return false;
  return ANDROID_UA_PATTERN.test(navigator.userAgent || "");
}

export function isWechatWebView() {
  if (typeof navigator === "undefined") return false;
  return WECHAT_UA_PATTERN.test(navigator.userAgent || "");
}

export function isMobileImageBoostDevice() {
  if (typeof navigator === "undefined") return false;
  return isIOSLikeDevice() || isAndroidLikeDevice() || isWechatWebView();
}

export function buildImageLoadingProps({ eager = false, priority } = {}) {
  const shouldLoadEager = Boolean(eager);
  const props = {
    loading: shouldLoadEager ? "eager" : "lazy",
    decoding: "async",
  };
  const finalPriority = priority || (shouldLoadEager ? "high" : "");
  if (finalPriority) props.fetchPriority = finalPriority;
  return props;
}

export function buildCommentImageLoadingProps({ itemIndex = 0, imageIndex = 0, eagerWindow = 6 } = {}) {
  const shouldBoostForMobile = isMobileImageBoostDevice() && itemIndex < eagerWindow && imageIndex < 3;
  return buildImageLoadingProps({
    eager: shouldBoostForMobile,
    priority: shouldBoostForMobile ? "high" : "auto",
  });
}
