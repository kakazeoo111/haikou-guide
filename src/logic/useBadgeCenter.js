import { useEffect, useState } from "react";
import { fetchBadgeSummary, getBadgeTitleOrDefault, promptAndUpdateManualBadge } from "./badgeClient";

const DEFAULT_BADGE_TITLE = "未解锁称号";

export function useBadgeCenter({ authApiBase, currentUser, adminPhone }) {
  const [activeBadgeTitle, setActiveBadgeTitle] = useState(DEFAULT_BADGE_TITLE);

  useEffect(() => {
    if (!currentUser?.phone) {
      setActiveBadgeTitle(DEFAULT_BADGE_TITLE);
      return;
    }
    fetchBadgeSummary(authApiBase, currentUser.phone)
      .then((summary) => setActiveBadgeTitle(getBadgeTitleOrDefault(summary)))
      .catch((error) => {
        console.error("获取称号失败:", error);
        setActiveBadgeTitle(DEFAULT_BADGE_TITLE);
      });
  }, [authApiBase, currentUser?.phone]);

  const handleManageBadge = async () => {
    if (!currentUser || currentUser.phone !== adminPhone) {
      alert("仅站主可以操作称号授权");
      return;
    }
    try {
      const result = await promptAndUpdateManualBadge({ authApiBase, adminPhone });
      if (!result) return;
      alert(result.message || "称号授权操作成功");
      if (result.data?.targetPhone === currentUser.phone) {
        setActiveBadgeTitle(result.data.activeTitle || DEFAULT_BADGE_TITLE);
      }
    } catch (error) {
      console.error("称号授权失败:", error);
      alert(error.message || "称号授权失败");
    }
  };

  return { activeBadgeTitle, handleManageBadge };
}
