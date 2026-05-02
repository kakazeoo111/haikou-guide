import { appendOptimizedImagesWithThumbnails } from "./uploadImageOptimizer";
import { authFetch } from "./apiClient";

export function createInteractionHandlers(ctx) {
  const {
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
    fetchRecommendations,
    fetchComments,
  } = ctx;

  const toggleExpand = (parentId) => {
    setExpandedParentIds((prev) => (prev.includes(parentId) ? prev.filter((id) => id !== parentId) : [...prev, parentId]));
  };

  const handleLikePlace = async (e, placeId) => {
    e.stopPropagation();
    const pId = String(placeId);
    const res = await authFetch(`${authApiBase}/api/places/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: currentUser.phone, placeId: pId }),
    });
    const data = await res.json();
    if (!data.ok) return;
    setPlaceStats((prev) => ({ ...prev, [pId]: data.newCount }));
    if (data.action !== "liked" && data.action !== "unliked") {
      console.error("地点点赞接口返回异常，缺少 action:", data);
      return;
    }
    setMyLikedPlaceIds((prev) => {
      if (data.action === "liked") return Array.from(new Set([...prev, pId]));
      return prev.filter((id) => id !== pId);
    });
  };

  const handleLikeComment = async (commentId) => {
    if (!viewingCommentsPlace) return;
    const res = await authFetch(`${authApiBase}/api/comments/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: currentUser.phone, commentId }),
    });
    const data = await res.json();
    if (data.ok) fetchComments(viewingCommentsPlace.id);
  };

  const handleLikeRec = async (e, recId) => {
    e.stopPropagation();
    const res = await authFetch(`${authApiBase}/api/recommendations/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: currentUser.phone, recId: Number(recId) }),
    });
    const data = await res.json();
    if (data.ok) fetchRecommendations(false);
  };

  const handleDeleteRec = async (e, recId, confirm) => {
    e.stopPropagation();
    const accepted = await (confirm ? confirm({
      title: "删除推荐",
      message: "确定删除这条推荐吗？相关点赞和评论也会一起删除。",
    }) : Promise.resolve(window.confirm("确定删除这条分享吗？")));
    if (!accepted) return;
    const res = await authFetch(`${authApiBase}/api/recommendations/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: currentUser.phone, recId }),
    });
    const data = await res.json();
    if (!data.ok) return alert(data.message || "推荐删除失败");
    fetchRecommendations(false);
  };

  const handleRecommendInputChange = (val) => {
    setNewRec({ ...newRec, name: val, lat: null, lng: null });
    const BMap = window.BMapGL || window.BMap;
    if (!BMap) return;
    if (val.trim().length <= 1) return setRecommendSuggestions([]);
    const local = new BMap.LocalSearch("海口市", {
      onSearchComplete: (results) => {
        if (local.getStatus() !== 0) return;
        const tempSuggestions = [];
        for (let i = 0; i < results.getCurrentNumPois(); i += 1) tempSuggestions.push(results.getPoi(i));
        setRecommendSuggestions(tempSuggestions);
      },
    });
    local.search(val);
  };

  const selectPoi = (poi) => {
    setNewRec({ ...newRec, name: poi.title, lat: poi.point.lat, lng: poi.point.lng });
    setRecommendSuggestions([]);
  };

  const handleSearchLoc = () => {
    if (!newRec.name) return alert("请输入地点名称");
    const BMap = window.BMapGL || window.BMap;
    if (!BMap) return alert("地图插件加载中，请稍后再试...");
    const local = new BMap.LocalSearch("海口市", {
      onSearchComplete: (results) => {
        if (local.getStatus() !== 0 || !results.getPoi(0)) return alert("未找到该地址，请在建议列表中选择");
        const poi = results.getPoi(0);
        setNewRec({ ...newRec, lat: poi.point.lat, lng: poi.point.lng });
        alert(`成功定位到：${poi.title}`);
      },
    });
    local.search(newRec.name);
  };

  const handleSubmitRec = async () => {
    if (!newRec.name || !newRec.lat) return alert("请先在建议列表中选择一个精确地点");
    try {
      const formData = new FormData();
      formData.append("phone", currentUser.phone);
      formData.append("place_name", newRec.name);
      formData.append("description", newRec.desc);
      formData.append("lat", newRec.lat);
      formData.append("lng", newRec.lng);
      await appendOptimizedImagesWithThumbnails(formData, recImages);
      const res = await authFetch(`${authApiBase}/api/recommendations/add`, { method: "POST", body: formData });
      const data = await res.json();
      if (!data.ok) return;
      alert("发布成功！");
      setShowAddRecommend(false);
      setNewRec({ name: "", desc: "", lat: null, lng: null });
      setRecImages([]);
      fetchRecommendations(false);
      setFilter("recommend");
    } catch (error) {
      console.error("推荐图片提交失败:", error);
      alert(error?.message || "图片处理失败，请稍后重试");
    }
  };

  const handleAddComment = async () => {
    if (!viewingCommentsPlace) return;
    if (!newComment.trim() && commentImages.length === 0) return;
    try {
      const formData = new FormData();
      formData.append("phone", currentUser.phone);
      formData.append("placeId", viewingCommentsPlace.id);
      formData.append("content", newComment);
      if (replyTo) formData.append("parentId", replyTo.id);
      await appendOptimizedImagesWithThumbnails(formData, commentImages);
      const res = await authFetch(`${authApiBase}/api/comments/add`, { method: "POST", body: formData });
      const data = await res.json();
      if (!data.ok) return;
      setNewComment("");
      setCommentImages([]);
      setReplyTo(null);
      fetchComments(viewingCommentsPlace.id);
    } catch (error) {
      console.error("评论图片提交失败:", error);
      alert(error?.message || "图片处理失败，请稍后重试");
    }
  };

  const handleDeleteComment = async (commentId, confirm) => {
    if (!viewingCommentsPlace) return;
    const accepted = await (confirm ? confirm({
      title: "删除评论",
      message: "确定删除这条评论吗？如果它下面有回复，也会一起删除。",
    }) : Promise.resolve(window.confirm("确定删除？")));
    if (!accepted) return;
    const res = await authFetch(`${authApiBase}/api/comments/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: currentUser.phone, commentId }),
    });
    const data = await res.json();
    if (!data.ok) return alert(data.message || "评论删除失败");
    fetchComments(viewingCommentsPlace.id);
  };

  return {
    toggleExpand,
    handleLikePlace,
    handleLikeComment,
    handleLikeRec,
    handleDeleteRec,
    handleRecommendInputChange,
    selectPoi,
    handleSearchLoc,
    handleSubmitRec,
    handleAddComment,
    handleDeleteComment,
  };
}
