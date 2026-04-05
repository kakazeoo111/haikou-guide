import { useEffect, useMemo, useState } from "react";

const FORUM_NOTICE_SUPPRESS_KEY_PREFIX = "haikou_forum_notice_suppress_";

export function useForumNotice(phone) {
  const normalizedPhone = String(phone || "").trim();
  const storageKey = useMemo(() => `${FORUM_NOTICE_SUPPRESS_KEY_PREFIX}${normalizedPhone || "guest"}`, [normalizedPhone]);
  const [showNotice, setShowNotice] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (!normalizedPhone) {
      setShowNotice(false);
      setDontShowAgain(false);
      return;
    }
    const suppressed = localStorage.getItem(storageKey) === "1";
    setDontShowAgain(suppressed);
    setShowNotice(!suppressed);
  }, [normalizedPhone, storageKey]);

  const updateDontShowAgain = (nextValue) => {
    const enabled = Boolean(nextValue);
    setDontShowAgain(enabled);
    if (!normalizedPhone) return;
    localStorage.setItem(storageKey, enabled ? "1" : "0");
  };

  return {
    showNotice,
    openNotice: () => setShowNotice(true),
    closeNotice: () => setShowNotice(false),
    dontShowAgain,
    updateDontShowAgain,
  };
}
