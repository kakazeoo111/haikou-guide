import { useEffect } from "react";
import { JUMP_TO_RECOMMEND_EVENT } from "../constants/jumpEvents";
import { scrollToRecommendCard } from "./recommendJump";

const MOBILE_BREAKPOINT = 768;
const COUNTDOWN_STEP = 1;
const COUNTDOWN_INTERVAL_MS = 1000;

export function useValidateEnv(ADMIN_PHONE, authApiBase) {
  useEffect(() => {
    if (ADMIN_PHONE && authApiBase) return;
    console.error("缺少环境变量：VITE_ADMIN_PHONE 或 VITE_AUTH_API_BASE");
    alert("环境配置缺失：请在前端 .env 文件中配置 VITE_ADMIN_PHONE 和 VITE_AUTH_API_BASE");
  }, [ADMIN_PHONE, authApiBase]);
}

export function useInitClientState({ setCurrentUser, setActiveTab, setIsMobile, setUserLocation }) {
  useEffect(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem("haikouUser"));
      if (savedUser) setCurrentUser(savedUser);
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
  }, [setActiveTab, setCurrentUser, setIsMobile, setUserLocation]);
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
