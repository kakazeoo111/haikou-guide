import { useEffect, useState } from "react";

const ONLINE_POLL_INTERVAL_MS = 12 * 1000;

function buildOnlineCountUrl(authApiBase, phone) {
  const params = new URLSearchParams({ phone: String(phone || "").trim() });
  return `${authApiBase}/api/online/count?${params.toString()}`;
}

export function useOnlineCount({ enabled, authApiBase, phone }) {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!enabled || !authApiBase || !phone) return;
    let disposed = false;

    const pullOnlineCount = async () => {
      try {
        const res = await fetch(buildOnlineCountUrl(authApiBase, phone));
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || "在线人数获取失败");
        if (disposed) return;
        setOnlineCount(Number(data.onlineCount || 0));
      } catch (error) {
        console.error("在线人数刷新失败:", error);
      }
    };

    pullOnlineCount();
    const timer = setInterval(pullOnlineCount, ONLINE_POLL_INTERVAL_MS);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [enabled, authApiBase, phone]);

  return onlineCount;
}
