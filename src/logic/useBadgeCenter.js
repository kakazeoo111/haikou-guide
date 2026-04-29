import { useCallback, useEffect, useState } from "react";
import { fetchBadgeSummary, getBadgeTitleOrDefault, selectActiveBadge, updateManualBadgeGrant } from "./badgeClient";

const DEFAULT_BADGE_TITLE = "\u672a\u89e3\u9501\u79f0\u53f7";

function getActiveBadge(summary) {
  const title = getBadgeTitleOrDefault(summary);
  const fromCatalog = summary?.badgeCatalog?.find((item) => item.name === title);
  if (fromCatalog) return fromCatalog;
  return { name: title, icon: "\uD83C\uDFC5", mood: "\u7ee7\u7eed\u89e3\u9501\u66f4\u591a\u79f0\u53f7" };
}

export function useBadgeCenter({ authApiBase, currentUser, adminPhone }) {
  const [badgeSummary, setBadgeSummary] = useState(null);
  const [activeBadgeTitle, setActiveBadgeTitle] = useState(DEFAULT_BADGE_TITLE);
  const [activeBadgeMeta, setActiveBadgeMeta] = useState(getActiveBadge(null));
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [showBadgeGrantModal, setShowBadgeGrantModal] = useState(false);

  const refreshBadgeSummary = useCallback(async (phone) => {
    const summary = await fetchBadgeSummary(authApiBase, phone);
    setBadgeSummary(summary);
    setActiveBadgeTitle(getBadgeTitleOrDefault(summary));
    setActiveBadgeMeta(getActiveBadge(summary));
    return summary;
  }, [authApiBase]);

  useEffect(() => {
    if (!currentUser?.phone) {
      queueMicrotask(() => {
        setBadgeSummary(null);
        setActiveBadgeTitle(DEFAULT_BADGE_TITLE);
        setActiveBadgeMeta(getActiveBadge(null));
      });
      return;
    }
    queueMicrotask(() => {
      refreshBadgeSummary(currentUser.phone).catch((error) => {
        console.error("Fetch badge summary failed:", error);
        setActiveBadgeTitle(DEFAULT_BADGE_TITLE);
        setActiveBadgeMeta(getActiveBadge(null));
      });
    });
  }, [currentUser?.phone, refreshBadgeSummary]);

  useEffect(() => {
    if (!showBadgePicker || !currentUser?.phone) return undefined;
    queueMicrotask(() => {
      refreshBadgeSummary(currentUser.phone).catch((error) => console.error("Refresh badge summary failed:", error));
    });
    const timer = setInterval(() => {
      refreshBadgeSummary(currentUser.phone).catch((error) => console.error("Poll badge summary failed:", error));
    }, 15000);
    return () => clearInterval(timer);
  }, [showBadgePicker, currentUser?.phone, refreshBadgeSummary]);

  const openManageBadgeModal = () => {
    if (!currentUser || currentUser.phone !== adminPhone) {
      alert("\u4ec5\u7ad9\u4e3b\u53ef\u4ee5\u64cd\u4f5c\u79f0\u53f7\u6388\u6743");
      return;
    }
    setShowBadgeGrantModal(true);
  };

  const closeManageBadgeModal = () => setShowBadgeGrantModal(false);

  const submitManageBadge = async (payload) => {
    if (!currentUser || currentUser.phone !== adminPhone) {
      throw new Error("\u65e0\u6743\u9650\u64cd\u4f5c\u79f0\u53f7\u6388\u6743");
    }
    const result = await updateManualBadgeGrant(authApiBase, { adminPhone, ...payload });
    await refreshBadgeSummary(currentUser.phone);
    return result;
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
      console.error("Switch badge failed:", error);
      alert(error.message || "\u5207\u6362\u79f0\u53f7\u5931\u8d25");
    }
  };

  return {
    activeBadgeTitle,
    activeBadgeMeta,
    badgeSummary,
    showBadgePicker,
    showBadgeGrantModal,
    openBadgePicker: () => setShowBadgePicker(true),
    closeBadgePicker: () => setShowBadgePicker(false),
    handleSelectBadge,
    handleManageBadge: openManageBadgeModal,
    openManageBadgeModal,
    closeManageBadgeModal,
    submitManageBadge,
  };
}
