import { useEffect, useState } from "react";
import { fetchBadgeSummary, getBadgeTitleOrDefault, promptAndUpdateManualBadge, selectActiveBadge } from "./badgeClient";

const DEFAULT_BADGE_TITLE = "未解锁称号";

function getActiveBadge(summary) {
  const title = getBadgeTitleOrDefault(summary);
  const fromCatalog = summary?.badgeCatalog?.find((item) => item.name === title);
  if (fromCatalog) return fromCatalog;
  return { name: title, icon: "🏅", mood: "继续解锁更多称号" };
}

export function useBadgeCenter({ authApiBase, currentUser, adminPhone }) {
  const [badgeSummary, setBadgeSummary] = useState(null);
  const [activeBadgeTitle, setActiveBadgeTitle] = useState(DEFAULT_BADGE_TITLE);
  const [activeBadgeMeta, setActiveBadgeMeta] = useState(getActiveBadge(null));
  const [showBadgePicker, setShowBadgePicker] = useState(false);

  const refreshBadgeSummary = async (phone) => {
    const summary = await fetchBadgeSummary(authApiBase, phone);
    setBadgeSummary(summary);
    setActiveBadgeTitle(getBadgeTitleOrDefault(summary));
    setActiveBadgeMeta(getActiveBadge(summary));
    return summary;
  };

  useEffect(() => {
    if (!currentUser?.phone) {
      setBadgeSummary(null);
      setActiveBadgeTitle(DEFAULT_BADGE_TITLE);
      setActiveBadgeMeta(getActiveBadge(null));
      return;
    }
    refreshBadgeSummary(currentUser.phone).catch((error) => {
      console.error("获取称号失败:", error);
      setActiveBadgeTitle(DEFAULT_BADGE_TITLE);
      setActiveBadgeMeta(getActiveBadge(null));
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
      alert("称号授权操作成功");
      await refreshBadgeSummary(currentUser.phone);
    } catch (error) {
      console.error("称号授权失败:", error);
      alert(error.message || "称号授权失败");
    }
  };

  const handleSelectBadge = async (badgeName) => {
    if (!currentUser?.phone) return;
    try {
      const nextSummary = await selectActiveBadge(authApiBase, currentUser.phone, badgeName);
      setBadgeSummary(nextSummary);
      setActiveBadgeTitle(getBadgeTitleOrDefault(nextSummary));
      setActiveBadgeMeta(getActiveBadge(nextSummary));
      setShowBadgePicker(false);
    } catch (error) {
      console.error("切换称号失败:", error);
      alert(error.message || "切换称号失败");
    }
  };

  return {
    activeBadgeTitle,
    activeBadgeMeta,
    badgeSummary,
    showBadgePicker,
    openBadgePicker: () => setShowBadgePicker(true),
    closeBadgePicker: () => setShowBadgePicker(false),
    handleSelectBadge,
    handleManageBadge,
  };
}
