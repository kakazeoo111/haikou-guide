import { parseRecommendationAlbum } from "./placeUtils";
import { uploadAvatar } from "./avatarUploadHandler";
import { normalizeAvatarUrl } from "./avatarFallback";
import { APP_CACHE_TTL_MS, readCachedValue, writeCachedValue } from "./clientCache";
import { optimizeUploadImages } from "./uploadImageOptimizer";
import { warmCommentAvatars, warmCommentImages, warmRecommendationImages } from "./imageWarmup";
const GEOLOCATION_REFRESH_OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
export function createGeneralHandlers(ctx) {
  const {
    authApiBase, currentUser, places, recommendations, loginForm, authMode, noticeContent, feedbackContent, feedbackImages, favoriteIds,
    setRecommendations, setNotifications, setActiveComments, setShowNoticeList, setActiveTab, setViewingCommentsPlace, setCurrentUser, setUserLocation,
    setAllFeedbacks, setShowAdminFeedback, setFeedbackContent, setFeedbackImages, setShowFeedback, setIsEditingNotice, setCountdown, setLoginError,
    setFavoriteIds, setCommentSort, setReplyTo, setShowOnlyImages, setInitialSlide, setZoomMode, setZoomedSingleImage, setDetailPlace, setAuthMode,
  } = ctx;
  const fetchRecommendations = async (preferCache = true) => {
    const phone = currentUser?.phone || "";
    const cacheKey = `recommendations_${phone || "guest"}`;
    if (preferCache) {
      const cachedData = readCachedValue(cacheKey, APP_CACHE_TTL_MS.recommendations);
      if (cachedData?.ok && Array.isArray(cachedData.data)) setRecommendations(cachedData.data);
    }
    const res = await fetch(`${authApiBase}/api/recommendations?phone=${phone}`);
    const data = await res.json();
    if (data.ok) {
      setRecommendations(data.data);
      writeCachedValue(cacheKey, data);
      warmRecommendationImages(data.data);
      const ownAvatarUrl = normalizeAvatarUrl(data.data?.find((item) => String(item?.user_phone || "") === String(phone))?.avatar_url || "");
      if (ownAvatarUrl && ownAvatarUrl !== String(currentUser?.avatar_url || "")) {
        const nextUser = { ...currentUser, avatar_url: ownAvatarUrl };
        setCurrentUser(nextUser);
        localStorage.setItem("haikouUser", JSON.stringify(nextUser));
      }
    }
    return data;
  };

  const fetchNotices = async (preferCache = true) => {
    if (!currentUser) return;
    const cacheKey = `notifications_${currentUser.phone}`;
    if (preferCache) {
      const cachedData = readCachedValue(cacheKey, APP_CACHE_TTL_MS.notifications);
      if (cachedData?.ok && Array.isArray(cachedData.data)) setNotifications(cachedData.data);
    }
    const res = await fetch(`${authApiBase}/api/notifications/${currentUser.phone}`);
    const data = await res.json();
    if (data.ok) {
      setNotifications(data.data);
      writeCachedValue(cacheKey, data);
    }
    return data;
  };

  const fetchComments = async (id) => {
    const res = await fetch(`${authApiBase}/api/comments/${id}?phone=${currentUser.phone}`);
    const data = await res.json();
    if (data.ok) {
      setActiveComments((prev) => ({ ...prev, [id]: data.comments }));
      warmCommentImages(data.comments);
      warmCommentAvatars(data.comments);
    }
  };
  const handleLogout = () => { localStorage.removeItem("haikouUser"); window.location.reload(); };

  const handleRefreshLocation = () => {
    if (!navigator.geolocation) {
      console.error("重新定位失败: 当前设备不支持地理定位");
      alert("当前设备不支持定位，请检查微信定位权限");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => {
        console.error("重新定位失败:", error);
        alert("重新定位失败，请检查微信定位权限后重试");
      },
      GEOLOCATION_REFRESH_OPTIONS,
    );
  };

  const handleNoticeClick = (notice) => {
    if (notice?.type === "admin_reply") return;
    const allSource = [
      ...places.map((p) => ({ ...p, id: String(p.id) })),
      ...recommendations.map((r) => ({ ...r, id: `rec_${r.id}`, name: r.place_name, album: parseRecommendationAlbum(r.image_url) })),
    ];
    const targetPlace = allSource.find((p) => String(p.id) === String(notice.place_id));
    if (!targetPlace) return alert("该地点或推荐已被分享者删除");
    setShowNoticeList(false);
    setActiveTab("home");
    fetchComments(targetPlace.id);
    setViewingCommentsPlace(targetPlace);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await uploadAvatar({
        authApiBase,
        currentUser,
        file,
        setCurrentUser,
      });
      alert("头像更换成功！");
    } catch (error) {
      console.error("头像上传出错:", error);
      alert(error?.message || "网络错误，请稍后再试");
    }
  };

  const fetchAdminFeedbacks = async () => {
    const res = await fetch(`${authApiBase}/api/feedback/all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: currentUser.phone }),
    });
    const data = await res.json();
    if (!data.ok) {
      alert(data.message || "获取反馈库失败");
      return null;
    }
    setAllFeedbacks(data.data || []);
    return data.data || [];
  };

  const fetchAllFeedbacks = async () => {
    const data = await fetchAdminFeedbacks();
    if (!data) return;
    setShowAdminFeedback(true);
  };

  const handleFeedbackStatusUpdate = async (feedbackId, patch) => {
    const res = await fetch(`${authApiBase}/api/feedback/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: currentUser.phone, feedbackId, ...patch }),
    });
    const data = await res.json();
    if (!data.ok) {
      alert(data.message || "更新反馈状态失败");
      return false;
    }
    await fetchAdminFeedbacks();
    return true;
  };

  const handleFeedbackDelete = async (feedbackId) => {
    const res = await fetch(`${authApiBase}/api/feedback/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: currentUser.phone, feedbackId }),
    });
    const data = await res.json();
    if (!data.ok) {
      alert(data.message || "删除反馈失败");
      return false;
    }
    await fetchAdminFeedbacks();
    return true;
  };

  const handleFeedbackReply = async ({ feedbackId, letter, markResolved, images }) => {
    try {
      const optimizedImages = await optimizeUploadImages(images || []);
      const formData = new FormData();
      formData.append("phone", currentUser.phone);
      formData.append("feedbackId", feedbackId);
      formData.append("letter", letter);
      formData.append("markResolved", markResolved ? "true" : "false");
      optimizedImages.forEach((file) => formData.append("images", file));
      const res = await fetch(`${authApiBase}/api/feedback/reply`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.message || "发送回信失败");
        return false;
      }
      await fetchAdminFeedbacks();
      return true;
    } catch (error) {
      console.error("回信图片处理失败:", error);
      alert(error?.message || "图片处理失败，请稍后重试");
      return false;
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!currentUser?.phone) return alert("请先登录后再提交反馈");
    try {
      const optimizedImages = await optimizeUploadImages(feedbackImages || []);
      const formData = new FormData();
      formData.append("phone", currentUser.phone);
      formData.append("content", feedbackContent);
      optimizedImages.forEach((file) => formData.append("images", file));
      const res = await fetch(`${authApiBase}/api/feedback/submit`, { method: "POST", body: formData });
      const data = await res.json();
      if (!data.ok) return;
      alert(data.message);
      setFeedbackContent("");
      setFeedbackImages([]);
      setShowFeedback(false);
    } catch (error) {
      console.error("反馈图片处理失败:", error);
      alert(error?.message || "图片处理失败，请稍后重试");
    }
  };

  const handleUpdateNotice = async () => {
    const res = await fetch(`${authApiBase}/api/announcement/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: currentUser.phone, newContent: noticeContent }),
    });
    const data = await res.json();
    if (!data.ok) return;
    alert("已更新");
    setIsEditingNotice(false);
  };

  const handleSendCode = async () => {
    const { phone } = loginForm;
    if (!/^1\d{10}$/.test(phone)) return alert("手机号格式错误");
    const res = await fetch(`${authApiBase}/api/sms/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, type: authMode }) });
    const data = await res.json();
    if (!data.ok) return alert(data.message);
    setCountdown(60);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    const endpoint = authMode === "register" ? "/api/auth/register" : authMode === "reset" ? "/api/auth/reset-password" : "/api/auth/login";
    const res = await fetch(`${authApiBase}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loginForm) });
    const data = await res.json();
    if (!data.ok) return setLoginError(data.message || "操作失败，请重试");
    if (authMode === "login") {
      setCurrentUser(data.user);
      localStorage.setItem("haikouUser", JSON.stringify(data.user));
      return;
    }
    alert(data.message);
    setAuthMode("login");
  };

  const toggleFavorite = async (place) => {
    const pId = String(place.id);
    const isFavorited = favoriteIds.includes(pId);
    setFavoriteIds((prev) => (isFavorited ? prev.filter((id) => id !== pId) : [...prev, pId]));
    try {
      const res = await fetch(`${authApiBase}/api/favorites/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, placeId: pId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error("后端保存失败");
    } catch (error) {
      console.error("收藏操作失败:", error);
      alert("收藏操作失败，请重试");
      fetch(`${authApiBase}/api/favorites/${currentUser.phone}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) setFavoriteIds((data.favIds || []).map((id) => String(id)));
        })
        .catch((err) => console.error("收藏回滚失败:", err));
    }
  };

  const handleSetReplyTo = (comment) => {
    setReplyTo(comment);
    if (!comment) return;
    setTimeout(() => document.getElementById("comment-input-overlay")?.focus(), 0);
  };

  const closeComments = () => {
    setViewingCommentsPlace(null);
    setCommentSort("default");
    setReplyTo(null);
    setShowOnlyImages(false);
  };

  const handleOpenComments = (place) => {
    fetchComments(place.id);
    setViewingCommentsPlace(place);
  };

  const handleOpenDetail = (place, index = 0, openZoom = false) => {
    if (!openZoom) {
      setDetailPlace(place);
      return;
    }
    const album = Array.isArray(place?.album) ? place.album : [];
    const pickedImage = album[index] || album[0] || "";
    if (!pickedImage) {
      console.error("Cover preview failed: image not found", { placeId: place?.id, index });
      return;
    }
    setDetailPlace(null);
    setZoomMode(false);
    setInitialSlide(0);
    setZoomedSingleImage(pickedImage);
  };

  const handleNavigate = (place) => window.open(`https://api.map.baidu.com/direction?destination=${place.lat},${place.lng}&mode=driving&region=海口&output=html`);

  return {
    fetchRecommendations,
    fetchNotices,
    fetchComments,
    handleLogout,
    handleRefreshLocation,
    handleNoticeClick,
    handleAvatarUpload,
    fetchAllFeedbacks,
    handleFeedbackStatusUpdate,
    handleFeedbackDelete,
    handleFeedbackReply,
    handleFeedbackSubmit,
    handleUpdateNotice,
    handleSendCode,
    handleAuthSubmit,
    toggleFavorite,
    handleSetReplyTo,
    closeComments,
    handleOpenComments,
    handleOpenDetail,
    handleNavigate,
  };
}
