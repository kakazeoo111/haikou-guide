import { parseRecommendationAlbum } from "./placeUtils";

export function createGeneralHandlers(ctx) {
  const {
    authApiBase,
    currentUser,
    places,
    recommendations,
    loginForm,
    authMode,
    noticeContent,
    feedbackContent,
    feedbackImage,
    favoriteIds,
    setRecommendations,
    setNotifications,
    setActiveComments,
    setShowNoticeList,
    setActiveTab,
    setViewingCommentsPlace,
    setCurrentUser,
    setAllFeedbacks,
    setShowAdminFeedback,
    setFeedbackContent,
    setFeedbackImage,
    setShowFeedback,
    setIsEditingNotice,
    setCountdown,
    setLoginError,
    setFavoriteIds,
    setCommentSort,
    setReplyTo,
    setShowOnlyImages,
    setInitialSlide,
    setZoomMode,
    setDetailPlace,
    setAuthMode,
  } = ctx;

  const fetchRecommendations = async () => {
    const res = await fetch(`${authApiBase}/api/recommendations?phone=${currentUser?.phone || ""}`);
    const data = await res.json();
    if (data.ok) setRecommendations(data.data);
  };

  const fetchNotices = async () => {
    if (!currentUser) return;
    const res = await fetch(`${authApiBase}/api/notifications/${currentUser.phone}`);
    const data = await res.json();
    if (data.ok) setNotifications(data.data);
  };

  const fetchComments = async (id) => {
    const res = await fetch(`${authApiBase}/api/comments/${id}?phone=${currentUser.phone}`);
    const data = await res.json();
    if (data.ok) setActiveComments((prev) => ({ ...prev, [id]: data.comments }));
  };

  const handleLogout = () => {
    localStorage.removeItem("haikouUser");
    window.location.reload();
  };

  const handleNoticeClick = (notice) => {
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
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("phone", currentUser.phone);
    try {
      const res = await fetch(`${authApiBase}/api/user/upload-avatar`, { method: "POST", body: formData });
      const data = await res.json();
      if (!data.ok) return alert(`上传失败：${data.message || "未知错误"}`);
      const updatedUser = { ...currentUser, avatar_url: data.avatarUrl };
      setCurrentUser(updatedUser);
      localStorage.setItem("haikouUser", JSON.stringify(updatedUser));
      alert("头像更换成功！");
    } catch (error) {
      console.error("头像上传出错:", error);
      alert("网络错误，请稍后再试");
    }
  };

  const fetchAllFeedbacks = async () => {
    const res = await fetch(`${authApiBase}/api/feedback/all`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: currentUser.phone }) });
    const data = await res.json();
    if (!data.ok) return;
    setAllFeedbacks(data.data);
    setShowAdminFeedback(true);
  };

  const handleFeedbackSubmit = async () => {
    if (!currentUser?.phone) return alert("请先登录后再提交反馈");
    const formData = new FormData();
    formData.append("phone", currentUser.phone);
    formData.append("content", feedbackContent);
    if (feedbackImage) formData.append("image", feedbackImage);
    const res = await fetch(`${authApiBase}/api/feedback/submit`, { method: "POST", body: formData });
    const data = await res.json();
    if (!data.ok) return;
    alert(data.message);
    setFeedbackContent("");
    setFeedbackImage(null);
    setShowFeedback(false);
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
    setDetailPlace(place);
    if (!openZoom) return;
    setInitialSlide(index);
    setZoomMode(true);
  };

  const handleNavigate = (place) => window.open(`https://api.map.baidu.com/direction?destination=${place.lat},${place.lng}&mode=driving&region=海口&output=html`);

  return {
    fetchRecommendations,
    fetchNotices,
    fetchComments,
    handleLogout,
    handleNoticeClick,
    handleAvatarUpload,
    fetchAllFeedbacks,
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
