export function buildImageLoadingProps({ eager = false, priority } = {}) {
  const props = {
    loading: eager ? "eager" : "lazy",
    decoding: "async",
  };
  const finalPriority = priority || (eager ? "high" : "");
  if (finalPriority) props.fetchPriority = finalPriority;
  return props;
}
