import React, { useEffect, useRef, useState } from "react";
import AuthPanel from "./components/AuthPanel";
import AppLayout from "./components/AppLayout";
import { places as placesData } from "./data/places";
import { createGeneralHandlers } from "./logic/createGeneralHandlers";
import { createInteractionHandlers } from "./logic/createInteractionHandlers";
import { getFilteredPlaces } from "./logic/placeUtils";
import { useBadgeCenter } from "./logic/useBadgeCenter";

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [targetPlaces, setTargetPlaces] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState({ username: "", phone: "", code: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [viewingCommentsPlace, setViewingCommentsPlace] = useState(null);
  const [activeComments, setActiveComments] = useState({});
  const [commentSort, setCommentSort] = useState("default");
  const [newComment, setNewComment] = useState("");
  const [commentImages, setCommentImages] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [expandedParentIds, setExpandedParentIds] = useState([]);
  const [showOnlyImages, setShowOnlyImages] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [notifications, setNotifications] = useState([]);
  const [showNoticeList, setShowNoticeList] = useState(false);
  const [placeStats, setPlaceStats] = useState({});
  const [myLikedPlaceIds, setMyLikedPlaceIds] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showAddRecommend, setShowAddRecommend] = useState(false);
  const [newRec, setNewRec] = useState({ name: "", desc: "", lat: null, lng: null });
  const [recImages, setRecImages] = useState([]);
  const [recommendSuggestions, setRecommendSuggestions] = useState([]);
  const [detailPlace, setDetailPlace] = useState(null);
  const [zoomMode, setZoomMode] = useState(false);
  const [initialSlide, setInitialSlide] = useState(0);
  const [zoomedSingleImage, setZoomedSingleImage] = useState(null);
  const scrollContainerRef = useRef(null);
  const [showNotice, setShowNotice] = useState(false);
  const [noticeContent, setNoticeContent] = useState("");
  const [isEditingNotice, setIsEditingNotice] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackImage, setFeedbackImage] = useState(null);
  const [showAdminFeedback, setShowAdminFeedback] = useState(false);
  const [allFeedbacks, setAllFeedbacks] = useState([]);

  const ADMIN_PHONE = import.meta.env.VITE_ADMIN_PHONE;
  const authApiBase = import.meta.env.VITE_AUTH_API_BASE;
  const places = placesData;
  const getNoticeDismissKey = (phone) => `haikou_notice_dismissed_${phone}`;
  const { activeBadgeTitle, activeBadgeMeta, badgeSummary, showBadgePicker, openBadgePicker, closeBadgePicker, handleSelectBadge, handleManageBadge } = useBadgeCenter({
    authApiBase,
    currentUser,
    adminPhone: ADMIN_PHONE,
  });

  const generalHandlers = createGeneralHandlers({
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
    setZoomedSingleImage,
    setDetailPlace,
    setAuthMode,
  });

  const interactionHandlers = createInteractionHandlers({
    authApiBase,
    currentUser,
    newRec,
    recImages,
    viewingCommentsPlace,
    newComment,
    commentImages,
    replyTo,
    setExpandedParentIds,
    setPlaceStats,
    setMyLikedPlaceIds,
    setNewRec,
    setRecommendSuggestions,
    setShowAddRecommend,
    setRecImages,
    setFilter,
    setNewComment,
    setCommentImages,
    setReplyTo,
    fetchRecommendations: generalHandlers.fetchRecommendations,
    fetchComments: generalHandlers.fetchComments,
  });

  const filteredPlaces = getFilteredPlaces({
    places,
    recommendations,
    placeStats,
    myLikedPlaceIds,
    userLocation,
    search,
    filter,
    favoriteIds,
  });
  const currentPlaceComments = viewingCommentsPlace ? activeComments[viewingCommentsPlace.id] || [] : [];
  const handleDismissAnnouncement = () => {
    if (!currentUser?.phone) return setShowNotice(false);
    localStorage.setItem(getNoticeDismissKey(currentUser.phone), "1");
    setShowNotice(false);
  };
  const handleOpenAnnouncement = () => setShowNotice(true);

  useEffect(() => {
    if (!ADMIN_PHONE || !authApiBase) {
      console.error("缺少环境变量：VITE_ADMIN_PHONE 或 VITE_AUTH_API_BASE");
      alert("环境配置缺失：请在前端 .env 文件中配置 VITE_ADMIN_PHONE 和 VITE_AUTH_API_BASE");
    }
  }, [ADMIN_PHONE, authApiBase]);

  useEffect(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem("haikouUser"));
      if (savedUser) setCurrentUser(savedUser);
    } catch (error) {
      console.error("用户缓存解析失败:", error);
    }
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (error) => console.error("定位失败:", error),
        { enableHighAccuracy: true }
      );
    }
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!zoomMode || !scrollContainerRef.current) return;
    scrollContainerRef.current.scrollLeft = window.innerWidth * initialSlide;
  }, [zoomMode, initialSlide]);

  useEffect(() => {
    if (!currentUser) return;
    fetch(`${authApiBase}/api/favorites/${currentUser.phone}`)
      .then((res) => res.json())
      .then((data) => data.ok && setFavoriteIds((data.favIds || []).map((id) => String(id))))
      .catch((error) => console.error("获取收藏失败:", error));
    fetch(`${authApiBase}/api/places/stats?phone=${currentUser.phone}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) return;
        setPlaceStats(data.stats || {});
        setMyLikedPlaceIds((data.myLikedIds || []).map((id) => String(id)));
      })
      .catch((error) => console.error("获取点赞统计失败:", error));
    generalHandlers.fetchRecommendations();
    generalHandlers.fetchNotices();
    fetch(`${authApiBase}/api/announcement`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok || !data.content) return;
        setNoticeContent(data.content);
        const dismissed = localStorage.getItem(getNoticeDismissKey(currentUser.phone)) === "1";
        setShowNotice(!dismissed);
      })
      .catch((error) => console.error("获取公告失败:", error));
  }, [currentUser, authApiBase]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (activeTab !== "profile") return;
    generalHandlers.fetchNotices();
  }, [activeTab]);

  if (!currentUser) {
    return (
      <AuthPanel
        authMode={authMode}
        loginForm={loginForm}
        loginError={loginError}
        countdown={countdown}
        onModeChange={setAuthMode}
        onFormChange={(nextPart) => setLoginForm((prev) => ({ ...prev, ...nextPart }))}
        onSendCode={generalHandlers.handleSendCode}
        onSubmit={generalHandlers.handleAuthSubmit}
      />
    );
  }

  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentUser={currentUser}
      notifications={notifications}
      activeBadgeTitle={activeBadgeTitle}
      activeBadgeMeta={activeBadgeMeta}
      badgeSummary={badgeSummary}
      showBadgePicker={showBadgePicker}
      setShowNoticeList={setShowNoticeList}
      setFilter={setFilter}
      viewingCommentsPlace={viewingCommentsPlace}
      currentPlaceComments={currentPlaceComments}
      commentSort={commentSort}
      setCommentSort={setCommentSort}
      showOnlyImages={showOnlyImages}
      setShowOnlyImages={setShowOnlyImages}
      expandedParentIds={expandedParentIds}
      replyTo={replyTo}
      newComment={newComment}
      setNewComment={setNewComment}
      commentImages={commentImages}
      setCommentImages={setCommentImages}
      generalHandlers={generalHandlers}
      interactionHandlers={interactionHandlers}
      showAdminFeedback={showAdminFeedback}
      allFeedbacks={allFeedbacks}
      setShowAdminFeedback={setShowAdminFeedback}
      setZoomedSingleImage={setZoomedSingleImage}
      zoomMode={zoomMode}
      zoomedSingleImage={zoomedSingleImage}
      detailPlace={detailPlace}
      setDetailPlace={setDetailPlace}
      scrollContainerRef={scrollContainerRef}
      setZoomMode={setZoomMode}
      showAddRecommend={showAddRecommend}
      newRec={newRec}
      recommendSuggestions={recommendSuggestions}
      recImages={recImages}
      setNewRec={setNewRec}
      setRecImages={setRecImages}
      setShowAddRecommend={setShowAddRecommend}
      showNotice={showNotice}
      noticeContent={noticeContent}
      isMobile={isMobile}
      ADMIN_PHONE={ADMIN_PHONE}
      setIsEditingNotice={setIsEditingNotice}
      onOpenAnnouncement={handleOpenAnnouncement}
      onDismissAnnouncement={handleDismissAnnouncement}
      onManageBadge={handleManageBadge}
      onOpenBadgePicker={openBadgePicker}
      onCloseBadgePicker={closeBadgePicker}
      onSelectBadge={handleSelectBadge}
      isEditingNotice={isEditingNotice}
      setNoticeContent={setNoticeContent}
      setInitialSlide={setInitialSlide}
      showFeedback={showFeedback}
      feedbackContent={feedbackContent}
      setFeedbackContent={setFeedbackContent}
      feedbackImage={feedbackImage}
      setFeedbackImage={setFeedbackImage}
      setShowFeedback={setShowFeedback}
      showNoticeList={showNoticeList}
      authApiBase={authApiBase}
      userLocation={userLocation}
      targetPlaces={targetPlaces}
      search={search}
      setSearch={setSearch}
      filter={filter}
      favoriteIds={favoriteIds}
      filteredPlaces={filteredPlaces}
      setTargetPlaces={setTargetPlaces}
    />
  );
}

export default App;
