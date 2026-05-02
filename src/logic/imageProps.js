const IOS_UA_PATTERN = /iP(?:hone|ad|od)/i;

export function isIOSLikeDevice() {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  return IOS_UA_PATTERN.test(userAgent) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
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
  const shouldBoostForIOS = isIOSLikeDevice() && itemIndex < eagerWindow && imageIndex < 3;
  return buildImageLoadingProps({
    eager: shouldBoostForIOS,
    priority: shouldBoostForIOS ? "high" : "auto",
  });
}
