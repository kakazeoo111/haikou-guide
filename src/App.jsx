import React, { useEffect, useState, useRef } from "react";
import BaiduMap from "./BaiduMap";
import { places as placesData } from "./data/places";
import {
  suggestionListStyle,
  suggestionItemStyle,
  rankBadgeStyle,
  placeLikeBtnStyle,
  fullPageOverlayStyle,
  navHeaderStyle,
  sortContainerStyle,
  sortBtnStyle,
  scrollContentStyle,
  fixedBottomBarStyle,
  bottomInputContainer,
  bottomRealInput,
  feedbackItemStyle,
  zoomOverlayStyle,
  zoomedImgStyle,
  closeZoomStyle,
  swipeContainerStyle,
  swipeItemStyle,
  modalOverlayStyle,
  modalContentStyle,
  avatarStyle,
  listThumbStyle,
  categoryTagStyle,
  photoTagStyle,
  btnMainStyle,
  btnSmallStyle,
  btnDetailStyle,
  btnNavStyle,
  btnSendStyle,
  btnCancelStyle,
  btnIconStyle,
  textAreaStyle,
  floatBtnStyle,
  inputStyle,
  btnCodeStyle,
  horizontalScrollWrapper,
  albumThumbStyle,
  linkStyle,
  profilePageStyle,
  profileInfoCard,
  profileAvatarLarge,
  menuItemStyle,
  badgeStyle,
  btnLogOutStyle,
} from "./styles/appStyles";

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [targetPlaces, setTargetPlaces] = useState([]); 
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // ✅ 认证状态
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login"); 
  const [loginForm, setLoginForm] = useState({ username: "", phone: "", code: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [codeHint, setCodeHint] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // ✅ 评论与详情
  const [viewingCommentsPlace, setViewingCommentsPlace] = useState(null); 
  const [activeComments, setActiveComments] = useState({});
  const [commentSort, setCommentSort] = useState("default"); 
  const [newComment, setNewComment] = useState("");
  const [commentImages, setCommentImages] = useState([]);
  const [detailPlace, setDetailPlace] = useState(null); 
  // 在 viewingCommentsPlace 状态附近添加
  const [replyTo, setReplyTo] = useState(null); // 存储正在回复的评论对象 {id, username}
  const [expandedParentIds, setExpandedParentIds] = useState([]); // 记录哪些评论被展开了
  const [showOnlyImages, setShowOnlyImages] = useState(false); // 是否开启“仅看图片”
 
  // "home" 是地图首页，"profile" 是个人中心
  const [activeTab, setActiveTab] = useState("home");
  const [notifications, setNotifications] = useState([]);
  const [showNoticeList, setShowNoticeList] = useState(false); // 控制消息列表弹窗

  // ✅ 地点点赞数据
  const [placeStats, setPlaceStats] = useState({}); 
  const [myLikedPlaceIds, setMyLikedPlaceIds] = useState([]); 

  // ✅ 推荐功能状态
  const [recommendations, setRecommendations] = useState([]);
  const [showAddRecommend, setShowAddRecommend] = useState(false);
  const [newRec, setNewRec] = useState({ name: "", desc: "", lat: null, lng: null });
  const [recImages, setRecImages] = useState([]);
  const [recommendSuggestions, setRecommendSuggestions] = useState([]); // 搜索建议列表

  // ✅ 终极版大图查看状态
  const [zoomMode, setZoomMode] = useState(false); 
  const [initialSlide, setInitialSlide] = useState(0); 
  const [zoomedSingleImage, setZoomedSingleImage] = useState(null); 
  const scrollContainerRef = useRef(null); 

  // ✅ 公告与反馈逻辑
  const [showNotice, setShowNotice] = useState(false);
  const [noticeContent, setNoticeContent] = useState("");
  const [isEditingNotice, setIsEditingNotice] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackImage, setFeedbackImage] = useState(null); 
  const [showAdminFeedback, setShowAdminFeedback] = useState(false); 
  const [allFeedbacks, setAllFeedbacks] = useState([]); 

  const ADMIN_PHONE = "13707584213"; 
  const authApiBase = "https://api.suzcore.top";

  const formatCommentTime = (dateStr) => {
    if (!dateStr) return "刚刚";
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("haikouUser"));
    if (savedUser) setCurrentUser(savedUser);
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        null, { enableHighAccuracy: true }
      );
    }
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (zoomMode && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = window.innerWidth * initialSlide;
    }
  }, [zoomMode, initialSlide]);

 useEffect(() => {
    if (currentUser) {
      // 1. 获取收藏
      fetch(`${authApiBase}/api/favorites/${currentUser.phone}`)
        .then(res => res.json())
        .then(data => data.ok && setFavoriteIds((data.favIds || []).map(id => String(id))));
      
      // 2. 获取点赞 (把这部分也改了，解决点赞归零)
      fetch(`${authApiBase}/api/places/stats?phone=${currentUser.phone}`)
        .then(res => res.json())
        .then(data => {
            if(data.ok) {
                setPlaceStats(data.stats || {});
                setMyLikedPlaceIds((data.myLikedIds || []).map(id => String(id)));
            }
        });
      // 3. 获取推荐列表
      fetchRecommendations();

      // 4. ✅ 获取公告（检查这里！）
      fetch(`${authApiBase}/api/announcement`)
        .then(res => res.json())
        .then(data => {
          if (data.ok && data.content) { 
            setNoticeContent(data.content); 
            setShowNotice(true); // 👈 确保这一行在，公告才会弹出来
          }
        });
    }
}, [currentUser]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 页面加载或切换到个人中心时刷新
useEffect(() => {
    if (activeTab === 'profile') fetchNotices();
}, [activeTab]);

  // --- 业务逻辑函数 ---

  const fetchRecommendations = async () => {
    const res = await fetch(`${authApiBase}/api/recommendations?phone=${currentUser?.phone || ''}`);
    const data = await res.json();
    if (data.ok) setRecommendations(data.data);
  };

  // 获取消息
const fetchNotices = async () => {
    if (!currentUser) return;
    const res = await fetch(`${authApiBase}/api/notifications/${currentUser.phone}`);
    const d = await res.json();
    if (d.ok) setNotifications(d.data);
};

  const handleLogout = () => { localStorage.removeItem("haikouUser"); window.location.reload(); };

  // ✅ 处理通知点击跳转
const handleNoticeClick = (n) => {
    // 1. 在所有数据源中寻找对应的地点对象
    // 合并固定地点和推荐地点进行查找
    const allSource = [
        ...places.map(p => ({ ...p, id: String(p.id) })),
        ...recommendations.map(r => ({
            ...r,
            id: `rec_${r.id}`,
            name: r.place_name,
            album: r.image_url ? [r.image_url] : []
        }))
    ];

    const targetPlace = allSource.find(p => String(p.id) === String(n.place_id));

    if (targetPlace) {
        setShowNoticeList(false);      // 关闭消息列表弹窗
        setActiveTab("home");          // 切换回地图首页
        fetchComments(targetPlace.id); // 立即抓取该地点的评论
        setViewingCommentsPlace(targetPlace); // 弹出该地点的全屏评论页
    } else {
        alert("该地点或推荐已被分享者删除");
    }
};

  // --- 添加下面这个函数 ---
const toggleExpand = (parentId) => {
  setExpandedParentIds(prev => 
    prev.includes(parentId) ? prev.filter(id => id !== parentId) : [...prev, parentId]
  );
};

  const handleLikePlace = async (e, placeId) => {
    e.stopPropagation();
    const pId = String(placeId); // ✅ 统一转字符串
    const res = await fetch(`${authApiBase}/api/places/like`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ phone: currentUser.phone, placeId: pId }) 
    });
    const data = await res.json();
    if (data.ok) {
        // 更新点赞总数
        setPlaceStats(prev => ({ ...prev, [pId]: data.newCount }));
        // ✅ 核心修复：根据返回的 action 更新“我的点赞列表”
        setMyLikedPlaceIds(prev => 
            data.action === 'liked' ? [...prev, pId] : prev.filter(id => id !== pId)
        );
    }
  };

  // ✅ 1. 补上漏掉的评论点赞函数
  const handleLikeComment = async (e, commentId, placeId) => {
    e.stopPropagation();
    const res = await fetch(`${authApiBase}/api/comments/like`, { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ phone: currentUser.phone, commentId }) 
    });
    const data = await res.json();
    if (data.ok) fetchComments(placeId); // 重新加载该景点的评论
  };

  // ✅ 2. 修正推荐点赞函数（重点：传入真正的数字 ID）
  const handleLikeRec = async (e, recId) => {
    e.stopPropagation();
    // 这里 recId 必须是数字（realId），否则后端 SQL 会报 500 错误
    const res = await fetch(`${authApiBase}/api/recommendations/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, recId: Number(recId) }) 
    });
    if ((await res.json()).ok) fetchRecommendations(); // 刷新推荐列表数据
  };



  const handleDeleteRec = async (e, recId) => {
    e.stopPropagation();
    if(!window.confirm("确定删除这条分享吗？")) return;
    const res = await fetch(`${authApiBase}/api/recommendations/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, recId })
    });
    if((await res.json()).ok) fetchRecommendations();
  };

  const getBMap = () => window.BMapGL || window.BMap;

  const handleRecommendInputChange = (val) => {
    setNewRec({ ...newRec, name: val, lat: null, lng: null }); 
    const BMap = getBMap();
    if (!BMap) return;

    if (val.trim().length > 1) {
      const local = new BMap.LocalSearch("海口市", {
        onSearchComplete: (results) => {
          if (local.getStatus() === 0) {
            let tempSuggestions = [];
            for (let i = 0; i < results.getCurrentNumPois(); i++) {
              tempSuggestions.push(results.getPoi(i));
            }
            setRecommendSuggestions(tempSuggestions);
          }
        }
      });
      local.search(val);
    } else {
      setRecommendSuggestions([]);
    }
  };

  const selectPoi = (poi) => {
    setNewRec({
      ...newRec,
      name: poi.title,
      lat: poi.point.lat,
      lng: poi.point.lng
    });
    setRecommendSuggestions([]); 
  };

  const handleSearchLoc = () => {
    if (!newRec.name) return alert("请输入地点名称");
    const BMap = getBMap();
    if (!BMap) return alert("地图插件加载中，请稍后再试...");

    const local = new BMap.LocalSearch("海口市", {
        onSearchComplete: (results) => {
            if (local.getStatus() === 0 && results.getPoi(0)) {
                const poi = results.getPoi(0);
                setNewRec({ ...newRec, lat: poi.point.lat, lng: poi.point.lng });
                alert(`成功定位到：${poi.title}`);
            } else {
                alert("未找到该地址，请在建议列表中选择");
            }
        }
    });
    local.search(newRec.name);
  };

  const handleSubmitRec = async () => {
    if (!newRec.name || !newRec.lat) return alert("请先在建议列表中选择一个精确地点");
    const formData = new FormData();
    formData.append("phone", currentUser.phone);
    formData.append("place_name", newRec.name);
    formData.append("description", newRec.desc);
    formData.append("lat", newRec.lat);
    formData.append("lng", newRec.lng);

    // ✅ 重点：循环添加多张图片
    recImages.forEach(file => {
        formData.append("images", file); 
    });

    const res = await fetch(`${authApiBase}/api/recommendations/add`, { method: "POST", body: formData });
    const d = await res.json();
    if (d.ok) {
        alert("发布成功！");
        setShowAddRecommend(false);
        setNewRec({ name: "", desc: "", lat: null, lng: null });
        setRecImages([]); // 清空
        fetchRecommendations();
        setFilter("recommend");
    }
};

  const fetchComments = async (id) => {
    const res = await fetch(`${authApiBase}/api/comments/${id}?phone=${currentUser.phone}`);
    const data = await res.json();
    if (data.ok) setActiveComments(prev => ({ ...prev, [id]: data.comments }));
  };

  const handleAddComment = async (id) => {
    if(!newComment.trim() && commentImages.length === 0) return;
    const formData = new FormData();
    formData.append("phone", currentUser.phone);
    formData.append("placeId", id);
    formData.append("content", newComment);
    if (replyTo) formData.append("parentId", replyTo.id);

    // ✅ 重点：循环添加多张图片
    commentImages.forEach(file => {
        formData.append("images", file); 
    });

    const res = await fetch(`${authApiBase}/api/comments/add`, { method: "POST", body: formData });
    const data = await res.json();
    if (data.ok) { 
        setNewComment(""); 
        setCommentImages([]); // 发布完清空数组
        setReplyTo(null); 
        fetchComments(id); 
    }
};

  const handleDeleteComment = async (cid, pid) => {
    if (!window.confirm("确定删除？")) return;
    await fetch(`${authApiBase}/api/comments/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: currentUser.phone, commentId: cid }) });
    fetchComments(pid);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 可以在这里加个简单的加载提示
    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("phone", currentUser.phone);

    try {
        const res = await fetch(`${authApiBase}/api/user/upload-avatar`, { 
            method: "POST", 
            body: formData 
        });
        const data = await res.json();
        
        if (data.ok) {
            // ✅ 更新当前用户状态，让页面立刻显示新头像
            const updatedUser = { ...currentUser, avatar_url: data.avatarUrl };
            setCurrentUser(updatedUser);
            // ✅ 同步更新本地存储，保证刷新页面后头像还在
            localStorage.setItem("haikouUser", JSON.stringify(updatedUser));
            alert("头像更换成功！");
        } else {
            alert("上传失败：" + data.message);
        }
    } catch (err) {
        console.error("头像上传出错:", err);
        alert("网络错误，请稍后再试");
    }
};

  const fetchAllFeedbacks = async () => {
    const res = await fetch(`${authApiBase}/api/feedback/all`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: currentUser.phone }) });
    const data = await res.json();
    if (data.ok) { setAllFeedbacks(data.data); setShowAdminFeedback(true); }
  };

  const handleFeedbackSubmit = async () => {
    // ✅ 增加一个判断，防止手机号为空导致崩溃
    if (!currentUser || !currentUser.phone) {
        return alert("请先登录后再提交反馈");
    }
    
    const formData = new FormData();
    formData.append("phone", currentUser.phone);
    formData.append("content", feedbackContent);
    if (feedbackImage) formData.append("image", feedbackImage);
    const res = await fetch(`${authApiBase}/api/feedback/submit`, { method: "POST", body: formData });
    const data = await res.json();
    if (data.ok) { alert(data.message); setFeedbackContent(""); setFeedbackImage(null); setShowFeedback(false); }
  };

  const handleUpdateNotice = async () => {
    const res = await fetch(`${authApiBase}/api/announcement/update`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: currentUser.phone, newContent: noticeContent }) });
    const data = await res.json();
    if (data.ok) { alert("已更新"); setIsEditingNotice(false); }
  };

  const handleSendCode = async () => {
    const { phone } = loginForm;
    if (!/^1\d{10}$/.test(phone)) return alert("手机号格式错误");
    setIsSendingCode(true);
    const res = await fetch(`${authApiBase}/api/sms/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, type: authMode }) });
    const d = await res.json();
    if (d.ok) { setCodeHint("验证码已发"); setCountdown(60); }
    else alert(d.message);
    setIsSendingCode(false);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    let ep = authMode === "register" ? "/api/auth/register" : (authMode === "reset" ? "/api/auth/reset-password" : "/api/auth/login");
    const res = await fetch(`${authApiBase}${ep}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loginForm) });
    const d = await res.json();
    if (d.ok) {
      if (authMode === "login") { setCurrentUser(d.user); localStorage.setItem("haikouUser", JSON.stringify(d.user)); }
      else { alert(d.message); setAuthMode("login"); }
    } else alert(d.message);
  };

  const toggleFavorite = async (p) => {
    const pId = String(p.id);
    const isCurrentlyFavorited = favoriteIds.includes(pId);

    // 1. 立即更新本地 UI（实现秒变色/乐观更新）
    // 注意：这里必须使用 setFavoriteIds 而不是 setFavorites
    if (isCurrentlyFavorited) {
      setFavoriteIds(prev => prev.filter(id => id !== pId));
    } else {
      setFavoriteIds(prev => [...prev, pId]);
    }

    try {
      // 2. 发送请求给后端同步
      const res = await fetch(`${authApiBase}/api/favorites/toggle`, { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ phone: currentUser.phone, placeId: pId }) 
      });
      
      const d = await res.json();
      if (!d.ok) {
        throw new Error("后端保存失败");
      }
    } catch (err) {
      // 3. 如果请求失败，回滚状态
      console.error("操作失败:", err);
      alert("收藏操作失败，请重试");
      
      // 重新从服务器获取准确列表进行覆盖
      fetch(`${authApiBase}/api/favorites/${currentUser.phone}`)
        .then(res => res.json())
        .then(data => {
          if (data.ok) {
            setFavoriteIds((data.favIds || []).map(id => String(id)));
          }
        });
    }
  };
  const places = placesData;


    const getDist = (l1, l2) => {
    if (!l1 || !l2 || !l2.lat) return 999;
    const R = 6371;
    const dLat = (l2.lat - l1.lat) * Math.PI / 180;
    const dLng = (l2.lng - l1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(l1.lat*Math.PI/180)*Math.cos(l2.lat*Math.PI/180)*Math.sin(dLng/2)**2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2);
  };

const getFilteredPlaces = () => {
    // 1. 统一格式化所有数据源
    const allSource = [
        ...places.map(p => ({ 
            ...p, 
            id: String(p.id), // 统一ID为字符串
            distVal: getDist(userLocation, p),
            likes: placeStats[String(p.id)] || 0,
            isPlaceLiked: myLikedPlaceIds.includes(String(p.id))
        })),
        ...recommendations.map(r => ({
            ...r,
            id: `rec_${r.id}`, // 推荐地点的特殊ID格式
            realId:r.id,
            name: r.place_name,
            desc: r.description,
            type: "recommend",
            distVal: getDist(userLocation, { lat: r.lat, lng: r.lng }),
            likes: r.like_count || 0,
            isPlaceLiked: r.is_liked,
            album: r.image_url ? [r.image_url] : []
        }))
    ];

    // 2. 根据搜索词过滤
    let list = allSource.filter(p => p.name.includes(search));

    // 3. 根据分类过滤
    if (filter === "favorite") {
        // ✅ 这里的判断是关键：只要 ID 在 favorites 数组里的都显示
        return list.filter(p => favoriteIds.includes(p.id))
                   .sort((a, b) => parseFloat(a.distVal) - parseFloat(b.distVal));
    } 
    
    // ... 其他 filter 判断（top10, photo 等）保持不变，使用上面的 list 即可
    if (filter === "top10") return list.sort((a, b) => b.likes - a.likes).slice(0, 10);
    if (filter === "photo") list = list.filter(p => p.isPhotoReady);
    else if (filter !== "all") list = list.filter(p => p.type === filter);

    return list.sort((a, b) => parseFloat(a.distVal) - parseFloat(b.distVal));
};

  const filteredPlaces = getFilteredPlaces();

  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "#f4fbf6" }}>
        {/* ✅ 1. 把动画样式写在这里 */}
        <style>{`
          @keyframes miniFloatSimple {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0px); }
          }
        `}</style>
        <form onSubmit={handleAuthSubmit} style={{ width: "100%", maxWidth: "420px", background: "white", padding: "40px 30px 30px 30px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
          
          {/* ✅ 标题容器：居中对齐 */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            {/* ✅ 内部包装盒：设为 inline-block，宽度刚好包裹住四个字 */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              
              {/* ✅ 玩偶图片：绝对定位到右上角 */}
              <img 
                src="/doll.png" // 这里的路径确保指向你的图片
                style={{ 
                  position: 'absolute', 
                  bottom: '-8px',// 往上挪一点
                  right: '-55px',  // 往右边探头
                  width: '50px',   // 玩偶大小，可以根据实际效果调整
                  transform: 'rotate(0deg)', // 旋转 15 度，看起来更俏皮
                  zIndex: 1,
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))', // 给玩偶加个软阴影
                  animation: 'miniFloatSimple 3s ease-in-out infinite' // 增加微动动画
                }} 
                alt="cute-doll"
              />

              {/* ✅ 标题文字 */}
              <h2 style={{ 
                margin: 0, 
                color: "#2e6a4a", 
                fontSize: '28px', 
                fontWeight: 'bold',
                position: 'relative',
                zIndex: 2 
              }}>
                海口之行
              </h2>
            </div>
          </div>

          <input placeholder="手机号" style={inputStyle} onChange={e => setLoginForm({...loginForm, phone: e.target.value})} />
          
          {authMode !== "login" && (
            <>
              {authMode === "register" && <input placeholder="用户名" style={inputStyle} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />}
              <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                <input placeholder="验证码" style={{...inputStyle, marginBottom:0, flex:1}} onChange={e => setLoginForm({...loginForm, code: e.target.value})} />
                <button type="button" onClick={handleSendCode} disabled={countdown > 0} style={btnCodeStyle}>{countdown > 0 ? `${countdown}s` : "获取"}</button>
              </div>
            </>
          )}
          
          <input type="password" placeholder="密码" style={inputStyle} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
          {loginError && <p style={{ color: "red", fontSize: "13px" }}>{loginError}</p>}
          
          <button type="submit" style={btnMainStyle}>确定</button>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", fontSize: "14px" }}>
            <span style={linkStyle} onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>{authMode === "login" ? "注册账号" : "返回登录"}</span>
            {authMode === "login" && <span style={linkStyle} onClick={() => setAuthMode("reset")}>忘记密码？</span>}
          </div>
        </form>

        {/* ✅ 添加一个轻微浮动的动画效果 */}
        <style>{`
          @keyframes miniFloat {
            0% { transform: translateY(0px) rotate(15deg); }
            50% { transform: translateY(-5px) rotate(18deg); }
            100% { transform: translateY(0px) rotate(15deg); }
          }
        `}</style>
      </div>
    );
  }

 // 修改你代码中的这个函数
const getSortedComments = () => {
    if (!viewingCommentsPlace) return [];
    
    // 1. 获取该地点的所有原始评论数据
    let list = [...(activeComments[viewingCommentsPlace.id] || [])];

    // ✅ 2. 新增：如果开启了“仅看图片”，则过滤掉没有 image_url 的评论
    // 注意：这里我们过滤掉所有不带图的内容（包括主评论和回复）
    if (showOnlyImages) {
        list = list.filter(c => c.image_url);
    }

    // 3. 执行原有排序逻辑
    if (commentSort === "latest") {
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (commentSort === "hot") {
        list.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
    }
    
    return list;
};

  return (
  <div style={{ minHeight: "100vh", background: "#f4fbf6", position: 'relative' }}>
    
    {/* 🟢 1. 个人中心页面层 (activeTab 为 profile 时显示) */}
    {activeTab === "profile" && (
      <div style={profilePageStyle}>
        {/* 顶部导航栏 */}
        <div style={navHeaderStyle}>
          <span onClick={() => setActiveTab("home")} style={{ cursor: 'pointer', fontSize: '18px' }}>← 返回</span>
          <span style={{ fontWeight: 'bold' }}>个人中心</span>
          <span style={{ width: '40px' }}></span>
        </div>

        <div style={{ padding: '20px' }}>
          {/* 用户基础信息卡片 */}
<div style={profileInfoCard}>
    {/* ✅ 1. 给头像增加点击事件，触发隐藏的 input */}
    <div style={{ position: 'relative', display: 'inline-block' }}>
        <img 
            src={currentUser.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + currentUser.phone} 
            style={{ ...profileAvatarLarge, cursor: 'pointer' }} 
            onClick={() => document.getElementById('profile-avatar-input').click()} 
            title="点击更换头像"
        />
        {/* 右下角加个小相机图标提示（可选，会让交互更专业） */}
        <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: '#5aa77b', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', border: '2px solid white' }}>
            📷
        </div>
    </div>

    {/* ✅ 2. 隐藏的真实文件上传框 */}
    <input 
        type="file" 
        id="profile-avatar-input" 
        hidden 
        accept="image/*" 
        onChange={handleAvatarUpload} 
    />

    <h2 style={{ marginTop: '15px', color: '#2e6a4a', marginBottom: '5px' }}>{currentUser.username}</h2>
    <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>手机号：{currentUser.phone}</p>
    <p style={{ color: '#5aa77b', fontSize: '11px', marginTop: '5px' }}>点击头像可更换</p>
</div>

          {/* 功能菜单列表 */}
          <div style={{ marginTop: '20px' }}>
             <div style={menuItemStyle} onClick={() => setShowNoticeList(true)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>🔔</span> 消息回复提醒
                </div>
                {/* 动态显示未读数 */}
    {notifications.filter(n => !n.is_read).length > 0 && (
        <span style={badgeStyle}>{notifications.filter(n => !n.is_read).length}</span>
    )}
                <span style={badgeStyle}>0</span>
             </div>
             <div style={menuItemStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>🏆</span> 荣誉称号获得
                </div>
                <div style={{ fontSize: '12px', color: '#5aa77b', fontWeight: 'bold' }}>椰城探路者</div>
             </div>
             <div style={menuItemStyle} onClick={() => { setActiveTab('home'); setFilter('recommend'); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>✨</span> 我的分享记录
                </div>
                <span>❯</span>
             </div>
          </div>

          <button onClick={handleLogout} style={btnLogOutStyle}>退出当前账号</button>
        </div>
      </div>
    )}
    
    {/* 🟢 全屏评论页 */}
    {viewingCommentsPlace && (
      <div style={fullPageOverlayStyle}>
        {/* 1. 顶部导航栏 */}
        <div style={navHeaderStyle}>
          <span onClick={() => { setViewingCommentsPlace(null); setCommentSort("default"); setReplyTo(null); setShowOnlyImages(false); }} style={{ cursor: 'pointer', fontSize: '18px' }}>← 返回</span>
          <span style={{ fontWeight: 'bold' }}>{viewingCommentsPlace.name}的点评</span>
          <span style={{ width: '40px' }}></span>
        </div>

        {/* 2. 排序与筛选按钮栏 */}
        <div style={{ ...sortContainerStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => setCommentSort("latest")} style={sortBtnStyle(commentSort === "latest")}>按照最新</button>
            <button onClick={() => setCommentSort("hot")} style={sortBtnStyle(commentSort === "hot")}>按照最火</button>
          </div>
          
          <div 
            onClick={() => setShowOnlyImages(!showOnlyImages)}
            style={{ 
              fontSize: '12px', 
              color: showOnlyImages ? '#5aa77b' : '#999', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              background: showOnlyImages ? '#e8f5eb' : '#f5f5f5',
              padding: '4px 10px',
              borderRadius: '15px',
              transition: '0.2s'
            }}
          >
            {showOnlyImages ? "✅ 仅看图片" : "🖼️ 仅看图片"}
          </div>
        </div>

        {/* 3. 中间滚动内容区 */}
        <div style={scrollContentStyle}>
  {(() => {
    // 1. 获取基础数据并排序
    const allRaw = [...(activeComments[viewingCommentsPlace.id] || [])];
    if (commentSort === "latest") {
      allRaw.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (commentSort === "hot") {
      allRaw.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
    }

    // 2. 区分主评论和回复
    const parents = allRaw.filter(c => !c.parent_id); 
    const children = allRaw.filter(c => c.parent_id); 

    // ✅ 定义统一的图片渲染小组件 (解决九宫格报错的关键)
    const renderCommentImages = (imgData) => {
      if (!imgData || imgData === "[]" || imgData === "null") return null;
      try {
        // 尝试解析 JSON 数组
        let urls = [];
        if (imgData.startsWith('[')) {
          urls = JSON.parse(imgData);
        } else {
          urls = [imgData]; // 兼容以前的老单图数据
        }
        
        if (urls.length === 0) return null;
        
        return (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: urls.length === 1 ? '1fr' : (urls.length === 2 || urls.length === 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'), 
            gap: '4px', marginTop: '8px', maxWidth: '240px' 
          }}>
            {urls.map((url, i) => (
              <img key={i} src={url.replace('http://', 'https://')} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee' }} onClick={() => setZoomedSingleImage(url)} />
            ))}
          </div>
        );
      } catch (e) { return null; }
    };

    // ✅ 定义统一的头像渲染组件 (解决手机乱码的关键)
    const renderAvatar = (url, phone, size) => {
      const avatarSrc = (url && url !== 'null') 
        ? url.replace('http://', 'https://') 
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone || 'haikou'}`;
      return (
        <img src={avatarSrc} style={{ width: size, height: size, minWidth: size, minHeight: size, borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee', backgroundColor: '#f5f5f5' }} alt="u" onError={(e) => { e.target.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=error" }} />
      );
    };

    if (parents.length === 0) return <div style={{ textAlign: 'center', marginTop: '100px', color: '#bbb' }}>💬 暂无相关点评...</div>;

    return parents.map(p => {
      const myReplies = children
        .filter(c => String(c.parent_id) === String(p.id))
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const isExpanded = expandedParentIds.includes(p.id);

      return (
        <div key={p.id} style={{ marginBottom: '25px', borderBottom: '1px solid #f2f2f2', paddingBottom: '15px' }}>
          {/* 主评论 */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {renderAvatar(p.avatar_url, p.user_phone, '36px')}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>{p.username}</div>
              <div style={{ fontSize: '15px', color: '#222', margin: '4px 0' }}>{p.content}</div>
              {renderCommentImages(p.image_url)}
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '12px', color: '#999', marginTop: '10px' }}>
                <span>{formatCommentTime(p.created_at)}</span>
                <span onClick={() => { setReplyTo(p); document.getElementById('comment-input').focus(); }} style={{ cursor: 'pointer', fontWeight: 'bold', color: '#5aa77b' }}>回复</span>
                <span onClick={(e) => handleLikeComment(e, p.id, viewingCommentsPlace.id)} style={{ cursor: 'pointer', color: p.is_liked ? '#ff4d4f' : '#999' }}> {p.is_liked ? "❤️" : "🤍"} {p.like_count || 0}</span>
                {p.user_phone === currentUser.phone && <span onClick={() => handleDeleteComment(p.id, viewingCommentsPlace.id)} style={{ color: '#ff4d4f', cursor: 'pointer' }}>删除</span>}
              </div>
            </div>
          </div>

          {/* 回复区域 */}
          {myReplies.length > 0 && (
            <div style={{ marginLeft: '46px', marginTop: '10px' }}>
              {!isExpanded ? (
                <div onClick={() => toggleExpand(p.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#999', fontSize: '12px' }}>
                  <div style={{ width: '20px', height: '1px', background: '#ddd' }}></div> 展开 {myReplies.length} 条回复 ▼
                </div>
              ) : (
                <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                  {myReplies.map(reply => (
                    <div key={reply.id} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      {renderAvatar(reply.avatar_url, reply.user_phone, '24px')}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>{reply.username}</div>
                        <div style={{ fontSize: '14px', color: '#333' }}><span style={{ color: '#5aa77b' }}>回复：</span>{reply.content}</div>
                        {renderCommentImages(reply.image_url)}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#bbb', marginTop: '5px' }}>
                          <span>{formatCommentTime(reply.created_at)}</span>
                          <span onClick={(e) => handleLikeComment(e, reply.id, viewingCommentsPlace.id)} style={{ cursor: 'pointer', color: reply.is_liked ? '#ff4d4f' : '#999' }}>❤️ {reply.like_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div onClick={() => toggleExpand(p.id)} style={{ color: '#5aa77b', fontSize: '12px', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold' }}>—— 收起回复 ▲ ——</div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  })()}
  <div style={{ height: '120px' }}></div>
</div>

        {/* 4. 底部固定输入栏 */}
        <div style={fixedBottomBarStyle}>
          {replyTo && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px 8px', fontSize: '12px', color: '#5aa77b', fontWeight: 'bold' }}>
              <span>正在回复 @{replyTo.username}</span>
              <span onClick={() => setReplyTo(null)} style={{ cursor: 'pointer', color: '#999', fontSize: '16px' }}>×</span>
            </div>
          )}

          <div style={bottomInputContainer}>
            <input 
              id="comment-input" 
              value={newComment} 
              onChange={e => setNewComment(e.target.value)} 
              placeholder={replyTo ? `回复 @${replyTo.username}...` : "写点评..."} 
              style={bottomRealInput} 
            />
            <div onClick={() => document.getElementById(`c-i-page`).click()} style={{ cursor: 'pointer', fontSize: '20px' }}>🖼️</div>
            <input 
                type="file" 
                id={`c-i-page`} 
                hidden 
                multiple 
                accept="image/*" 
                onChange={e => setCommentImages(Array.from(e.target.files))} 
            />
            <button onClick={() => handleAddComment(viewingCommentsPlace.id)} style={btnSendStyle}>发布</button>
          </div>

          {commentImages.length > 0 && (
            <div style={{ fontSize: '10px', color: '#5aa77b', marginTop: '5px', fontWeight: 'bold' }}>
                📸 已选择 {commentImages.length} 张照片 (最多9张)
                <span onClick={() => setCommentImages([])} style={{ marginLeft: '10px', color: '#999', cursor: 'pointer' }}>[重选]</span>
            </div>
          )}
        </div>
      </div> 
    )}


      {/* 🟢 反馈库 (管理员版) */}
      {showAdminFeedback && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ color: '#2e6a4a', textAlign: 'center' }}>📩 反馈库</h2>
            {allFeedbacks.map(item => (
                <div key={item.id} style={feedbackItemStyle}>
                  <div style={{ fontSize: '11px', color: '#999' }}>{item.user_phone} | {new Date(item.created_at).toLocaleString()}</div>
                  <div style={{ fontSize: '14px', marginTop: '5px' }}>{item.content}</div>
                  {item.image_url && <img src={item.image_url} style={{ width: '100px', marginTop: '8px', borderRadius: '8px', cursor: 'zoom-in' }} onClick={() => setZoomedSingleImage(item.image_url)} alt="f" />}
                </div>
              ))}
            <button onClick={() => setShowAdminFeedback(false)} style={{ ...btnMainStyle, marginTop: '20px' }}>关闭</button>
          </div>
        </div>
      )}

      {/* 🟢 放大图层 */}
      {(zoomMode || zoomedSingleImage) && (
        <div style={zoomOverlayStyle} onClick={() => { setZoomMode(false); setZoomedSingleImage(null); }}>
          {zoomMode && detailPlace?.album && (
            <div ref={scrollContainerRef} style={swipeContainerStyle} onClick={(e) => e.stopPropagation()}>
              {detailPlace.album.map((img, i) => (
                <div key={i} style={swipeItemStyle} onClick={() => setZoomMode(false)}>
                  <img src={img} style={zoomedImgStyle} alt="zoom" />
                </div>
              ))}
            </div>
          )}
          {zoomedSingleImage && <img src={zoomedSingleImage} style={zoomedImgStyle} onClick={() => setZoomedSingleImage(null)} alt="single" />}
          <div style={closeZoomStyle}>×</div>
        </div>
      )}

      {/* 🟢 我要推荐弹窗 (增加了搜索建议列表) */}
      {showAddRecommend && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '400px' }}>
            <h2 style={{ color: '#2e6a4a', textAlign: 'center', marginTop: 0 }}>分享好去处</h2>
            
            <div style={{ position: 'relative', marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                   <input 
                      placeholder="地点名字 (如: 海口骑楼老街)" 
                      style={{...inputStyle, marginBottom:0, flex:1}} 
                      value={newRec.name} 
                      onChange={e => handleRecommendInputChange(e.target.value)} 
                   />
                   <button onClick={handleSearchLoc} style={{...btnCodeStyle, width:'60px'}}>定位</button>
                </div>

                {recommendSuggestions.length > 0 && (
                  <div style={suggestionListStyle}>
                    {recommendSuggestions.map((poi, idx) => (
                      <div key={idx} style={suggestionItemStyle} onClick={() => selectPoi(poi)}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{poi.title}</div>
                        <div style={{ fontSize: '10px', color: '#999' }}>{poi.address}</div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {newRec.lat && <p style={{fontSize:'10px', color:'#5aa77b', marginTop:'-10px', marginBottom:'10px'}}>✅ 定位锁定: {newRec.lat.toFixed(3)}, {newRec.lng.toFixed(3)}</p>}
            
            <textarea placeholder="推荐理由..." value={newRec.desc} onChange={e => setNewRec({...newRec, desc:e.target.value})} style={textAreaStyle} />
            
            <div style={{ marginTop: '15px' }}>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>上传实拍图 (最多9张):</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {/* 1. 循环显示已选图片的预览图 */}
                    {recImages.map((file, index) => (
                        <div key={index} style={{ position: 'relative', width: '60px', height: '60px' }}>
                            <img 
                                src={URL.createObjectURL(file)} 
                                style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover', border: '1px solid #eee' }} 
                            />
                            <div 
                                onClick={() => setRecImages(prev => prev.filter((_, i) => i !== index))}
                                style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ff4d4f', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '12px', textAlign: 'center', cursor: 'pointer', lineHeight: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                            >×</div>
                        </div>
                    ))}
                    {/* 2. 如果不满9张，显示“+”号追加 */}
                    {recImages.length < 9 && (
                        <div 
                            onClick={() => document.getElementById('rec-img-upload').click()}
                            style={{ width: '60px', height: '60px', border: '1px dashed #ccc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#ccc', cursor: 'pointer', background: '#fafafa' }}
                        >+</div>
                    )}
                </div>
                <input 
                    type="file" id="rec-img-upload" hidden multiple 
                    accept="image/png, image/jpeg, image/jpg, image/webp" 
                    onChange={e => {
                        const files = Array.from(e.target.files);
                        setRecImages(prev => [...prev, ...files].slice(0, 9));
                        e.target.value = null; // 清空选择器，保证同图可选
                    }} 
                />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
               <button onClick={() => { setShowAddRecommend(false); setRecImages([]); }} style={btnCancelStyle}>取消</button>
               <button onClick={handleSubmitRec} style={btnMainStyle}>立即发布</button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 系统公告 (优化尺寸版) */}
      {showNotice && (
        <div style={modalOverlayStyle}>
          <div style={{ 
            ...modalContentStyle, 
            width: isMobile ? '90%' : '420px', 
            maxHeight: '75vh',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}>
            <h2 style={{ color: '#2e6a4a', textAlign: 'center', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '20px' }}>
              <span style={{ fontSize: '22px' }}>✉️</span> 遇见不一样的椰城
            </h2>
            <div style={{ flex: 1, overflowY: 'auto', fontSize: '14px', color: '#555', lineHeight: '1.6', whiteSpace: 'pre-wrap', padding: '0 5px' }}>
              {noticeContent}
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              {currentUser.phone === ADMIN_PHONE && (
                <button onClick={() => { setIsEditingNotice(true); setShowNotice(false); }} style={{ ...btnSmallStyle(false), flex: 1 }}>编辑</button>
              )}
              <button onClick={() => setShowNotice(false)} style={{ ...btnMainStyle, flex: 2 }}>进入地图</button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 公告编辑页 */}
      {isEditingNotice && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle }}>
            <h2>编辑公告</h2>
            <textarea value={noticeContent} onChange={e => setNoticeContent(e.target.value)} style={{ width: '100%', height: '150px', padding: '10px' }} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setIsEditingNotice(false)} style={btnCancelStyle}>取消</button>
              <button onClick={handleUpdateNotice} style={btnMainStyle}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 详情相册 */}
      {detailPlace && (
        <div style={modalOverlayStyle} onClick={() => setDetailPlace(null)}>
          <div style={{ ...modalContentStyle }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, color: '#2e6a4a' }}>{detailPlace.name}</h2>
              <span style={{ cursor: 'pointer', fontSize: '28px' }} onClick={() => setDetailPlace(null)}>×</span>
            </div>
            <p style={{ color: '#666', fontSize: '14px', margin: '10px 0' }}>{detailPlace.desc}</p>
            <div style={horizontalScrollWrapper}>
              {detailPlace.album?.map((img, i) => (
                <img key={i} src={img} style={albumThumbStyle} onClick={() => { setInitialSlide(i); setZoomMode(true); }} alt="p" />
              ))}
            </div>
            <button onClick={() => setDetailPlace(null)} style={{ ...btnMainStyle, marginTop: '15px' }}>返回列表</button>
          </div>
        </div>
      )}

      {/* 🟢 反馈建议 */}
      {showFeedback && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '400px' }}>
            <h2 style={{ color: '#2e6a4a', textAlign: 'center' }}>反馈建议</h2>
            <textarea placeholder="您的反馈是作者最大的动力..." value={feedbackContent} onChange={e => setFeedbackContent(e.target.value)} style={textAreaStyle} />
            {feedbackImage && (
                <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                    <img src={URL.createObjectURL(feedbackImage)} style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover' }} />
                    <div onClick={() => setFeedbackImage(null)} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ff4d4f', color: 'white', borderRadius: '50%', width: '18px', height: '18px', textAlign: 'center', cursor: 'pointer' }}>×</div>
                </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
               <button onClick={() => document.getElementById('f-img-i').click()} style={btnIconStyle}>🖼️</button>
               <input type="file" id="f-img-i" hidden accept="image/*" onChange={e => setFeedbackImage(e.target.files[0])} />
               <button onClick={() => setShowFeedback(false)} style={btnCancelStyle}>取消</button>
               <button onClick={handleFeedbackSubmit} style={btnMainStyle}>提交</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔵 地图区域 (30vh) */}
      <div style={{ width: isMobile ? "100%" : "auto", height: isMobile ? "30vh" : "100%", flex: isMobile ? "none" : 1, position: "relative", zIndex: 10 }}>
        <BaiduMap targetPlaces={targetPlaces} userLocation={userLocation} />
        <button onClick={() => window.location.reload()} style={floatBtnStyle}>🎯</button>
      </div>

      {/* 🟢 消息列表弹窗 - 修正版 */}
{showNoticeList && (
  <div style={modalOverlayStyle}>
    <div style={{ ...modalContentStyle, maxHeight: '80vh', overflowY: 'auto' }}>
      {/* 1. 顶部标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>消息中心</h3>
        <span style={{ cursor: 'pointer', fontSize: '24px' }} onClick={() => setShowNoticeList(false)}>×</span>
      </div>
      
      {/* 2. 消息内容列表 */}
      {notifications.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>暂无消息</p>
      ) : (
        notifications.map(n => (
          <div 
            key={n.id} 
            onClick={() => handleNoticeClick(n)} 
            style={{ 
                padding: '15px 10px', 
                borderBottom: '1px solid #f0f0f0', 
                cursor: 'pointer', 
                background: n.is_read ? 'transparent' : '#f4fbf6', 
                borderRadius: '10px',
                marginBottom: '5px'
            }}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <img 
                  src={(n.sender_avatar && n.sender_avatar !== 'null') ? n.sender_avatar.replace('http://', 'https://') : `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.sender_phone}`} 
                  style={{ width: '32px', height: '32px', minWidth: '32px', borderRadius: '50%', objectFit: 'cover' }} 
                  alt="avatar"
                />
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', color: '#333' }}>
                        <span style={{ fontWeight: 'bold' }}>{n.sender_name}</span> 
                        {n.type === 'like_place' && " 点赞了你的分享"}
                        {n.type === 'like_comment' && " 点赞了你的评论"}
                        {n.type === 'reply' && <span style={{color:'#666'}}> 回复了你：{n.content}</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#bbb', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{formatCommentTime(n.created_at)}</span>
                        <span style={{ color: '#5aa77b' }}>点击查看 ❯</span>
                    </div>
                </div>
            </div>
          </div>
        ))
      )}
      
      {/* 3. 底部按钮区域 (并排两个按钮) */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button 
          onClick={async () => {
            await fetch(`${authApiBase}/api/notifications/read`, { 
              method: 'POST', 
              headers: {'Content-Type':'application/json'}, 
              body: JSON.stringify({phone: currentUser.phone}) 
            });
            fetchNotices();
          }}
          style={{ ...btnMainStyle, flex: 1, marginTop: 0 }}
        >
          全部已读
        </button>

        <button 
          onClick={async () => {
            if (!window.confirm("确定要清空所有消息记录吗？")) return;
            const res = await fetch(`${authApiBase}/api/notifications/clear`, { 
              method: 'POST', 
              headers: {'Content-Type':'application/json'}, 
              body: JSON.stringify({phone: currentUser.phone}) 
            });
            const d = await res.json();
            if (d.ok) {
              fetchNotices();
              alert("消息已全部清空");
            }
          }}
          style={{ ...btnMainStyle, flex: 1, marginTop: 0, background: '#ff4d4f' }}
        >
          清空全部
        </button>
      </div>

    </div> 
  </div> 
)}

      {/* 🔵 列表区域 (70vh) */}
      <div style={{ width: isMobile ? "100%" : "380px", height: isMobile ? "70vh" : "100vh", overflowY: "auto", background: "white", zIndex: 15, padding: "0", boxSizing: "border-box" }}>
        
        <div style={{ padding: "20px 20px 0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <img src={currentUser.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + currentUser.phone} style={avatarStyle} onClick={() => document.getElementById('avatar-input').click()} />
            <input type="file" id="avatar-input" hidden accept="image/*" onChange={handleAvatarUpload} />
            <div style={{ flex: 1 }}>
                {/* ✅ 给名字加上点击事件和手型光标 */}
<h3 
    onClick={() => setActiveTab("profile")} 
    style={{ margin: 0, fontSize: "16px", color: "#333", cursor: "pointer" }}
>
    {currentUser.username} <span style={{fontSize: '12px', color: '#ccc'}}>❯</span>
</h3>
                <div style={{ display: 'flex', gap: '8px', fontSize: '12px', marginTop: '2px' }}>
                    <span onClick={handleLogout} style={{ color: "#d94f5c", cursor: "pointer" }}>退出</span>
                    <span onClick={() => setShowFeedback(true)} style={{ color: "#5aa77b", cursor: "pointer" }}>反馈建议</span>
                    {currentUser.phone === ADMIN_PHONE && <span onClick={fetchAllFeedbacks} style={{ color: "#333", cursor: "pointer" }}>反馈库</span>}
                </div>
            </div>
          </div>

          <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
             <input placeholder="搜索目的地..." value={search} onChange={e => setSearch(e.target.value)} style={{...inputStyle, marginBottom:0}} />
             <button onClick={() => setShowAddRecommend(true)} style={{...btnCodeStyle, width:'100px', height:'42px', background:'#5aa77b'}}>我要推荐</button>
          </div>
        </div>

        <div style={{ position: "sticky", top: 0, background: "white", zIndex: 100, padding: "10px 20px", borderBottom: "1px solid #f0f0f0" }}>
          {/* ✅ 去掉 overflowX，增加 flexWrap: "wrap" 让它自动换行 */}
<div style={{ 
  display: "flex", 
  gap: "8px", 
  flexWrap: "wrap",      // 核心修改：允许换行
  justifyContent: "flex-start" // 按钮靠左对齐
}}>
            {[
                { k: "all", l: "全部" }, 
                { k: "recommend", l: "✨ 推荐" },
                { k: "top10", l: "🏆 榜单" }, 
                { k: "favorite", l: "⭐收藏" }, 
                { k: "food", l: "🍱美食" }, 
                { k: "view", l: "🏞️景点" }, 
                { k: "street", l: "🛍️商圈" }, 
                { k: "cafe", l: "☕咖啡" }
            ].map(item => (
              <button key={item.k} onClick={() => setFilter(item.k)} style={{ padding: "6px 12px", borderRadius: "20px", border: "none", background: filter === item.k ? "#5aa77b" : "#f0f0f0", color: filter === item.k ? "white" : "#666", cursor: "pointer", whiteSpace: "nowrap" }}>{item.l}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: "10px 20px 30px 20px" }}>
          {filteredPlaces.map((p, index) => (
            <div key={p.id} style={{ padding: "16px", background: "#f9fcf9", borderRadius: "20px", marginBottom: "15px", border: "1px solid #f0f5f1", position:'relative' }}>
              
              {filter === "top10" && (
                <div style={rankBadgeStyle(index)}>{index + 1}</div>
              )}

              {/* 用户信息栏 (仅推荐显示) */}
              {p.type === 'recommend' && (
                <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px'}}>
                   <img src={p.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + p.user_phone} style={{width:'24px', height:'24px', borderRadius:'50%'}} />
                   <span style={{fontSize:'12px', fontWeight:'bold'}}>{p.username} 分享</span>
                   <span style={{fontSize:'10px', color:'#999'}}>{formatCommentTime(p.created_at)}</span>
                   {p.user_phone === currentUser.phone && <span onClick={(e) => handleDeleteRec(e, p.realId)} style={{fontSize:'10px', color:'red', marginLeft:'auto', cursor:'pointer'}}>删除</span>}
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                 {/* 列表缩略图 */}
                 <img src={(p.album && p.album[0]) || "https://api.suzcore.top/uploads/default_place.jpg"} style={listThumbStyle} onClick={() => { setInitialSlide(0); setDetailPlace(p); setZoomMode(true); }} />
                 <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>{p.name}</h3>
                       <span onClick={() => toggleFavorite(p)} style={{ cursor: "pointer", fontSize: "22px" }}>
                        {favoriteIds.includes(String(p.id)) ? "⭐" : "☆"}
                       </span>
                    </div>
                    {/* 分类及标签 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={categoryTagStyle}>{p.type === 'food' ? '🍱 美食' : p.type === 'view' ? '🏞️ 景点' : p.type === 'cafe' ? '☕ 咖啡' : p.type === 'recommend' ? '✨ 推荐' : '🛍️ 商圈'}</span>
                      {p.isPhotoReady && <span style={photoTagStyle}>📸 可出片</span>}
                      {p.hours && <span style={{ fontSize: '11px', color: '#888' }}>🕒 {p.hours}</span>}
                      {p.phone && p.phone !== "无" && (
                        <a href={`tel:${p.phone}`} style={{ fontSize: '11px', color: '#5aa77b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>📞 {p.phone}</a>
                      )}
                    </div>
                 </div>
              </div>
              <p style={{ fontSize: "12px", color: "#777", margin: "10px 0" }}>{p.desc}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: "12px", color: "#5aa77b" }}>📏 距你：{p.distVal} km</div>
                <div onClick={(e) => p.type === 'recommend' ? handleLikeRec(e, p.realId) : handleLikePlace(e, p.id)} style={placeLikeBtnStyle(p.isPlaceLiked)}>
                    {p.isPlaceLiked ? "👍" : "🤍"} {p.likes}
                </div>
              </div>
              
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setDetailPlace(p)} style={btnDetailStyle}>🖼️ 详情</button>
                <button onClick={() => setTargetPlaces(prev => prev.some(tp => tp.id === p.id) ? prev.filter(tp => tp.id !== p.id) : [...prev, p])} style={btnSmallStyle(targetPlaces.some(tp => tp.id === p.id))}>{targetPlaces.some(tp => tp.id === p.id) ? "取消" : "标记"}</button>
                <button onClick={() => window.open(`https://api.map.baidu.com/direction?destination=${p.lat},${p.lng}&mode=driving&region=海口&output=html`)} style={btnNavStyle}>🧭 导航</button>
              </div>

              {/* 评论入口 */}
              <div onClick={() => { fetchComments(p.id); setViewingCommentsPlace(p); }} 
                   style={{ marginTop: '15px', borderTop: '1px dashed #eee', paddingTop: '10px', color: '#5aa77b', fontSize: '12px', cursor: 'pointer' }}>
                💬 查看评论区
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default App;
