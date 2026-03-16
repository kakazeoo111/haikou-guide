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
  const [commentImage, setCommentImage] = useState(null);
  const [detailPlace, setDetailPlace] = useState(null); 

  // ✅ 地点点赞数据
  const [placeStats, setPlaceStats] = useState({}); 
  const [myLikedPlaceIds, setMyLikedPlaceIds] = useState([]); 

  // ✅ 推荐功能状态
  const [recommendations, setRecommendations] = useState([]);
  const [showAddRecommend, setShowAddRecommend] = useState(false);
  const [newRec, setNewRec] = useState({ name: "", desc: "", lat: null, lng: null });
  const [recImage, setRecImage] = useState(null);
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
      // ✅ 修正：获取收藏ID列表
      fetch(`${authApiBase}/api/favorites/${currentUser.phone}`)
        .then(res => res.json())
        .then(data => data.ok && setFavoriteIds(data.favIds || []));
      
      fetch(`${authApiBase}/api/places/stats?phone=${currentUser.phone}`)
        .then(res => res.json())
        .then(data => {
            if(data.ok) {
                setPlaceStats(data.stats || {});
                setMyLikedPlaceIds(data.myLikedIds || []);
            }
        });

      fetchRecommendations();

      fetch(`${authApiBase}/api/announcement`).then(res => res.json()).then(data => {
        if (data.ok) { setNoticeContent(data.content); setShowNotice(true); }
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

  const handleLikePlace = async (e, placeId) => {
    e.stopPropagation();
    const res = await fetch(`${authApiBase}/api/places/like`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ phone: currentUser.phone, placeId }) 
    });
    const data = await res.json();
    if (data.ok) {
        setPlaceStats(prev => ({ ...prev, [placeId]: data.newCount }));
        setMyLikedPlaceIds(prev => 
            data.action === 'liked' ? [...prev, placeId] : prev.filter(id => id !== placeId)
        );
    }
  };

  const handleLikeRec = async (e, recId) => {
    e.stopPropagation();
    const res = await fetch(`${authApiBase}/api/recommendations/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, recId })
    });
    const data = await res.json();
    if (data.ok) fetchRecommendations();
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
    if(recImage) formData.append("image", recImage);

    const res = await fetch(`${authApiBase}/api/recommendations/add`, { method: "POST", body: formData });
    const d = await res.json();
    if (d.ok) {
        alert("发布成功！");
        setShowAddRecommend(false);
        setNewRec({ name: "", desc: "", lat: null, lng: null });
        setRecImage(null);
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
    if(!newComment.trim() && !commentImage) return;
    const formData = new FormData();
    formData.append("phone", currentUser.phone);
    formData.append("placeId", id);
    formData.append("content", newComment);
    if (commentImage) formData.append("image", commentImage);
    const res = await fetch(`${authApiBase}/api/comments/add`, { method: "POST", body: formData });
    const data = await res.json();
    if (data.ok) { setNewComment(""); setCommentImage(null); fetchComments(id); }
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
    // 1. 先判断当前这个地点是否已经在收藏列表里
    const isCurrentlyFavorited = favorites.some(f => f.id === p.id);

    const res = await fetch(`${authApiBase}/api/favorites/toggle`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ phone: currentUser.phone, placeId: p.id }) 
    });
    
    const d = await res.json();
    
    if (d.ok) {
        // 2. 如果请求成功，直接在本地状态里增删，实现“秒开/秒灭”的效果
        if (isCurrentlyFavorited) {
            // 如果之前是收藏的，现在就移除
            setFavorites(favorites.filter(f => f.id !== p.id));
        } else {
            // 如果之前没收藏，现在就加上
            setFavorites([...favorites, p]);
        }
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
    // 处理推荐分类
    const allSource = [
        ...places.map(p => ({ 
            ...p, 
            distVal: getDist(userLocation, p),
            likes: placeStats[p.id] || 0,
            isPlaceLiked: myLikedPlaceIds.includes(p.id)
        })),
        ...recommendations.map(r => ({
            ...r,
            id: `rec_${r.id}`, // 保持 ID 前缀
            realId: r.id,
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
        // ✅ 核心修复：根据 favoriteIds 过滤，确保推荐地点也能显示
        return list.filter(p => favoriteIds.includes(p.id))
                   .sort((a, b) => parseFloat(a.distVal) - parseFloat(b.distVal));
    } 
    else if (filter === "recommend") {
        list = list.filter(p => p.type === "recommend");
    } 
    else if (filter === "top10") {
        return list.sort((a, b) => b.likes - a.likes).slice(0, 10);
    } 
    else if (filter === "photo") {
        list = list.filter(p => p.isPhotoReady);
    } 
    else if (filter !== "all") {
        list = list.filter(p => p.type === filter);
    }

    return list.sort((a, b) => parseFloat(a.distVal) - parseFloat(b.distVal));
  };

  const filteredPlaces = getFilteredPlaces();

  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "#f4fbf6" }}>
        <form onSubmit={handleAuthSubmit} style={{ width: "100%", maxWidth: "420px", background: "white", padding: "30px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
          <h2 style={{ textAlign: "center", color: "#2e6a4a", marginTop:0 }}>海口之行登录</h2>
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
      </div>
    );
  }

  const getSortedComments = () => {
    if (!viewingCommentsPlace) return [];
    let list = [...(activeComments[viewingCommentsPlace.id] || [])];
    if (commentSort === "latest") {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (commentSort === "hot") {
      list.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
    }
    return list;
  };

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100vh", overflow: "hidden", background: "#f4fbf6" }}>
      
      {/* 🟢 全屏评论页 */}
      {viewingCommentsPlace && (
        <div style={fullPageOverlayStyle}>
          <div style={navHeaderStyle}>
            <span onClick={() => { setViewingCommentsPlace(null); setCommentSort("default"); }} style={{ cursor: 'pointer', fontSize: '18px' }}>← 返回</span>
            <span style={{ fontWeight: 'bold' }}>{viewingCommentsPlace.name}的点评</span>
            <span style={{ width: '40px' }}></span>
          </div>
          <div style={sortContainerStyle}>
             <button onClick={() => setCommentSort("latest")} style={sortBtnStyle(commentSort === "latest")}>按照最新</button>
             <button onClick={() => setCommentSort("hot")} style={sortBtnStyle(commentSort === "hot")}>按照最火</button>
          </div>
          <div style={scrollContentStyle}>
             {getSortedComments().length === 0 ? (
               <div style={{ textAlign: 'center', marginTop: '100px', color: '#bbb' }}>💬 暂无点评...</div>
             ) : (
               getSortedComments().map(c => (
                 <div key={c.id} style={commentCardStyle}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <img src={c.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + c.user_phone} style={commentAvatarStyle} />
                        <div style={{ flex: 1 }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{c.username}</span>
                              <span style={{ fontSize: '10px', color: '#bbb' }}>{formatCommentTime(c.created_at)}</span>
                           </div>
                           <div style={{ fontSize: '14px', color: '#444', marginTop: '5px' }}>{c.content}</div>
                           {c.image_url && <img src={c.image_url} style={commentImgStyle} onClick={() => setZoomedSingleImage(c.image_url)} />}
                           <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span onClick={(e) => handleLikeComment(e, c.id, viewingCommentsPlace.id)} style={likeBtnStyle(c.is_liked)}>
                                {c.is_liked ? "❤️" : "🤍"} {c.like_count || 0}
                              </span>
                              {c.user_phone === currentUser.phone && <span onClick={() => handleDeleteComment(c.id, viewingCommentsPlace.id)} style={{ color: 'red', fontSize: '12px', cursor: 'pointer' }}>删除</span>}
                           </div>
                        </div>
                    </div>
                 </div>
               ))
             )}
             <div style={{ height: '120px' }}></div>
          </div>
          <div style={fixedBottomBarStyle}>
            <div style={bottomInputContainer}>
              <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="写点评..." style={bottomRealInput} />
              <div onClick={() => document.getElementById(`c-i-page`).click()} style={{ cursor: 'pointer', fontSize: '20px' }}>🖼️</div>
              <input type="file" id={`c-i-page`} hidden accept="image/*" onChange={e => setCommentImage(e.target.files[0])} />
              <button onClick={() => handleAddComment(viewingCommentsPlace.id)} style={btnSendStyle}>发布</button>
            </div>
            {commentImage && <div style={{ fontSize: '10px', color: '#5aa77b', marginTop: '5px' }}>已选图片: {commentImage.name}</div>}
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

                {/* ✅ 百度地图搜索建议列表层 */}
                {recommendSuggestions.length > 0 && (
                  <div style={suggestionListStyle}>
                    {recommendSuggestions.map((poi, idx) => (
                      <div 
                        key={idx} 
                        style={suggestionItemStyle} 
                        onClick={() => selectPoi(poi)}
                      >
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{poi.title}</div>
                        <div style={{ fontSize: '10px', color: '#999' }}>{poi.address}</div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {newRec.lat && <p style={{fontSize:'10px', color:'#5aa77b', marginTop:'-10px', marginBottom:'10px'}}>✅ 定位锁定: {newRec.lat.toFixed(3)}, {newRec.lng.toFixed(3)}</p>}
            
            <textarea placeholder="推荐理由..." value={newRec.desc} onChange={e => setNewRec({...newRec, desc:e.target.value})} style={textAreaStyle} />
            
            <div style={{marginTop:'15px'}}>
               <p style={{fontSize:'12px', color:'#666', marginBottom:'5px'}}>上传实拍图:</p>
               <input type="file" accept="image/*" onChange={e => setRecImage(e.target.files[0])} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
               <button onClick={() => setShowAddRecommend(false)} style={btnCancelStyle}>取消</button>
               <button onClick={handleSubmitRec} style={btnMainStyle}>立即发布</button>
            </div>
          </div>
        </div>
      )}

      {/* 公告弹窗 (保持不变...) */}
      {showNotice && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, textAlign: 'center', maxWidth: '420px' }}>
            <h2 style={{ color: '#2e6a4a' }}>📢 系统公告</h2>
            <div style={{ padding: '10px', textAlign: 'left', color: '#555', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{noticeContent}</div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              {currentUser.phone === ADMIN_PHONE && (
                <button onClick={() => { setIsEditingNotice(true); setShowNotice(false); }} style={{ ...btnSmallStyle(false), flex: 1 }}>编辑</button>
              )}
              <button onClick={() => setShowNotice(false)} style={{ ...btnMainStyle, flex: 2 }}>进入地图</button>
            </div>
          </div>
        </div>
      )}

      {/* 公告编辑 (保持不变...) */}
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

      {/* 详情相册 (保持不变...) */}
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

      {/* 反馈建议 (保持不变...) */}
      {showFeedback && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '400px' }}>
            <h2 style={{ color: '#2e6a4a', textAlign: 'center' }}>反馈建议</h2>
            <textarea placeholder="您的反馈是作者最大的动力（如果需要您可以留下联系方式）..." value={feedbackContent} onChange={e => setFeedbackContent(e.target.value)} style={textAreaStyle} />
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
                <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>{currentUser.username}</h3>
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
          <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
            {[
                { k: "all", l: "全部" }, 
                { k: "recommend", l: "✨ 推荐" },
                { k: "top10", l: "🏆 榜单" }, 
                { k: "photo", l: "📸 出片" }, 
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
                 <img src={p.album?.[0] || "https://api.suzcore.top/uploads/default_place.jpg"} style={listThumbStyle} onClick={() => { setInitialSlide(0); setDetailPlace(p); setZoomMode(true); }} />
                 <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>{p.name}</h3>
                       <span onClick={() => toggleFavorite(p)} style={{ cursor: "pointer", fontSize: "22px" }}>{favorites.some(f => f.id === p.id) ? "⭐" : "☆"}</span>
                    </div>
                    {/* 分类、出片及电话标签行 */}
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

              {/* ✅ 重点修改：统一评论区入口，不论是官方地点还是用户推荐，现在都有评论区功能 */}
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

// 💄 样式合集 (保持不变...)
const suggestionListStyle = { position: 'absolute', top: '45px', left: 0, width: '100%', background: 'white', border: '1px solid #eee', borderRadius: '10px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: '200px', overflowY: 'auto' };
const suggestionItemStyle = { padding: '10px 15px', borderBottom: '1px solid #f9f9f9', cursor: 'pointer' };
const rankBadgeStyle = (idx) => ({ position: 'absolute', top: '-5px', left: '-5px', width: '24px', height: '24px', background: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#7dbf96', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', zIndex: 1, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' });
const placeLikeBtnStyle = (liked) => ({ cursor: 'pointer', fontSize: '12px', padding: '6px 14px', borderRadius: '20px', background: liked ? '#e8f5eb' : '#f0f0f0', color: liked ? '#2e6a4a' : '#888', fontWeight: 'bold', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '4px' });
const fullPageOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#f8fbf9', zIndex: 2000, display: 'flex', flexDirection: 'column' };
const navHeaderStyle = { background: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 2100 };
const sortContainerStyle = { background: 'white', padding: '8px 20px', display: 'flex', gap: '15px', borderBottom: '1px solid #eee' };
const sortBtnStyle = (active) => ({ border: 'none', background: 'transparent', fontSize: '12px', color: active ? '#5aa77b' : '#999', fontWeight: active ? 'bold' : 'normal', cursor: 'pointer', padding: '4px 0', borderBottom: active ? '2px solid #5aa77b' : '2px solid transparent' });
const scrollContentStyle = { flex: 1, overflowY: 'auto', padding: '20px' };
const fixedBottomBarStyle = { background: 'white', padding: '12px 20px', borderTop: '1px solid #eee' };
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

export default App;