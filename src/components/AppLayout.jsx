import CommentsOverlay from "./CommentsOverlay";
import ProfileOverlay from "./ProfileOverlay";
import NoticeListModal from "./NoticeListModal";
import RecommendModal from "./RecommendModal";
import RoutePlannerModal from "./RoutePlannerModal";
import AdminFeedbackModal from "./AdminFeedbackModal";
import ZoomOverlay from "./ZoomOverlay";
import AnnouncementModal, { AnnouncementEditorModal } from "./AnnouncementModal";
import DetailModal from "./DetailModal";
import FeedbackModal from "./FeedbackModal";
import ForumModal from "./ForumModal";
import HomePanels from "./HomePanels";
import BadgeGrantModal from "./BadgeGrantModal";
import { formatCommentTime } from "../logic/placeUtils";

function AppLayout({
  activeTab,
  setActiveTab,
  currentUser,
  notifications,
  activeBadgeTitle,
  activeBadgeMeta,
  badgeSummary,
  showBadgePicker,
  setShowNoticeList,
  setFilter,
  viewingCommentsPlace,
  currentPlaceComments,
  commentSort,
  setCommentSort,
  showOnlyImages,
  setShowOnlyImages,
  expandedParentIds,
  replyTo,
  newComment,
  setNewComment,
  commentImages,
  setCommentImages,
  generalHandlers,
  interactionHandlers,
  showAdminFeedback,
  allFeedbacks,
  setShowAdminFeedback,
  setZoomedSingleImage,
  zoomMode,
  zoomedSingleImage,
  detailPlace,
  setDetailPlace,
  scrollContainerRef,
  setZoomMode,
  showAddRecommend,
  newRec,
  recommendSuggestions,
  recImages,
  setNewRec,
  setRecImages,
  setShowAddRecommend,
  showNotice,
  noticeContent,
  isMobile,
  ADMIN_PHONE,
  setIsEditingNotice,
  onOpenAnnouncement,
  onDismissAnnouncement,
  isEditingNotice,
  setNoticeContent,
  setInitialSlide,
  showFeedback,
  feedbackContent,
  setFeedbackContent,
  feedbackImages,
  setFeedbackImages,
  setShowFeedback,
  showRoutePlanner,
  setShowRoutePlanner,
  showNoticeList,
  authApiBase,
  userLocation,
  targetPlaces,
  search,
  setSearch,
  filter,
  favoriteIds,
  favoritePlacesForRoute,
  filteredPlaces,
  setTargetPlaces,
  onManageBadge,
  showBadgeGrantModal,
  onCloseManageBadgeModal,
  onSubmitManageBadge,
  onOpenBadgePicker,
  onCloseBadgePicker,
  onSelectBadge,
}) {
  const unreadCount = notifications.filter((notice) => !notice.is_read).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f4fbf6", position: "relative" }}>
      {activeTab === "profile" && (
        <ProfileOverlay
          currentUser={currentUser}
          notifications={notifications}
          activeBadgeTitle={activeBadgeTitle}
          activeBadgeMeta={activeBadgeMeta}
          badgeSummary={badgeSummary}
          showBadgePicker={showBadgePicker}
          onBackHome={() => setActiveTab("home")}
          onShowNoticeList={() => setShowNoticeList(true)}
          onOpenBadgePicker={onOpenBadgePicker}
          onCloseBadgePicker={onCloseBadgePicker}
          onSelectBadge={onSelectBadge}
          authApiBase={authApiBase}
          onAvatarUpload={generalHandlers.handleAvatarUpload}
          onLogout={generalHandlers.handleLogout}
        />
      )}

      <CommentsOverlay
        place={viewingCommentsPlace}
        comments={currentPlaceComments}
        commentSort={commentSort}
        showOnlyImages={showOnlyImages}
        expandedParentIds={expandedParentIds}
        currentUser={currentUser}
        activeBadgeTitle={activeBadgeTitle}
        activeBadgeMeta={activeBadgeMeta}
        replyTo={replyTo}
        newComment={newComment}
        commentImages={commentImages}
        onClose={generalHandlers.closeComments}
        onCommentSortChange={setCommentSort}
        onToggleShowOnlyImages={() => setShowOnlyImages((prev) => !prev)}
        onToggleExpand={interactionHandlers.toggleExpand}
        onSetReplyTo={generalHandlers.handleSetReplyTo}
        onNewCommentChange={setNewComment}
        onCommentImagesChange={setCommentImages}
        onAddComment={interactionHandlers.handleAddComment}
        onLikeComment={interactionHandlers.handleLikeComment}
        onDeleteComment={interactionHandlers.handleDeleteComment}
        onZoomImage={(images, index) => {
          setZoomedSingleImage({ images, index });
          setInitialSlide(index || 0);
          setZoomMode(true);
        }}
        formatCommentTime={formatCommentTime}
      />

      <AdminFeedbackModal
        visible={showAdminFeedback}
        allFeedbacks={allFeedbacks}
        onClose={() => setShowAdminFeedback(false)}
        onZoomImage={setZoomedSingleImage}
        onUpdateStatus={generalHandlers.handleFeedbackStatusUpdate}
        onDeleteFeedback={generalHandlers.handleFeedbackDelete}
        onSendReply={generalHandlers.handleFeedbackReply}
      />

      <BadgeGrantModal visible={showBadgeGrantModal} onClose={onCloseManageBadgeModal} onSubmit={onSubmitManageBadge} />

      <ZoomOverlay
        visible={zoomMode || !!zoomedSingleImage}
        zoomMode={zoomMode}
        detailPlace={detailPlace}
        zoomedSingleImage={zoomedSingleImage}
        scrollContainerRef={scrollContainerRef}
        onClose={() => {
          setZoomMode(false);
          setZoomedSingleImage(null);
        }}
      />

      <RecommendModal
        visible={showAddRecommend}
        newRec={newRec}
        recommendSuggestions={recommendSuggestions}
        recImages={recImages}
        onInputChange={interactionHandlers.handleRecommendInputChange}
        onSearchLoc={interactionHandlers.handleSearchLoc}
        onSelectPoi={interactionHandlers.selectPoi}
        onDescChange={(desc) => setNewRec((prev) => ({ ...prev, desc }))}
        onImagesChange={setRecImages}
        onImageRemove={(index) => setRecImages((prev) => prev.filter((_, i) => i !== index))}
        onClose={() => {
          setShowAddRecommend(false);
          setRecImages([]);
        }}
        onSubmit={interactionHandlers.handleSubmitRec}
      />

      <AnnouncementModal
        visible={showNotice}
        noticeContent={noticeContent}
        isMobile={isMobile}
        isAdmin={currentUser.phone === ADMIN_PHONE}
        onEdit={() => {
          setIsEditingNotice(true);
          onDismissAnnouncement();
        }}
        onEnterMap={onDismissAnnouncement}
      />

      <AnnouncementEditorModal
        visible={isEditingNotice}
        noticeContent={noticeContent}
        onChange={setNoticeContent}
        onCancel={() => setIsEditingNotice(false)}
        onSave={generalHandlers.handleUpdateNotice}
      />

      <DetailModal
        place={zoomMode ? null : detailPlace}
        onClose={() => setDetailPlace(null)}
        onPreviewAlbum={(index) => {
          const albumImages = Array.isArray(detailPlace?.album) ? detailPlace.album : [];
          if (albumImages.length === 0) {
            console.error("Detail preview failed: album is empty", { placeId: detailPlace?.id, index });
            return;
          }
          setZoomedSingleImage({ images: albumImages, index });
          setInitialSlide(index);
          setZoomMode(true);
        }}
      />

      <FeedbackModal
        visible={showFeedback}
        feedbackContent={feedbackContent}
        feedbackImages={feedbackImages}
        onContentChange={setFeedbackContent}
        onImageChange={(nextFiles) => setFeedbackImages((prev) => [...prev, ...nextFiles])}
        onImageRemove={(index) => setFeedbackImages((prev) => prev.filter((_, i) => i !== index))}
        onCancel={() => setShowFeedback(false)}
        onSubmit={generalHandlers.handleFeedbackSubmit}
      />

      <NoticeListModal
        visible={showNoticeList}
        notifications={notifications}
        currentUser={currentUser}
        authApiBase={authApiBase}
        onClose={() => setShowNoticeList(false)}
        onNoticeClick={generalHandlers.handleNoticeClick}
        onRefresh={generalHandlers.fetchNotices}
        formatCommentTime={formatCommentTime}
      />

      <RoutePlannerModal visible={showRoutePlanner} favoritePlaces={favoritePlacesForRoute} userLocation={userLocation} onClose={() => setShowRoutePlanner(false)} />

      {activeTab === "forum" && (
        <ForumModal
          currentUser={currentUser}
          authApiBase={authApiBase}
          activeBadgeTitle={activeBadgeTitle}
          activeBadgeMeta={activeBadgeMeta}
          onBack={() => setActiveTab("home")}
          onZoomImage={(images, index) => {
            setZoomedSingleImage({ images, index });
            setInitialSlide(index || 0);
            setZoomMode(true);
          }}
          formatCommentTime={formatCommentTime}
        />
      )}

      <HomePanels
        isMobile={isMobile}
        userLocation={userLocation}
        targetPlaces={targetPlaces}
        currentUser={currentUser}
        adminPhone={ADMIN_PHONE}
        activeBadgeTitle={activeBadgeTitle}
        activeBadgeMeta={activeBadgeMeta}
        unreadCount={unreadCount}
        search={search}
        filter={filter}
        favoriteIds={favoriteIds}
        filteredPlaces={filteredPlaces}
        onRefreshLocation={() => window.location.reload()}
        onAvatarUpload={generalHandlers.handleAvatarUpload}
        onOpenProfile={() => setActiveTab("profile")}
        onLogout={generalHandlers.handleLogout}
        onShowFeedback={() => setShowFeedback(true)}
        onShowAnnouncement={onOpenAnnouncement}
        onShowForum={() => setActiveTab("forum")}
        onOpenRoutePlanner={() => setShowRoutePlanner(true)}
        onManageBadge={onManageBadge}
        onFetchAllFeedbacks={generalHandlers.fetchAllFeedbacks}
        onSearchChange={setSearch}
        onShowRecommendModal={() => setShowAddRecommend(true)}
        onFilterChange={setFilter}
        onDeleteRec={interactionHandlers.handleDeleteRec}
        onToggleFavorite={generalHandlers.toggleFavorite}
        onOpenDetail={generalHandlers.handleOpenDetail}
        onToggleTarget={(place) => setTargetPlaces((prev) => (prev.some((target) => target.id === place.id) ? prev.filter((target) => target.id !== place.id) : [...prev, place]))}
        onLikePlace={interactionHandlers.handleLikePlace}
        onLikeRec={interactionHandlers.handleLikeRec}
        onOpenComments={generalHandlers.handleOpenComments}
        onNavigate={generalHandlers.handleNavigate}
        formatCommentTime={formatCommentTime}
      />
    </div>
  );
}

export default AppLayout;
