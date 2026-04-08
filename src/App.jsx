import React, { useEffect, useMemo, useRef, useState } from "react";
import AuthPanel from "./components/AuthPanel";
import AppLayout from "./components/AppLayout";
import { places as placesData } from "./data/places";
import { createGeneralHandlers } from "./logic/createGeneralHandlers";
import { createInteractionHandlers } from "./logic/createInteractionHandlers";
import { getAllSourcePlaces, getFilteredPlaces } from "./logic/placeUtils";
import { useCountdown, useInitClientState, useRecommendJumpListener, useValidateEnv } from "./logic/useAppBootstraps";
import { useBadgeCenter } from "./logic/useBadgeCenter";
import { APP_CACHE_TTL_MS, readCachedValue, writeCachedValue } from "./logic/clientCache";
function hasValidRouteCoordinate(place) { return Number.isFinite(Number(place?.lat)) && Number.isFinite(Number(place?.lng)); }
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
  const [feedbackImages, setFeedbackImages] = useState([]);
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [showAdminFeedback, setShowAdminFeedback] = useState(false);
  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const ADMIN_PHONE = import.meta.env.VITE_ADMIN_PHONE;
  const authApiBase = import.meta.env.VITE_AUTH_API_BASE;
  const places = placesData;
  const getNoticeDismissKey = (phone) => `haikou_notice_dismissed_${phone}`;
  useValidateEnv(ADMIN_PHONE, authApiBase);
  useInitClientState({ setCurrentUser, setActiveTab, setIsMobile, setUserLocation });
  useCountdown(countdown, setCountdown);
  useRecommendJumpListener({ setViewingCommentsPlace, setActiveTab, setFilter, setSearch });
  const { activeBadgeTitle, activeBadgeMeta, badgeSummary, showBadgePicker, showBadgeGrantModal, openBadgePicker, closeBadgePicker, handleSelectBadge, handleManageBadge, closeManageBadgeModal, submitManageBadge } =
    useBadgeCenter({ authApiBase, currentUser, adminPhone: ADMIN_PHONE });
  const generalHandlers = createGeneralHandlers({
    authApiBase, currentUser, places, recommendations, loginForm, authMode, noticeContent, feedbackContent, feedbackImages, favoriteIds,
    setRecommendations, setNotifications, setActiveComments, setShowNoticeList, setActiveTab, setViewingCommentsPlace, setCurrentUser, setUserLocation,
    setAllFeedbacks, setShowAdminFeedback, setFeedbackContent, setFeedbackImages, setShowFeedback, setIsEditingNotice, setCountdown, setLoginError,
    setFavoriteIds, setCommentSort, setReplyTo, setShowOnlyImages, setInitialSlide, setZoomMode, setZoomedSingleImage, setDetailPlace, setAuthMode,
  });
  const interactionHandlers = createInteractionHandlers({
    authApiBase, currentUser, newRec, recImages, viewingCommentsPlace, newComment, commentImages, replyTo, setExpandedParentIds, setPlaceStats, setMyLikedPlaceIds,
    setNewRec, setRecommendSuggestions, setShowAddRecommend, setRecImages, setFilter, setNewComment, setCommentImages, setReplyTo,
    fetchRecommendations: generalHandlers.fetchRecommendations, fetchComments: generalHandlers.fetchComments,
  });

  const filteredPlaces = useMemo(
    () =>
      getFilteredPlaces({
        places,
        recommendations,
        placeStats,
        myLikedPlaceIds,
        userLocation,
        search,
        filter,
        favoriteIds,
      }),
    [places, recommendations, placeStats, myLikedPlaceIds, userLocation, search, filter, favoriteIds],
  );
  const currentPlaceComments = useMemo(
    () => (viewingCommentsPlace ? activeComments[viewingCommentsPlace.id] || [] : []),
    [viewingCommentsPlace, activeComments],
  );
  const favoritePlacesForRoute = useMemo(() => {
    const favoriteOrderMap = new Map(favoriteIds.map((id, index) => [String(id), index]));
    return getAllSourcePlaces({ places, recommendations, placeStats, myLikedPlaceIds, userLocation })
      .filter((place) => favoriteOrderMap.has(String(place.id)))
      .filter(hasValidRouteCoordinate)
      .sort((a, b) => favoriteOrderMap.get(String(a.id)) - favoriteOrderMap.get(String(b.id)));
  }, [places, recommendations, placeStats, myLikedPlaceIds, userLocation, favoriteIds]);

  const handleDismissAnnouncement = () => {
    if (!currentUser?.phone) return setShowNotice(false);
    localStorage.setItem(getNoticeDismissKey(currentUser.phone), "1");
    setShowNotice(false);
  };
  const handleOpenAnnouncement = () => setShowNotice(true);
  useEffect(() => {
    if (!zoomMode || !scrollContainerRef.current) return;
    scrollContainerRef.current.scrollLeft = window.innerWidth * initialSlide;
  }, [zoomMode, initialSlide]);
  useEffect(() => localStorage.setItem("haikou_active_tab", activeTab), [activeTab]);

  useEffect(() => {
    const phone = currentUser?.phone;
    if (!phone) return;
    const cachedFavorites = readCachedValue(`favorites_${phone}`, APP_CACHE_TTL_MS.favorites);
    const cachedStats = readCachedValue(`place_stats_${phone}`, APP_CACHE_TTL_MS.placeStats);
    const cachedAnnouncement = readCachedValue("announcement", APP_CACHE_TTL_MS.announcement);
    if (cachedFavorites?.ok) setFavoriteIds((cachedFavorites.favIds || []).map((id) => String(id)));
    if (cachedStats?.ok) {
      setPlaceStats(cachedStats.stats || {});
      setMyLikedPlaceIds((cachedStats.myLikedIds || []).map((id) => String(id)));
    }
    if (cachedAnnouncement?.ok && cachedAnnouncement.content) {
      setNoticeContent(cachedAnnouncement.content);
      setShowNotice(localStorage.getItem(getNoticeDismissKey(phone)) !== "1");
    }
    fetch(`${authApiBase}/api/favorites/${phone}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) return;
        setFavoriteIds((data.favIds || []).map((id) => String(id)));
        writeCachedValue(`favorites_${phone}`, data);
      })
      .catch((error) => console.error("获取收藏失败:", error));
    fetch(`${authApiBase}/api/places/stats?phone=${phone}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) return;
        setPlaceStats(data.stats || {});
        setMyLikedPlaceIds((data.myLikedIds || []).map((id) => String(id)));
        writeCachedValue(`place_stats_${phone}`, data);
      })
      .catch((error) => console.error("获取点赞统计失败:", error));
    generalHandlers.fetchRecommendations();
    generalHandlers.fetchNotices();
    fetch(`${authApiBase}/api/announcement`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok || !data.content) return;
        setNoticeContent(data.content);
        writeCachedValue("announcement", data);
        setShowNotice(localStorage.getItem(getNoticeDismissKey(phone)) !== "1");
      })
      .catch((error) => console.error("获取公告失败:", error));
  }, [currentUser?.phone, authApiBase]);
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
      activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} notifications={notifications} activeBadgeTitle={activeBadgeTitle} activeBadgeMeta={activeBadgeMeta}
      badgeSummary={badgeSummary} showBadgePicker={showBadgePicker} setShowNoticeList={setShowNoticeList} setFilter={setFilter} viewingCommentsPlace={viewingCommentsPlace}
      currentPlaceComments={currentPlaceComments} commentSort={commentSort} setCommentSort={setCommentSort} showOnlyImages={showOnlyImages} setShowOnlyImages={setShowOnlyImages}
      expandedParentIds={expandedParentIds} replyTo={replyTo} newComment={newComment} setNewComment={setNewComment} commentImages={commentImages} setCommentImages={setCommentImages}
      generalHandlers={generalHandlers} interactionHandlers={interactionHandlers} showAdminFeedback={showAdminFeedback} allFeedbacks={allFeedbacks} setShowAdminFeedback={setShowAdminFeedback}
      setZoomedSingleImage={setZoomedSingleImage} zoomMode={zoomMode} zoomedSingleImage={zoomedSingleImage} detailPlace={detailPlace} setDetailPlace={setDetailPlace}
      scrollContainerRef={scrollContainerRef} setZoomMode={setZoomMode} showAddRecommend={showAddRecommend} newRec={newRec} recommendSuggestions={recommendSuggestions} recImages={recImages}
      setNewRec={setNewRec} setRecImages={setRecImages} setShowAddRecommend={setShowAddRecommend} showNotice={showNotice} noticeContent={noticeContent} isMobile={isMobile}
      ADMIN_PHONE={ADMIN_PHONE} setIsEditingNotice={setIsEditingNotice} onOpenAnnouncement={handleOpenAnnouncement} onDismissAnnouncement={handleDismissAnnouncement}
      onManageBadge={handleManageBadge} showBadgeGrantModal={showBadgeGrantModal} onCloseManageBadgeModal={closeManageBadgeModal} onSubmitManageBadge={submitManageBadge}
      onOpenBadgePicker={openBadgePicker} onCloseBadgePicker={closeBadgePicker} onSelectBadge={handleSelectBadge} isEditingNotice={isEditingNotice} setNoticeContent={setNoticeContent}
      setInitialSlide={setInitialSlide} showFeedback={showFeedback} feedbackContent={feedbackContent} setFeedbackContent={setFeedbackContent} feedbackImages={feedbackImages}
      setFeedbackImages={setFeedbackImages} setShowFeedback={setShowFeedback} showRoutePlanner={showRoutePlanner} setShowRoutePlanner={setShowRoutePlanner}
      showNoticeList={showNoticeList} authApiBase={authApiBase} userLocation={userLocation} targetPlaces={targetPlaces} search={search} setSearch={setSearch} filter={filter}
      favoriteIds={favoriteIds} favoritePlacesForRoute={favoritePlacesForRoute} filteredPlaces={filteredPlaces} setTargetPlaces={setTargetPlaces}
    />
  );
}

export default App;
