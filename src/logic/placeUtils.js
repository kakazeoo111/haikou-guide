export function formatCommentTime(dateStr) {
  if (!dateStr) return "刚刚";
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function parseRecommendationAlbum(imageUrl) {
  if (!imageUrl || imageUrl === "null" || imageUrl === "[]") return [];
  if (Array.isArray(imageUrl)) return imageUrl.map((url) => String(url).replace("http://", "https://")).filter(Boolean);
  if (typeof imageUrl === "string" && imageUrl.startsWith("[")) {
    try {
      const parsed = JSON.parse(imageUrl);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((url) => String(url).replace("http://", "https://")).filter(Boolean);
    } catch (error) {
      console.error("推荐图片解析失败:", error);
      return [];
    }
  }
  return [String(imageUrl).replace("http://", "https://")];
}

export function getDist(l1, l2) {
  if (!l1 || !l2 || !l2.lat) return 999;
  const radius = 6371;
  const dLat = ((l2.lat - l1.lat) * Math.PI) / 180;
  const dLng = ((l2.lng - l1.lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((l1.lat * Math.PI) / 180) * Math.cos((l2.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return (radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
}

export function getFilteredPlaces({ places, recommendations, placeStats, myLikedPlaceIds, userLocation, search, filter, favoriteIds, myRecommendOnly, currentUserPhone }) {
  const allSource = [
    ...places.map((p) => ({
      ...p,
      id: String(p.id),
      distVal: getDist(userLocation, p),
      likes: placeStats[String(p.id)] || 0,
      isPlaceLiked: myLikedPlaceIds.includes(String(p.id)),
    })),
    ...recommendations.map((r) => ({
      ...r,
      id: `rec_${r.id}`,
      realId: r.id,
      name: r.place_name,
      desc: r.description,
      type: "recommend",
      distVal: getDist(userLocation, { lat: r.lat, lng: r.lng }),
      likes: r.like_count || 0,
      isPlaceLiked: r.is_liked,
      album: parseRecommendationAlbum(r.image_url),
    })),
  ];

  let list = allSource.filter((p) => p.name.includes(search));
  if (myRecommendOnly) {
    list = list.filter((p) => p.type === "recommend" && String(p.user_phone || "") === String(currentUserPhone || ""));
  }
  if (filter === "favorite") return list.filter((p) => favoriteIds.includes(p.id)).sort((a, b) => parseFloat(a.distVal) - parseFloat(b.distVal));
  if (filter === "top10") return list.sort((a, b) => b.likes - a.likes).slice(0, 10);
  if (filter === "photo") list = list.filter((p) => p.isPhotoReady);
  if (filter !== "all" && filter !== "photo") list = list.filter((p) => p.type === filter);
  return list.sort((a, b) => parseFloat(a.distVal) - parseFloat(b.distVal));
}
