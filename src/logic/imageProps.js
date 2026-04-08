export function buildImageLoadingProps({ eager = false, priority } = {}) {
  return {
    loading: eager ? "eager" : "lazy",
    decoding: "async",
    fetchPriority: priority || (eager ? "high" : "low"),
  };
}
