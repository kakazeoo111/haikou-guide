import { useEffect } from "react";
import { JUMP_TO_RECOMMEND_EVENT } from "../constants/jumpEvents";
import { scrollToRecommendCard } from "./recommendJump";
import { getUrlOrigin, PUBLIC_UPLOAD_BASE_URL, toPublicHttpsUrl } from "../appConfig";

const MOBILE_BREAKPOINT = 768;
const COUNTDOWN_STEP = 1;
const COUNTDOWN_INTERVAL_MS = 1000;
const PHONE_PATTERN = /^1\d{10}$/;

function normalizeProfileAvatarUrl(url) {
  return toPublicHttpsUrl(url);
}

function warmAvatar(url) {
  const normalized = normalizeProfileAvatarUrl(url);
  if (!normalized || normalized.startsWith("data:image/")) return;
  const image = new Image();
  image.decoding = "async";
  image.fetchPriority = "high";
  image.src = normalized;
}

function ensureResourceHint(rel, href, useCrossOrigin = false) {
  if (!href || typeof document === "undefined") return;
  const key = encodeURIComponent(`${rel}:${href}`);
  if (document.head.querySelector(`link[data-hk-resource-hint="${key}"]`)) return;
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  link.setAttribute("data-hk-resource-hint", key);
  if (useCrossOrigin) link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

function primeCrossOriginResourceHints(urls) {
  const origins = [...new Set((Array.isArray(urls) ? urls : []).map(getUrlOrigin).filter(Boolean))];
  origins.forEach((origin) => {
    const { host } = new URL(origin);
    ensureResourceHint("dns-prefetch", `//${host}`);
    ensureResourceHint("preconnect", origin, true);
  });
}

async function syncCachedUserProfile({ authApiBase, savedUser, setCurrentUser }) {
  const phone = String(savedUser?.phone || "").trim();
  if (!authApiBase || !PHONE_PATTERN.test(phone)) return;
  try {
    const response = await fetch(`${authApiBase}/api/auth/user/${phone}`, { cache: "no-store" });
    const data = await response.json();
    if (!data?.ok || !data.user) {
      console.error("登录态用户资料同步失败:", data?.message || "invalid profile response");
      return;
    }
    const nextUser = {
      ...savedUser,
      ...data.user,
      avatar_url: normalizeProfileAvatarUrl(data.user.avatar_url),
    };
    if (nextUser.username === savedUser.username && nextUser.avatar_url === String(savedUser.avatar_url || "")) return;
    setCurrentUser(nextUser);
    localStorage.setItem("haikouUser", JSON.stringify(nextUser));
    warmAvatar(nextUser.avatar_url);
  } catch (error) {
    console.error("登录态用户资料同步请求失败:", error);
  }
}

export function useValidateEnv(ADMIN_PHONE, authApiBase) {
  useEffect(() => {
    if (ADMIN_PHONE && authApiBase) return;
    console.error("缺少环境变量：VITE_ADMIN_PHONE 或 VITE_AUTH_API_BASE");
    alert("环境配置缺失：请在前端 .env 文件中配置 VITE_ADMIN_PHONE 和 VITE_AUTH_API_BASE");
  }, [ADMIN_PHONE, authApiBase]);
}

export function useInitClientState({ authApiBase, setCurrentUser, setActiveTab, setIsMobile, setUserLocation }) {
  useEffect(() => {
    primeCrossOriginResourceHints([authApiBase, PUBLIC_UPLOAD_BASE_URL]);
    try {
      const savedUser = JSON.parse(localStorage.getItem("haikouUser"));
      if (savedUser) {
        setCurrentUser(savedUser);
        warmAvatar(savedUser.avatar_url);
        syncCachedUserProfile({ authApiBase, savedUser, setCurrentUser });
      }
      const savedTab = localStorage.getItem("haikou_active_tab");
      if (["home", "profile", "forum"].includes(savedTab)) setActiveTab(savedTab);
    } catch (error) {
      console.error("用户缓存解析失败:", error);
    }

    const onResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener("resize", onResize);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (error) => console.error("定位失败:", error),
        { enableHighAccuracy: true },
      );
    }
    return () => window.removeEventListener("resize", onResize);
  }, [authApiBase, setActiveTab, setCurrentUser, setIsMobile, setUserLocation]);
}

export function useCountdown(countdown, setCountdown) {
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - COUNTDOWN_STEP), COUNTDOWN_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [countdown, setCountdown]);
}

export function useRecommendJumpListener({ setViewingCommentsPlace, setActiveTab, setFilter, setSearch }) {
  useEffect(() => {
    const handleJumpToRecommend = (event) => {
      const recommendationId = Number.parseInt(event?.detail?.recommendationId, 10) || 0;
      setViewingCommentsPlace(null);
      setActiveTab("home");
      setFilter("recommend");
      setSearch("");
      if (recommendationId > 0) scrollToRecommendCard(recommendationId);
    };
    window.addEventListener(JUMP_TO_RECOMMEND_EVENT, handleJumpToRecommend);
    return () => window.removeEventListener(JUMP_TO_RECOMMEND_EVENT, handleJumpToRecommend);
  }, [setActiveTab, setFilter, setSearch, setViewingCommentsPlace]);
}
