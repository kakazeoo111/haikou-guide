import React, { useEffect, useState, useRef } from "react";
import BaiduMap from "./BaiduMap";

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

  // --- 业务逻辑函数 ---

  const fetchRecommendations = async () => {
    const res = await fetch(`${authApiBase}/api/recommendations?phone=${currentUser?.phone || ''}`);
    const data = await res.json();
    if (data.ok) setRecommendations(data.data);
  };

  const handleLogout = () => { localStorage.removeItem("haikouUser"); window.location.reload(); };

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
    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("phone", currentUser.phone);
    const res = await fetch(`${authApiBase}/api/user/upload-avatar`, { method: "POST", body: formData });
    const data = await res.json();
    if (data.ok) {
      const updated = { ...currentUser, avatar_url: data.avatarUrl };
      setCurrentUser(updated);
      localStorage.setItem("haikouUser", JSON.stringify(updated));
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
  // ================================
  // ✅ 40个完整地点数据
  // ================================
  const places = [
        { id: 1, type: "view", isPhotoReady:true,name: "云洞图书馆", desc: "现代艺术与阅读的天堂，设计感拉满，大概率刷新绝美日落，还有文艺感十足的楼梯和角落，每一处都是拍照和沉浸阅读的绝佳场景，进去图书馆需要提前几天预约", lat: 20.091026, lng: 110.262594,hours:"10:00-22:00",phone:"19907616926",
      album:[
        "https://api.suzcore.top/uploads/places/1_1.jpg",
        "https://api.suzcore.top/uploads/places/1_2.jpg",
        "https://api.suzcore.top/uploads/places/1_3.jpg"
      ]
    },
    { id: 2, type: "view", name: "世纪大桥", desc: "横跨碧海，可以在桥头远眺，灯光璀璨，夜景唯美，是个出片的好地方", lat: 20.055302, lng: 110.326392,hours:"全天开放",phone:"无",
      album:[
        "https://api.suzcore.top/uploads/places/2_1.jpg",
        "https://api.suzcore.top/uploads/places/2_2.jpg"
      ]
    },
    { id: 3, type: "view", name: "假日海滩", desc: "沙细水清，可以在阳光下晒太阳，感受惬意的海风和悠闲度假氛围", lat: 20.038396, lng: 110.250973,hours:"全天开放",phone:"0898-68719988",
      album:[
        "https://api.suzcore.top/uploads/places/3_1.jpg",
        "https://api.suzcore.top/uploads/places/3_2.jpg"
      ]
    },
    { id: 4, type: "view",isPhotoReady:true, name: "万绿园", desc: "绿意盎然，湖边风景和林荫小道的宁静与清新是散步者的天堂", lat: 20.039770, lng: 110.320249,hours:"全天开放",phone:"0898-68511069",
      album:[
        "https://api.suzcore.top/uploads/places/4_1.jpg",
        "https://api.suzcore.top/uploads/places/4_2.jpg",
        "https://api.suzcore.top/uploads/places/4_3.jpg",
        "https://api.suzcore.top/uploads/places/4_4.jpg"
      ]
    },
    { id: 5, type: "street",isPhotoReady:true, name: "骑楼老街", desc: "充满历史韵味的街巷和南洋建筑，色彩斑斓。有很多的伴手礼销售点，还有许多地道小吃可供选择。", lat: 20.046030, lng: 110.350885,hours:"全天开放",phone:"无",
      album:[
        "https://api.suzcore.top/uploads/places/5_1.jpg",
        "https://api.suzcore.top/uploads/places/5_2.jpg",
        "https://api.suzcore.top/uploads/places/5_3.jpg"
      ]
    },
    { id: 6, type: "street", name: "日月广场免税店", desc: "购物天堂般的现代商圈，琳琅满目的免税商品，时尚亮眼的店铺与广场。", lat: 20.022236, lng: 110.353345,hours:"10:00-22:00",phone:"400-110-0100",
      album:[
        "https://api.suzcore.top/uploads/places/6_1.jpg",
        "https://api.suzcore.top/uploads/places/6_2.jpg"
      ]
    },
    { id: 7, type: "view",isPhotoReady:true, name: "天空之山", desc: "漂浮在云端的秘境，可以登顶远眺全景，旁边靠海，是个休闲打卡的理想点", lat: 20.064052, lng: 110.313215,hours:"全天开放",phone:"无",
      album:[
        "https://api.suzcore.top/uploads/places/7_1.jpg",
        "https://api.suzcore.top/uploads/places/7_2.jpg",
        "https://api.suzcore.top/uploads/places/7_3.jpg"
      ]
    },
    { id: 8, type: "view",isPhotoReady:true, name: "西秀海滩", desc: "海口目前打卡最多的海滩，蔚蓝秘境一般，好似童话的海边", lat: 20.029237, lng: 110.270513,hours:"全天开放",phone:"0898-68654616",
      album:[
        "https://api.suzcore.top/uploads/places/8_1.jpg",
        "https://api.suzcore.top/uploads/places/8_2.jpg"
      ]
    },
    { id: 9, type: "view",isPhotoReady:true, name: "观海台", desc: "临海而建，近西秀海滩，有人说像是误入了宫崎骏的童话世界。是很有名的打卡点", lat: 20.037925, lng: 110.304154,hours:"全天开放",phone:"无",
      album:[
        "https://api.suzcore.top/uploads/places/9_1.jpg",
        "https://api.suzcore.top/uploads/places/9_2.jpg"
      ]
    },
    { id: 10, type: "view",isPhotoReady:true, name: "拾贝公园", desc: "小众高级感海边，北欧风的电影感，像是被遗忘的孤独之地", lat: 20.094954, lng: 110.375914,hours:"全天开放",phone:"0898-66555888",
      album:[
        "https://api.suzcore.top/uploads/places/10_1.jpg",
        "https://api.suzcore.top/uploads/places/10_2.jpg",
        "https://api.suzcore.top/uploads/places/10_3.jpg",
        "https://api.suzcore.top/uploads/places/10_4.jpg"
      ]
    },
    { id: 11, type: "street", name: "友谊阳光城", desc: "现代商业与休闲完美融合的城市空间，阳光洒满的广场，绿意的角落和街区的时尚装置，感受都市惬意生活", lat: 20.029385, lng: 110.330482,hours:"10:00-22:30",phone:"0898-66710606",
      album:[
        "https://api.suzcore.top/uploads/places/11_1.jpg",
        "https://api.suzcore.top/uploads/places/11_2.jpg"
      ]
    },
    { id: 12, type: "street", name: "龙湖天街", desc: "海口新商场，集购物美食与娱乐于一体的潮流地标，是逛街党的天堂", lat: 20.002361, lng: 110.336522,hours:"10:00-22:00",phone:"0898-31070808",
      album:[
        "https://api.suzcore.top/uploads/places/12_1.jpg",
        "https://api.suzcore.top/uploads/places/12_2.jpg"
      ]
    },
    { id: 13, type: "street", name: "吾悦广场", desc: "曾经的辉煌商场，但依然还是城市休闲中心，感受热闹轻松的都市生活氛围", lat: 19.982740, lng: 110.345532,hours:"10:00-22:00",phone:"0898-36302333",
      album:[
        "https://api.suzcore.top/uploads/places/13_1.jpg"
      ]
    },
    { id: 14, type: "street",isPhotoReady:true, name: "自在湾", desc: "唯美临海步行街，面朝大海坐在咖啡厅拍照打卡吃饭，海风轻拂感受自在生活。", lat: 20.042410, lng: 110.314577,hours:"全天开放",phone:"无",
      album:[
        "https://api.suzcore.top/uploads/places/14_1.jpg",
        "https://api.suzcore.top/uploads/places/14_2.jpg",
        "https://api.suzcore.top/uploads/places/14_3.jpg"
      ]
    },
    { id: 15, type: "food", name: "正方华(明珠广场店)", desc: "海南特色老爸茶，每天都会有许多人包括本地居民都会来吃老爸茶，非常受欢迎的一家店。", lat: 20.035661, lng: 110.349434,hours:"06:00-21:00",phone:"18976528934",
      album:[
        "https://api.suzcore.top/uploads/places/15_1.jpg",
        "https://api.suzcore.top/uploads/places/15_2.jpg",
        "https://api.suzcore.top/uploads/places/15_3.jpg"
      ]
    },
    { id: 16, type: "food", name: "芸鹏休闲茶坊", desc: "在高登街旁，靠招牌烙饼红火，每一桌必点的烙饼，切记烙饼只有下午三点后才开放", lat: 20.00, lng: 110.35,hours:"07:00-18:30",phone:"13876049049",
      album:[
        "https://api.suzcore.top/uploads/places/16_1.jpg",
        "https://api.suzcore.top/uploads/places/16_2.jpg",
        "https://api.suzcore.top/uploads/places/16_3.jpg"
      ]
    },
    { id: 17, type: "food", name: "九记甜品(华海店)", desc: "甜品爱好者的打卡圣地，美味的甜品和精致的摆摊吸引了无数游客", lat: 20.028871, lng: 110.335004,hours:"11:00-24:00",phone:"18976258385",
      album:[
        "https://api.suzcore.top/uploads/places/17_1.jpg",
        "https://api.suzcore.top/uploads/places/17_2.jpg",
        "https://api.suzcore.top/uploads/places/17_3.jpg",
        "https://api.suzcore.top/uploads/places/17_4.jpg"
      ]
    },
    { id: 18, type: "food", name: "柿里糖水铺(世贸直营店)", desc: "地道港式糖水的温暖小天地，店内氛围十分温馨，有甜品有晚餐，可以与朋友分享甜蜜的悠闲地", lat: 20.027454, lng: 110.311212,hours:"10:30-24:00",phone:"15500985987",
      album:[
        "https://api.suzcore.top/uploads/places/18_1.jpg",
        "https://api.suzcore.top/uploads/places/18_2.jpg",
        "https://api.suzcore.top/uploads/places/18_3.jpg"
      ]
    },
    { id: 19, type: "food", name: "萝冰冰", desc: "人气甜品店，五彩缤纷的冰品加上可供小孩玩耍的一方空间，带娃与享受清凉口感两不误", lat: 20.025954, lng: 110.339806,hours:"12:00-22:30",phone:"0898-68960822",
      album:[
        "https://api.suzcore.top/uploads/places/19_1.jpg",
        "https://api.suzcore.top/uploads/places/19_2.jpg",
        "https://api.suzcore.top/uploads/places/19_3.jpg"
      ]
    },
    { id: 20, type: "food", name: "海大南门夜市", desc: "夜色下的市井烟火地，摊位琳琅目，品尝地道小吃，感受海口最地道的夜生活氛围", lat: 20.056054, lng: 110.343200,hours:"09:00-23:00",phone:"13637540649",
      album:[
        "https://api.suzcore.top/uploads/places/20_1.jpg",
        "https://api.suzcore.top/uploads/places/20_2.jpg",
        "https://api.suzcore.top/uploads/places/20_3.jpg"
      ]
    },
    { id: 21, type: "food", name: "阿娥餐饮店", desc: "老字号炸炸店，是站主最喜欢的炸炸店，物美价廉还有清爽的冰绿豆（有冬瓜意）", lat: 20.044653, lng: 110.351382,hours:"14:00-19:30",phone:"15348848123",
      album:[
        "https://api.suzcore.top/uploads/places/21_1.jpg",
        "https://api.suzcore.top/uploads/places/21_2.jpg",
        "https://api.suzcore.top/uploads/places/21_3.jpg",
        "https://api.suzcore.top/uploads/places/21_4.jpg"
      ]
    },
    { id: 22, type: "food", name: "姚记辣汤饭", desc: "海南特色街头小吃，香辣浓郁，热气腾腾，感受地道海口味道带来的烟火气息", lat: 20.049292, lng: 110.352991,hours:"06:00-21:00",phone:"13208970659",
      album:[
        "https://api.suzcore.top/uploads/places/22_1.jpg",
        "https://api.suzcore.top/uploads/places/22_2.jpg"
      ]
    },
    { id: 23, type: "food", name: "文昌邓记清补凉", desc: "清甜解暑清补凉老字号，好吃又好看，料很多，在炎热的夏天来一碗绝对是一个不错的选择", lat: 20.026083, lng: 110.080660,hours:"10:00-01:00",phone:"13337647133",
      album:[
        "https://api.suzcore.top/uploads/places/23_1.jpg",
        "https://api.suzcore.top/uploads/places/23_2.jpg"
      ]
    },
    { id: 24, type: "food", name: "美元味饮食店", desc: "市井气息浓厚，有甲子海南粉，伊面汤，粉汤，味道真的是让站主难以忘怀，是站主高中夜宵的常客，非常值得推荐的一个地方", lat: 20.010878, lng: 110.360648,hours:"05:00-24:00",phone:"13627558394",
      album:[
        "https://api.suzcore.top/uploads/places/24_1.jpg",
        "https://api.suzcore.top/uploads/places/24_2.jpg",
        "https://api.suzcore.top/uploads/places/24_3.jpg"
      ]
    },
    { id: 25, type: "food", name: "老机场陈记粉条王", desc: "正宗后安粉，肉给的很多，是在海口其他地方吃不到的正宗后安粉", lat: 20.008954, lng: 110.320581,hours:"06:30-22:00",phone:"18976057656",
      album:[
        "https://api.suzcore.top/uploads/places/25_1.jpg",
        "https://api.suzcore.top/uploads/places/25_2.jpg"
      ]
    },
    { id: 26, type: "food", name: "三爷糟粕醋", desc: "海南特色糟粕醋，独具风味的酸香开胃的糟粕醋美味，喜欢海鲜的游客可以选择，旁边还有同家的糟粕醋火锅", lat: 20.045964, lng: 110.349623,hours:"11:00-02:00",phone:"13807673135",
      album:[
        "https://api.suzcore.top/uploads/places/26_1.jpg",
        "https://api.suzcore.top/uploads/places/26_2.jpg"
      ]
    },
    { id: 27, type: "food", name: "老机场陈记粉条王(西沙店)", desc: "也是正宗后安粉，是分店，除了后安粉还有美味的肉粽，值得一试", lat: 20.025471, lng: 110.341446,hours:"06:30-22:00",phhone:"13379891077",
      album:[
        "https://api.suzcore.top/uploads/places/27_1.jpg",
        "https://api.suzcore.top/uploads/places/27_2.jpg",
        "https://api.suzcore.top/uploads/places/27_3.jpg"
      ]
    },
    { id: 28, type: "food", name: "韩汪记糟粕醋", desc: "藏在街边小巷的黄金店家，独特的糟粕醋让人感受海南的独特魅力。此外还销售糟粕醋", lat: 20.006376, lng: 110.366164,hours:"12:00-21:00",phone:"13876069866",
      album:[
        "https://api.suzcore.top/uploads/places/28_1.jpg",
        "https://api.suzcore.top/uploads/places/28_2.jpg",
        "https://api.suzcore.top/uploads/places/28_3.jpg"
      ]
    },
    { id: 29, type: "food", name: "贞姐十三小鱼煲", desc: "位于角落巷子里的美味特色鱼煲，是站主从小吃到大的东西。空心菜，竹笋和芋头梗配上美味的酱料真的让人忍不住夸赞。", lat: 20.044265, lng: 110.353645,hours:"17:00-21:30",phone:"13876011900",
      album:[
        "https://api.suzcore.top/uploads/places/29_1.jpg",
        "https://api.suzcore.top/uploads/places/29_2.jpg",
        "https://api.suzcore.top/uploads/places/29_3.jpg",
        "https://api.suzcore.top/uploads/places/29_4.jpg"
      ]
    },
    { id: 30, type: "food", name: "无名鸡饭", desc: "低调却口碑炸裂的文昌鸡店，鲜嫩多汁的鸡肉配上诱人的鸡饭产生了无数回头客", lat: 20.031529, lng: 110.340119,hours:"11:00-14:30,17:00-20:00",phone:"18876623215",
      album:[
        "https://api.suzcore.top/uploads/places/30_1.jpg"
      ]
    },
    { id: 31, type: "food", name: "肥婆兰鸡饭", desc: "香嫩的鸡肉配上醇香米饭和招牌地瓜叶，每一口都充满浓郁的本地风味", lat: 20.045125, lng: 110.350187,hours:"10:30-14:00,16:30-21:00",phone:"13518078600",
      album:[
        "https://api.suzcore.top/uploads/places/31_1.jpg",
        "https://api.suzcore.top/uploads/places/31_2.jpg"
      ]
    },
    { id: 32, type: "food", name: "白明泉椰子鸡", desc: "特色椰子鸡火锅，冒着热气的汤锅与晶莹椰子肉轻轻一勺能品出海南阳光与海风的味道，汤的味道也很让人着迷", lat: 20.032235, lng: 110.338479,hours:"12:00-02:00",phone:"无",
      album:[
        "https://api.suzcore.top/uploads/places/32_1.jpg",
        "https://api.suzcore.top/uploads/places/32_2.jpg",
        "https://api.suzcore.top/uploads/places/32_3.jpg"
      ]
    },
    { id: 33, type: "food", name: "文昌鸡椰子汤", desc: "将海南椰香与现杀的文昌鸡的鲜美融为一体，加上十分清甜的汤，不难成为游客的心之所想", lat: 20.073184, lng: 110.336362,hours:"09:00-14:00,17:00-21:30",phone:"18389883798",
      album:[
        "https://api.suzcore.top/uploads/places/33_1.jpg",
        "https://api.suzcore.top/uploads/places/33_2.jpg",
        "https://api.suzcore.top/uploads/places/33_3.jpg"
      ]
    },
    { id: 34, type: "food", name: "西天庙", desc: "热闹非凡的地道美食天堂（几乎所有的特色美食都囊括在内），可以边逛街边打卡品尝美食，", lat: 20.047292, lng: 110.346373,hours:"08:00-19:00",phone:"无",
      album:[
        "https://api.suzcore.top/uploads/places/34_1.jpg",
        "https://api.suzcore.top/uploads/places/34_2.jpg",
        "https://api.suzcore.top/uploads/places/34_3.jpg"
      ]
    },
    { id: 35, type: "cafe",isPhotoReady:true, name: "小夜盲", desc: "极具氛围的小咖啡馆，老板人很好，详情的照片是站主对象亲自拍摄，强力推荐喜欢温馨的游客前去一试", lat: 20.034977, lng: 110.346373,hours:"12:00-02:00",phone:"18976264285",
      album:[
        "https://api.suzcore.top/uploads/places/35_1.jpg",
        "https://api.suzcore.top/uploads/places/35_2.jpg",
        "https://api.suzcore.top/uploads/places/35_3.jpg",
        "https://api.suzcore.top/uploads/places/35_4.jpg"
      ]
    },
    { id: 36, type: "cafe",isPhotoReady:true, name: "工芸咖啡", desc: "海景咖啡馆。绝美海景与温暖阳光让它成为海口最难约的海景下午茶", lat: 20.061229, lng: 110.317416,hours:"10:00-24:00",phone:"18086897848",
      album:[
        "https://api.suzcore.top/uploads/places/36_1.jpg",
        "https://api.suzcore.top/uploads/places/36_2.jpg",
        "https://api.suzcore.top/uploads/places/36_3.jpg"
      ]
    },
    { id: 37, type: "cafe",isPhotoReady:true, name: "斑马院子", desc: "藏在小巷子深处的可爱小店，店里可约拍立得，还有懒人沙发，非常出片", lat: 20.031764, lng: 110.332199,hours:"14:30-19:00",phone:"187896755607",
      album:[
        "https://api.suzcore.top/uploads/places/37_1.jpg",
        "https://api.suzcore.top/uploads/places/37_2.jpg",
        "https://api.suzcore.top/uploads/places/37_3.jpg"
      ]
    },
    { id: 38, type: "cafe",isPhotoReady:true, name: "青庭咖啡", desc: "日系窗景咖啡店，在万绿园里面，一扇窗让它成为了著名的打卡点", lat: 20.041134, lng: 110.325469,hours:"10:00-21:00",phone:"0868-68553237",
      album:[
        "https://api.suzcore.top/uploads/places/38_1.jpg",
        "https://api.suzcore.top/uploads/places/38_2.jpg",
        "https://api.suzcore.top/uploads/places/38_3.jpg",
        "https://api.suzcore.top/uploads/places/38_4.jpg",
        "https://api.suzcore.top/uploads/places/38_5.jpg"
      ]
    },
    { id: 39, type: "cafe", name: "肆意茶聊", desc: "彷佛像闯进了闹市里的小森林，木质桌椅，中式茶馆，无不透露着松弛感", lat: 20.033555, lng: 110.334263,hours:"12:00-24:00",phone:"18876047119",
      album:[
        "https://api.suzcore.top/uploads/places/39_1.jpg",
        "https://api.suzcore.top/uploads/places/39_2.jpg",
        "https://api.suzcore.top/uploads/places/39_3.jpg"
      ]
    },
    { id: 40, type: "cafe", name: "盐巴saltea", desc: "城市喧嚣中的一方宁静，绿植和阳光洒落让人感到很舒服惬意。", lat: 20.027084, lng: 110.307733,hours:"11:00-19:00",phone:"18084688512",
      album:[
        "https://api.suzcore.top/uploads/places/40_1.jpg",
        "https://api.suzcore.top/uploads/places/40_2.jpg",
        "https://api.suzcore.top/uploads/places/40_3.jpg",
        "https://api.suzcore.top/uploads/places/40_4.jpg"
      ]
    },
  ];

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
             <img src={currentUser.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + currentUser.phone} style={profileAvatarLarge} />
             <h2 style={{ marginTop: '15px', color: '#2e6a4a', marginBottom: '5px' }}>{currentUser.username}</h2>
             <p style={{ color: '#999', fontSize: '13px', margin: 0 }}>手机号：{currentUser.phone}</p>
          </div>

          {/* 功能菜单列表 */}
          <div style={{ marginTop: '20px' }}>
             <div style={menuItemStyle} onClick={() => alert('功能开发中...')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>🔔</span> 消息回复提醒
                </div>
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
            const allRaw = [...(activeComments[viewingCommentsPlace.id] || [])];
            
            if (commentSort === "latest") {
              allRaw.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else if (commentSort === "hot") {
              allRaw.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
            }

            const parents = allRaw.filter(c => {
              const isParent = !c.parent_id;
              if (!showOnlyImages) return isParent;
              // 仅看图片模式：筛选带图的主评论
              return isParent && c.image_url && c.image_url !== "[]";
            });
            
            const children = allRaw.filter(c => c.parent_id); 

            if (parents.length === 0) return <div style={{ textAlign: 'center', marginTop: '100px', color: '#bbb' }}>💬 暂无相关点评...</div>;

            // 多图渲染函数
            const renderMultiImages = (imgData, size = '130px') => {
              if (!imgData || imgData === "[]") return null;
              try {
                const urls = JSON.parse(imgData);
                if (Array.isArray(urls) && urls.length > 0) {
                  return (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: urls.length === 1 ? '1fr' : (urls.length === 2 || urls.length === 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'), 
                        gap: '5px', marginTop: '8px', width: '100%', maxWidth: urls.length === 1 ? '200px' : '280px' 
                    }}>
                      {urls.map((url, i) => (
                        <img key={i} src={url} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '8px', border: '1px solid #eee' }} onClick={() => setZoomedSingleImage(url)} />
                      ))}
                    </div>
                  );
                }
              } catch (e) {
                return <img src={imgData} style={{ width: size, height: size, borderRadius: '8px', objectFit: 'cover', marginTop: '8px', border: '1px solid #eee' }} onClick={() => setZoomedSingleImage(imgData)} />;
              }
              return null;
            };

            return parents.map(p => {
              const myReplies = children
                .filter(c => String(c.parent_id) === String(p.id))
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
              const isExpanded = expandedParentIds.includes(p.id);

              return (
                <div key={p.id} style={{ marginBottom: '25px', borderBottom: '1px solid #f2f2f2', paddingBottom: '15px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <img src={p.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + p.user_phone} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>{p.username}</div>
                      <div style={{ fontSize: '15px', color: '#222', margin: '4px 0', lineHeight: '1.4' }}>{p.content}</div>
                      {renderMultiImages(p.image_url, '130px')}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '12px', color: '#999', marginTop: '10px' }}>
                        <span>{formatCommentTime(p.created_at)}</span>
                        <span onClick={() => { setReplyTo(p); document.getElementById('comment-input').focus(); }} style={{ cursor: 'pointer', fontWeight: 'bold', color: '#5aa77b' }}>回复</span>
                        <span onClick={(e) => handleLikeComment(e, p.id, viewingCommentsPlace.id)} style={{ cursor: 'pointer', color: p.is_liked ? '#ff4d4f' : '#999' }}>
                           {p.is_liked ? "❤️" : "🤍"} {p.like_count || 0}
                        </span>
                        {p.user_phone === currentUser.phone && <span onClick={() => handleDeleteComment(p.id, viewingCommentsPlace.id)} style={{ color: '#ff4d4f', cursor: 'pointer' }}>删除</span>}
                      </div>
                    </div>
                  </div>

                  {myReplies.length > 0 && (
                    <div style={{ marginLeft: '46px', marginTop: '10px' }}>
                      {!isExpanded ? (
                        <div onClick={() => toggleExpand(p.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#999', fontSize: '12px' }}>
                          <div style={{ width: '20px', height: '1px', background: '#ddd' }}></div>
                          <span>展开 {myReplies.length} 条回复 ▼</span>
                        </div>
                      ) : (
                        <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                          {myReplies.map(reply => (
                            <div key={reply.id} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                              <img src={reply.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + reply.user_phone} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>{reply.username}</div>
                                <div style={{ fontSize: '14px', color: '#333' }}>
                                  <span style={{ color: '#5aa77b', fontWeight: '500' }}>回复：</span>{reply.content}
                                </div>
                                {renderMultiImages(reply.image_url, '80px')}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#bbb', marginTop: '5px' }}>
                                  <span>{formatCommentTime(reply.created_at)}</span>
                                  <span onClick={(e) => handleLikeComment(e, reply.id, viewingCommentsPlace.id)} style={{ cursor: 'pointer', color: reply.is_liked ? '#ff4d4f' : '#999' }}>❤️ {reply.like_count || 0}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div onClick={() => toggleExpand(p.id)} style={{ color: '#5aa77b', fontSize: '12px', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold', marginTop: '5px' }}>—— 收起回复 ▲ ——</div>
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
// 这里是代码的最后，后面是样式常量定义...

// 💄 样式合集 (保持不变...)
const suggestionListStyle = { position: 'absolute', top: '45px', left: 0, width: '100%', background: 'white', border: '1px solid #eee', borderRadius: '10px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '200px', overflowY: 'auto' };
const suggestionItemStyle = { padding: '10px 15px', borderBottom: '1px solid #f9f9f9', cursor: 'pointer' };
const rankBadgeStyle = (idx) => ({ position: 'absolute', top: '-5px', left: '-5px', width: '24px', height: '24px', background: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#7dbf96', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', zIndex: 1, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' });
const placeLikeBtnStyle = (liked) => ({ cursor: 'pointer', fontSize: '12px', padding: '6px 14px', borderRadius: '20px', background: liked ? '#e8f5eb' : '#f0f0f0', color: liked ? '#2e6a4a' : '#888', fontWeight: 'bold', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '4px' });
const fullPageOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100%', background: '#f8fbf9', zIndex: 2000, display: 'flex', flexDirection: 'column' };
const navHeaderStyle = { background: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 2100 };
const sortContainerStyle = { background: 'white', padding: '8px 20px', display: 'flex', gap: '15px', borderBottom: '1px solid #eee' };
const sortBtnStyle = (active) => ({ border: 'none', background: 'transparent', fontSize: '12px', color: active ? '#5aa77b' : '#999', fontWeight: active ? 'bold' : 'normal', cursor: 'pointer', padding: '4px 0', borderBottom: active ? '2px solid #5aa77b' : '2px solid transparent' });
const scrollContentStyle = { flex: 1, overflowY: 'auto', padding: '20px' };
const fixedBottomBarStyle = { background: 'white', padding: '12px 20px', borderTop: '1px solid #eee',zIndex: 2100, // 确保在所有元素之上
  position: 'relative', // 配合 Flex 布局使用
  paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' };
const bottomInputContainer = { display: 'flex', gap: '12px', alignItems: 'center', background: '#f5f5f5', padding: '8px 16px', borderRadius: '25px' };
const bottomRealInput = { flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '14px' };
const commentCardStyle = { background: 'white', padding: '16px', borderRadius: '16px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' };
const commentAvatarStyle = { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' };
const commentImgStyle = { width: '160px', borderRadius: '10px', marginTop: '10px', display: 'block', cursor: 'zoom-in' };
const likeBtnStyle = (liked) => ({ cursor: 'pointer', padding: '4px 12px', borderRadius: '15px', background: liked ? '#ffecec' : '#f0f0f0', color: liked ? '#ff4d4f' : '#888', fontSize: '12px' });
const feedbackItemStyle = { padding: '10px', borderBottom: '1px solid #eee', background: '#f9fcf9', borderRadius: '10px', marginBottom: '10px' };
const zoomOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'black', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const zoomedImgStyle = { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' };
const closeZoomStyle = { position: 'absolute', top: '30px', right: '30px', color: 'white', fontSize: '50px', zIndex: 3100, cursor: 'pointer' };
const swipeContainerStyle = { display: 'flex', overflowX: 'auto', width: '100vw', height: '100vh', scrollSnapType: 'x mandatory' };
const swipeItemStyle = { flexShrink: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'start' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' };
const modalContentStyle = { background: 'white', width: '100%', maxWidth: '500px', borderRadius: '24px', padding: '24px' };
const avatarStyle = { width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover", border: "2px solid #5aa77b", cursor: 'pointer' };
const listThumbStyle = { width: "70px", height: "70px", borderRadius: "12px", objectFit: "cover", cursor: 'zoom-in' };
const categoryTagStyle = { fontSize: '10px', color: '#5aa77b', background: '#e8f5eb', padding: '2px 6px', borderRadius: '4px' };
const photoTagStyle = { fontSize: '10px', color: '#ff9800', background: '#fff3e0', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #ffe0b2' };
const btnMainStyle = { width: "100%", padding: "14px", background: "#5aa77b", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" };
const btnSmallStyle = (m) => ({ padding: "8px 12px", borderRadius: "8px", border: "none", background: m ? "#df6b76" : "#e8f5eb", color: m ? "white" : "#2e6a4a", fontSize: "12px", cursor: "pointer" });
const btnDetailStyle = { padding: "8px 12px", borderRadius: "8px", border: "none", background: '#e8f5eb', color: '#2e6a4a', fontSize: "12px", cursor: "pointer" };
const btnNavStyle = { padding: "8px 12px", borderRadius: "8px", border: "none", background: "#5aa77b", color: "white", fontSize: "12px", cursor: "pointer" };
const btnSendStyle = { background: '#5aa77b', color: 'white', border: 'none', borderRadius: '20px', padding: '6px 16px', cursor:'pointer', fontSize: '13px', fontWeight: 'bold' };
const btnCancelStyle = { flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #ddd', background: 'white' };
const btnIconStyle = { padding: '12px', borderRadius: '12px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '18px' }; 
const textAreaStyle = { width: '100%', height: '120px', borderRadius: '12px', padding: '12px', border: '1px solid #eee', outline: 'none' };
const floatBtnStyle = { position: "absolute", right: "15px", bottom: "15px", width: "45px", height: "45px", borderRadius: "50%", background: "white", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", fontSize: "20px", zIndex: 20 };
const inputStyle = { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "10px", border: "1px solid #ddd", boxSizing: "border-box" };
const btnCodeStyle = { background: "#7dbf96", color: "white", border: "none", borderRadius: "10px", width: "70px", fontSize: "12px" };
const horizontalScrollWrapper = { display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '15px' };
const albumThumbStyle = { height: '150px', borderRadius: '12px', flexShrink: 0 };
const linkStyle = { color: "#5aa77b", cursor: "pointer", textDecoration: "underline" };
const profilePageStyle = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100%', background: '#f8fbf9', zIndex: 3000, overflowY: 'auto' };
const profileInfoCard = { background: 'white', borderRadius: '24px', padding: '40px 20px', textAlign: 'center' };
const profileAvatarLarge = { width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #5aa77b' };
const menuItemStyle = { background: 'white', padding: '18px 20px', borderRadius: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const badgeStyle = { background: '#ff4d4f', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '10px' };
const btnLogOutStyle = { width: '100%', marginTop: '20px', padding: '15px', borderRadius: '15px', border: '1px solid #ff4d4f', color: '#ff4d4f', background: 'none', fontWeight: 'bold' };

export default App;