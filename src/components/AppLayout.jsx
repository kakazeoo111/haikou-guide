import CommentsOverlay from "./CommentsOverlay";
import ProfileOverlay from "./ProfileOverlay";
import NoticeListModal from "./NoticeListModal";
import RecommendModal from "./RecommendModal";
import AdminFeedbackModal from "./AdminFeedbackModal";
import ZoomOverlay from "./ZoomOverlay";
import AnnouncementModal, { AnnouncementEditorModal } from "./AnnouncementModal";
import DetailModal from "./DetailModal";
import FeedbackModal from "./FeedbackModal";
import HomePanels from "./HomePanels";
import { formatCommentTime } from "../logic/placeUtils";

function AppLayout({
  activeTab,
  setActiveTab,
  currentUser,
  notifications,
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
  setShowNotice,
  isEditingNotice,
  setNoticeContent,
  setInitialSlide,
  showFeedback,
  feedbackContent,
  setFeedbackContent,
  feedbackImage,
  setFeedbackImage,
  setShowFeedback,
  showNoticeList,
  authApiBase,
  userLocation,
  targetPlaces,
  search,
  setSearch,
  filter,
  favoriteIds,
  filteredPlaces,
  setTargetPlaces,
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#f4fbf6", position: "relative" }}>
      {activeTab === "profile" && (
        <ProfileOverlay
          currentUser={currentUser}
          notifications={notifications}
          onBackHome={() => setActiveTab("home")}
          onShowNoticeList={() => setShowNoticeList(true)}
          onGoRecommend={() => {
            setActiveTab("home");
            setFilter("recommend");
          }}
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
        onZoomImage={setZoomedSingleImage}
        formatCommentTime={formatCommentTime}
      />

      <AdminFeedbackModal visible={showAdminFeedback} allFeedbacks={allFeedbacks} onClose={() => setShowAdminFeedback(false)} onZoomImage={setZoomedSingleImage} />

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
          setShowNotice(false);
        }}
        onEnterMap={() => setShowNotice(false)}
      />

      <AnnouncementEditorModal
        visible={isEditingNotice}
        noticeContent={noticeContent}
        onChange={setNoticeContent}
        onCancel={() => setIsEditingNotice(false)}
        onSave={generalHandlers.handleUpdateNotice}
      />

      <DetailModal
        place={detailPlace}
        onClose={() => setDetailPlace(null)}
        onPreviewAlbum={(index) => {
          setInitialSlide(index);
          setZoomMode(true);
        }}
      />

      <FeedbackModal
        visible={showFeedback}
        feedbackContent={feedbackContent}
        feedbackImage={feedbackImage}
        onContentChange={setFeedbackContent}
        onImageChange={setFeedbackImage}
        onImageRemove={() => setFeedbackImage(null)}
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

      <HomePanels
        isMobile={isMobile}
        userLocation={userLocation}
        targetPlaces={targetPlaces}
        currentUser={currentUser}
        adminPhone={ADMIN_PHONE}
        search={search}
        filter={filter}
        favoriteIds={favoriteIds}
        filteredPlaces={filteredPlaces}
        onRefreshLocation={() => window.location.reload()}
        onAvatarUpload={generalHandlers.handleAvatarUpload}
        onOpenProfile={() => setActiveTab("profile")}
        onLogout={generalHandlers.handleLogout}
        onShowFeedback={() => setShowFeedback(true)}
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
