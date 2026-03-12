import React, { useEffect, useState } from "react";
import BaiduMap from "./BaiduMap";

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState([]);
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
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // ✅ 评论与详情状态
  const [showCommentId, setShowCommentId] = useState(null);
  const [activeComments, setActiveComments] = useState({});
  const [newComment, setNewComment] = useState("");
  const [commentImage, setCommentImage] = useState(null);
  const [detailPlace, setDetailPlace] = useState(null); 

  // ✅ 大图查看状态
  const [zoomIndex, setZoomIndex] = useState(null); 
  const [zoomedSingleImage, setZoomedSingleImage] = useState(null);

  // ✅ 公告与反馈逻辑状态
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

  // 1. 初始化
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

  // 2. 登录同步
  useEffect(() => {
    if (currentUser) {
      fetch(`${authApiBase}/api/favorites/${currentUser.phone}`)
        .then(res => res.json())
        .then(data => data.ok && setFavorites(places.filter(p => data.favIds.includes(p.id))));
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

  // ================================
  // ✅ 核心业务函数 (全部补齐，防止报错)
  // ================================

  const handleLogout = () => {
    localStorage.removeItem("haikouUser");
    setCurrentUser(null);
    window.location.reload(); // 彻底重置状态
  };

  const fetchAllFeedbacks = async () => {
    try {
      const res = await fetch(`${authApiBase}/api/feedback/all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone }),
      });
      const data = await res.json();
      if (data.ok) { setAllFeedbacks(data.data); setShowAdminFeedback(true); }
    } catch (e) { alert("获取失败"); }
  };

  const handleUpdateNotice = async () => {
    const res = await fetch(`${authApiBase}/api/announcement/update`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: currentUser.phone, newContent: noticeContent }) });
    const data = await res.json();
    if (data.ok) { alert("已更新"); setIsEditingNotice(false); }
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

  const fetchComments = async (id) => {
    const res = await fetch(`${authApiBase}/api/comments/${id}`);
    const d = await res.json();
    if (d.ok) setActiveComments(prev => ({ ...prev, [id]: d.comments }));
  };

  const handleAddComment = async (id) => {
    const formData = new FormData();
    formData.append("phone", currentUser.phone);
    formData.append("placeId", id);
    formData.append("content", newComment);
    if (commentImage) formData.append("image", commentImage);
    const res = await fetch(`${authApiBase}/api/comments/add`, { method: "POST", body: formData });
    const d = await res.json();
    if (d.ok) { setNewComment(""); setCommentImage(null); fetchComments(id); }
  };

  const handleDeleteComment = async (cid, pid) => {
    if (!window.confirm("确定删除？")) return;
    const res = await fetch(`${authApiBase}/api/comments/delete`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: currentUser.phone, commentId: cid }) });
    if (res.ok) fetchComments(pid);
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

  const handleSendCode = async () => {
    const { phone } = loginForm;
    if (!/^1\d{10}$/.test(phone)) return alert("手机号不正确");
    setIsSendingCode(true);
    const res = await fetch(`${authApiBase}/api/sms/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, type: authMode }) });
    const d = await res.json();
    if (d.ok) { setCodeHint("验证码已发"); setCountdown(60); }
    setIsSendingCode(false);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    let ep = authMode === "register" ? "/api/auth/register" : (authMode === "reset" ? "/api/auth/reset-password" : "/api/auth/login");
    setIsAuthLoading(true);
    const res = await fetch(`${authApiBase}${ep}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loginForm) });
    const d = await res.json();
    if (d.ok) {
      if (authMode === "login") { setCurrentUser(d.user); localStorage.setItem("haikouUser", JSON.stringify(d.user)); }
      else { alert(d.message); setAuthMode("login"); }
    } else alert(d.message);
    setIsAuthLoading(false);
  };
  // ================================
  // ✅ 40个完整地点数据
  // ================================
  const places = [
    { id: 1, type: "view", name: "云洞图书馆", desc: "现代艺术与阅读的天堂，设计感拉满，大概率刷新绝美日落，还有文艺感十足的楼梯和角落，每一处都是拍照和沉浸阅读的绝佳场景", lat: 20.091026, lng: 110.262594,
      album:[
        "https://api.suzcore.top/uploads/places/1_1.jpg",
        "https://api.suzcore.top/uploads/places/1_2.jpg",
        "https://api.suzcore.top/uploads/places/1_3.jpg"
      ]
    },
    { id: 2, type: "view", name: "世纪大桥", desc: "横跨碧海，可以在桥头远眺，灯光璀璨，夜景唯美，是个出片的好地方", lat: 20.055302, lng: 110.326392,
      album:[
        "https://api.suzcore.top/uploads/places/2_1.jpg",
        "https://api.suzcore.top/uploads/places/2_2.jpg"
      ]
    },
    { id: 3, type: "view", name: "假日海滩", desc: "沙细水清，可以在阳光下晒太阳，感受惬意的海风和悠闲度假氛围", lat: 20.038396, lng: 110.250973,
      album:[
        "https://api.suzcore.top/uploads/places/3_1.jpg",
        "https://api.suzcore.top/uploads/places/3_2.jpg"
      ]
    },
    { id: 4, type: "view", name: "万绿园", desc: "绿意盎然，湖边风景和林荫小道的宁静与清新是散步者的天堂", lat: 20.039770, lng: 110.320249,
      album:[
        "https://api.suzcore.top/uploads/places/4_1.jpg",
        "https://api.suzcore.top/uploads/places/4_2.jpg",
        "https://api.suzcore.top/uploads/places/4_3.jpg",
        "https://api.suzcore.top/uploads/places/4_4.jpg"
      ]
    },
    { id: 5, type: "street", name: "骑楼老街", desc: "充满历史韵味的街巷和南洋建筑，色彩斑斓。有很多的伴手礼销售点，还有许多地道小吃可供选择。", lat: 20.046030, lng: 110.350885,
      album:[
        "https://api.suzcore.top/uploads/places/5_1.jpg",
        "https://api.suzcore.top/uploads/places/5_2.jpg",
        "https://api.suzcore.top/uploads/places/5_3.jpg"
      ]
    },
    { id: 6, type: "street", name: "日月广场免税店", desc: "购物天堂般的现代商圈，琳琅满目的免税商品，时尚亮眼的店铺与广场。", lat: 20.022236, lng: 110.353345,
      album:[
        "https://api.suzcore.top/uploads/places/6_1.jpg",
        "https://api.suzcore.top/uploads/places/6_2.jpg"
      ]
    },
    { id: 7, type: "view", name: "天空之山", desc: "漂浮在云端的秘境，可以登顶远眺全景，旁边靠海，是个休闲打卡的理想点", lat: 20.064052, lng: 110.313215,
      album:[
        "https://api.suzcore.top/uploads/places/7_1.jpg",
        "https://api.suzcore.top/uploads/places/7_2.jpg",
        "https://api.suzcore.top/uploads/places/7_3.jpg"
      ]
    },
    { id: 8, type: "view", name: "西秀海滩", desc: "海口目前打卡最多的海滩，蔚蓝秘境一般，好似童话的海边", lat: 20.029237, lng: 110.270513,
      album:[
        "https://api.suzcore.top/uploads/places/8_1.jpg",
        "https://api.suzcore.top/uploads/places/8_2.jpg"
      ]
    },
    { id: 9, type: "view", name: "观海台", desc: "临海而建，靠近西秀海滩，有人说像是误入了宫崎骏的童话世界。是很有名的打卡点", lat: 20.037925, lng: 110.304154,
      album:[
        "https://api.suzcore.top/uploads/places/9_1.jpg",
        "https://api.suzcore.top/uploads/places/9_2.jpg"
      ]
    },
    { id: 10, type: "view", name: "拾贝公园", desc: "小众高级感海边，北欧风的电影感，像是被遗忘的孤独之地", lat: 20.094954, lng: 110.375914,
      album:[
        "https://api.suzcore.top/uploads/places/10_1.jpg",
        "https://api.suzcore.top/uploads/places/10_2.jpg",
        "https://api.suzcore.top/uploads/places/10_3.jpg",
        "https://api.suzcore.top/uploads/places/10_4.jpg"
      ]
    },
    { id: 11, type: "street", name: "友谊阳光城", desc: "现代商业与休闲完美融合的城市空间，阳光洒满的广场，绿意的角落和街区的时尚装置，感受都市惬意生活", lat: 20.029385, lng: 110.330482,
      album:[
        "https://api.suzcore.top/uploads/places/11_1.jpg",
        "https://api.suzcore.top/uploads/places/11_2.jpg"
      ]
    },
    { id: 12, type: "street", name: "龙湖天街", desc: "海口新商场，集购物美食与娱乐于一体的潮流地标，是逛街党的天堂", lat: 20.002361, lng: 110.336522,
      album:[
        "https://api.suzcore.top/uploads/places/12_1.jpg",
        "https://api.suzcore.top/uploads/places/12_2.jpg"
      ]
    },
    { id: 13, type: "street", name: "吾悦广场", desc: "曾经的辉煌商场，但依然还是城市休闲中心，感受热闹轻松的都市生活氛围", lat: 19.982740, lng: 110.345532,
      album:[
        "https://api.suzcore.top/uploads/places/13_1.jpg"
      ]
    },
    { id: 14, type: "street", name: "自在湾", desc: "唯美临海步行街，面朝大海坐在咖啡厅拍照打卡吃饭，海风轻拂感受自在生活。", lat: 20.042410, lng: 110.314577,
      album:[
        "https://api.suzcore.top/uploads/places/14_1.jpg",
        "https://api.suzcore.top/uploads/places/14_2.jpg",
        "https://api.suzcore.top/uploads/places/14_3.jpg"
      ]
    },
    { id: 15, type: "food", name: "正方华(明珠广场店)", desc: "海南特色老爸茶，每天都会有许多人包括本地居民都会来吃老爸茶，非常受欢迎的一家店。", lat: 20.035661, lng: 110.349434,
      album:[
        "https://api.suzcore.top/uploads/places/15_1.jpg",
        "https://api.suzcore.top/uploads/places/15_2.jpg",
        "https://api.suzcore.top/uploads/places/15_3.jpg"
      ]
    },
    { id: 16, type: "food", name: "芸鹏休闲茶坊", desc: "在高登街旁，靠招牌烙饼红火，每一桌必点的烙饼，切记烙饼只有下午三点后才开放", lat: 20.00, lng: 110.35,
      album:[
        "https://api.suzcore.top/uploads/places/16_1.jpg",
        "https://api.suzcore.top/uploads/places/16_2.jpg",
        "https://api.suzcore.top/uploads/places/16_3.jpg"
      ]
    },
    { id: 17, type: "food", name: "九记甜品(华海店)", desc: "甜品爱好者的打卡圣地，美味的甜品和精致的摆摊吸引了无数游客", lat: 20.028871, lng: 110.335004,
      album:[
        "https://api.suzcore.top/uploads/places/17_1.jpg",
        "https://api.suzcore.top/uploads/places/17_2.jpg",
        "https://api.suzcore.top/uploads/places/17_3.jpg",
        "https://api.suzcore.top/uploads/places/17_4.jpg"
      ]
    },
    { id: 18, type: "food", name: "柿里糖水铺(世贸直营店)", desc: "地道港式糖水的温暖小天地，店内氛围十分温馨，有甜品有晚餐，可以与朋友分享甜蜜的悠闲地", lat: 20.027454, lng: 110.311212,
      album:[
        "https://api.suzcore.top/uploads/places/18_1.jpg",
        "https://api.suzcore.top/uploads/places/18_2.jpg",
        "https://api.suzcore.top/uploads/places/18_3.jpg"
      ]
    },
    { id: 19, type: "food", name: "萝冰冰", desc: "人气甜品店，五彩缤纷的冰品加上可供小孩玩耍的一方空间，带娃与享受清凉口感两不误", lat: 20.025954, lng: 110.339806,
      album:[
        "https://api.suzcore.top/uploads/places/19_1.jpg",
        "https://api.suzcore.top/uploads/places/19_2.jpg",
        "https://api.suzcore.top/uploads/places/19_3.jpg"
      ]
    },
    { id: 20, type: "food", name: "海大南门夜市", desc: "夜色下的市井烟火地，摊位琳琅满目，品尝地道小吃，感受海口最地道的夜生活氛围", lat: 20.056054, lng: 110.343200,
      album:[
        "https://api.suzcore.top/uploads/places/20_1.jpg",
        "https://api.suzcore.top/uploads/places/20_2.jpg",
        "https://api.suzcore.top/uploads/places/20_3.jpg"
      ]
    },
    { id: 21, type: "food", name: "阿娥餐饮店", desc: "老字号炸炸店，是站主最喜欢的炸炸店，物美价廉还有清爽的冰绿豆（有冬瓜意）", lat: 20.044653, lng: 110.351382,
      album:[
        "https://api.suzcore.top/uploads/places/21_1.jpg",
        "https://api.suzcore.top/uploads/places/21_2.jpg",
        "https://api.suzcore.top/uploads/places/21_3.jpg",
        "https://api.suzcore.top/uploads/places/21_4.jpg"
      ]
    },
    { id: 22, type: "food", name: "姚记辣汤饭", desc: "海南特色街头小吃，香辣浓郁，热气腾腾，感受地道海口味道带来的烟火气息", lat: 20.049292, lng: 110.352991,
      album:[
        "https://api.suzcore.top/uploads/places/22_1.jpg",
        "https://api.suzcore.top/uploads/places/22_2.jpg"
      ]
    },
    { id: 23, type: "food", name: "文昌邓记清补凉", desc: "清甜解暑清补凉老字号，好吃又好看，料很多，在炎热的夏天来一碗绝对是一个不错的选择", lat: 20.026083, lng: 110.080660,
      album:[
        "https://api.suzcore.top/uploads/places/23_1.jpg",
        "https://api.suzcore.top/uploads/places/23_2.jpg"
      ]
    },
    { id: 24, type: "food", name: "美元味饮食店", desc: "市井气息浓厚，有甲子海南粉，伊面汤，粉汤，味道真的是让站主难以忘怀，是站主高中夜宵的常客，非常值得推荐的一个地方", lat: 20.010878, lng: 110.360648,
      album:[
        "https://api.suzcore.top/uploads/places/24_1.jpg",
        "https://api.suzcore.top/uploads/places/24_2.jpg",
        "https://api.suzcore.top/uploads/places/24_3.jpg"
      ]
    },
    { id: 25, type: "food", name: "老机场陈记粉条王", desc: "正宗后安粉，肉给的很多，是在海口其他地方吃不到的正宗后安粉", lat: 20.008954, lng: 110.320581,
      album:[
        "https://api.suzcore.top/uploads/places/25_1.jpg",
        "https://api.suzcore.top/uploads/places/25_2.jpg"
      ]
    },
    { id: 26, type: "food", name: "三爷糟粕醋", desc: "海南特色糟粕醋，独具风味的酸香开胃的糟粕醋美味，喜欢海鲜的游客可以选择，旁边还有同家的糟粕醋火锅", lat: 20.045964, lng: 110.349623,
      album:[
        "https://api.suzcore.top/uploads/places/26_1.jpg",
        "https://api.suzcore.top/uploads/places/26_2.jpg"
      ]
    },
    { id: 27, type: "food", name: "老机场陈记粉条王(西沙店)", desc: "也是正宗后安粉，是分店，除了后安粉还有美味的肉粽，值得一试", lat: 20.025471, lng: 110.341446,
      album:[
        "https://api.suzcore.top/uploads/places/27_1.jpg",
        "https://api.suzcore.top/uploads/places/27_2.jpg",
        "https://api.suzcore.top/uploads/places/27_3.jpg"
      ]
    },
    { id: 28, type: "food", name: "韩汪记糟粕醋", desc: "藏在街边小巷的黄金店家，独特的糟粕醋让人感受海南的独特魅力。此外还销售糟粕醋", lat: 20.006376, lng: 110.366164,
      album:[
        "https://api.suzcore.top/uploads/places/28_1.jpg",
        "https://api.suzcore.top/uploads/places/28_2.jpg",
        "https://api.suzcore.top/uploads/places/28_3.jpg"
      ]
    },
    { id: 29, type: "food", name: "贞姐十三小鱼煲", desc: "位于角落巷子里的美味特色鱼煲，是站主从小吃到大的东西。空心菜，竹笋和芋头梗配上美味的酱料真的让人忍不住夸赞。", lat: 20.044265, lng: 110.353645,
      album:[
        "https://api.suzcore.top/uploads/places/29_1.jpg",
        "https://api.suzcore.top/uploads/places/29_2.jpg",
        "https://api.suzcore.top/uploads/places/29_3.jpg",
        "https://api.suzcore.top/uploads/places/29_4.jpg"
      ]
    },
    { id: 30, type: "food", name: "无名鸡饭", desc: "低调却口碑炸裂的文昌鸡店，鲜嫩多汁的鸡肉配上诱人的鸡饭产生了无数回头客", lat: 20.031529, lng: 110.340119,
      album:[
        "https://api.suzcore.top/uploads/places/30_1.jpg"
      ]
    },
    { id: 31, type: "food", name: "肥婆兰鸡饭", desc: "香嫩的鸡肉配上醇香米饭和招牌地瓜叶，每一口都充满浓郁的本地风味", lat: 20.045125, lng: 110.350187,
      album:[
        "https://api.suzcore.top/uploads/places/31_1.jpg",
        "https://api.suzcore.top/uploads/places/31_2.jpg"
      ]
    },
    { id: 32, type: "food", name: "白明泉椰子鸡", desc: "特色椰子鸡火锅，冒着热气的汤锅与晶莹椰子肉轻轻一勺能品出海南阳光与海风的味道，汤的味道也很让人着迷", lat: 20.032235, lng: 110.338479,
      album:[
        "https://api.suzcore.top/uploads/places/32_1.jpg",
        "https://api.suzcore.top/uploads/places/32_2.jpg",
        "https://api.suzcore.top/uploads/places/32_3.jpg"
      ]
    },
    { id: 33, type: "food", name: "文昌鸡椰子汤", desc: "将海南椰香与现杀的文昌鸡的鲜美融为一体，加上十分清甜的汤，不难成为游客的心之所想", lat: 20.073184, lng: 110.336362,
      album:[
        "https://api.suzcore.top/uploads/places/33_1.jpg",
        "https://api.suzcore.top/uploads/places/33_2.jpg",
        "https://api.suzcore.top/uploads/places/33_3.jpg"
      ]
    },
    { id: 34, type: "food", name: "西天庙", desc: "热闹非凡的地道美食天堂（几乎所有的特色美食都囊括在内），可以边逛街边打卡品尝美食，", lat: 20.047292, lng: 110.346373,
      album:[
        "https://api.suzcore.top/uploads/places/34_1.jpg",
        "https://api.suzcore.top/uploads/places/34_2.jpg",
        "https://api.suzcore.top/uploads/places/34_3.jpg"
      ]
    },
    { id: 35, type: "cafe", name: "小夜盲", desc: "极具氛围的小咖啡馆，老板人很好，详情的照片是站主对象亲自拍摄，强力推荐喜欢温馨的游客前去一试", lat: 20.034977, lng: 110.346373,
      album:[
        "https://api.suzcore.top/uploads/places/35_1.jpg",
        "https://api.suzcore.top/uploads/places/35_2.jpg",
        "https://api.suzcore.top/uploads/places/35_3.jpg",
        "https://api.suzcore.top/uploads/places/35_4.jpg"
      ]
    },
    { id: 36, type: "cafe", name: "工芸咖啡", desc: "海景咖啡馆。绝美海景与温暖阳光让它成为海口最难约的海景下午茶", lat: 20.061229, lng: 110.317416,
      album:[
        "https://api.suzcore.top/uploads/places/36_1.jpg",
        "https://api.suzcore.top/uploads/places/36_2.jpg",
        "https://api.suzcore.top/uploads/places/36_3.jpg"
      ]
    },
    { id: 37, type: "cafe", name: "斑马院子", desc: "藏在小巷子深处的可爱小店，店里可约拍立得，还有懒人沙发，非常出片", lat: 20.031764, lng: 110.332199,
      album:[
        "https://api.suzcore.top/uploads/places/37_1.jpg",
        "https://api.suzcore.top/uploads/places/37_2.jpg",
        "https://api.suzcore.top/uploads/places/37_3.jpg"
      ]
    },
    { id: 38, type: "cafe", name: "青庭咖啡", desc: "日系窗景咖啡店，在万绿园里面，一扇窗让它成为了著名的打卡点", lat: 20.041134, lng: 110.325469,
      album:[
        "https://api.suzcore.top/uploads/places/38_1.jpg",
        "https://api.suzcore.top/uploads/places/38_2.jpg",
        "https://api.suzcore.top/uploads/places/38_3.jpg",
        "https://api.suzcore.top/uploads/places/38_4.jpg",
        "https://api.suzcore.top/uploads/places/38_5.jpg"
      ]
    },
    { id: 39, type: "cafe", name: "肆意茶聊", desc: "彷佛像闯进了闹市里的小森林，木质桌椅，中式茶馆，无不透露着松弛感", lat: 20.033555, lng: 110.334263,
      album:[
        "https://api.suzcore.top/uploads/places/39_1.jpg",
        "https://api.suzcore.top/uploads/places/39_2.jpg",
        "https://api.suzcore.top/uploads/places/39_3.jpg"
      ]
    },
    { id: 40, type: "cafe", name: "盐巴saltea", desc: "城市喧嚣中的一方宁静，绿植和阳光洒落让人感到很舒服惬意。", lat: 20.027084, lng: 110.307733,
      album:[
        "https://api.suzcore.top/uploads/places/40_1.jpg",
        "https://api.suzcore.top/uploads/places/40_2.jpg",
        "https://api.suzcore.top/uploads/places/40_3.jpg",
        "https://api.suzcore.top/uploads/places/40_4.jpg"
      ]
    },
  ];

  const getDist = (l1, l2) => {
    if (!l1 || !l2) return 999;
    const R = 6371;
    const dLat = (l2.lat - l1.lat) * Math.PI / 180;
    const dLng = (l2.lng - l1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(l1.lat*Math.PI/180)*Math.cos(l2.lat*Math.PI/180)*Math.sin(dLng/2)**2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(2);
  };

  const toggleFavorite = async (p) => {
    const res = await fetch(`${authApiBase}/api/favorites/toggle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: currentUser.phone, placeId: p.id }) });
    const d = await res.json();
    if (d.ok) d.action === "added" ? setFavorites([...favorites, p]) : setFavorites(favorites.filter(f => f.id !== p.id));
  };

  const filteredPlaces = places
    .filter(p => (filter === "all" ? true : filter === "favorite" ? favorites.some(f => f.id === p.id) : p.type === filter))
    .filter(p => p.name.includes(search))
    .map(p => ({ ...p, distVal: getDist(userLocation, p) }))
    .sort((a, b) => parseFloat(a.distVal) - parseFloat(b.distVal));

  // --- 登录 UI ---
  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "#f4fbf6" }}>
        <form onSubmit={handleAuthSubmit} style={{ width: "100%", maxWidth: "420px", background: "white", padding: "30px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
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

  // ================================
  // ✅ 渲染逻辑 B：主界面 (包含所有增强功能)
  // ================================
  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100vh", overflow: "hidden", background: "#f4fbf6" }}>
      
      {/* ✅ 1. 修正后的高清大图查看层 (支持切换与彻底关闭) ✅ */}
      {(zoomIndex !== null || zoomedSingleImage) && (
        <div style={zoomOverlayStyle} onClick={() => { setZoomIndex(null); setZoomedSingleImage(null); }}>
          <img 
            src={zoomIndex !== null ? detailPlace.album[zoomIndex] : zoomedSingleImage} 
            style={zoomedImgStyle} alt="高清" 
            onClick={(e) => e.stopPropagation()} 
          />
          {zoomIndex !== null && detailPlace?.album.length > 1 && (
            <>
              <div style={arrowBtnStyle('left')} onClick={(e) => { e.stopPropagation(); setZoomIndex((zoomIndex - 1 + detailPlace.album.length) % detailPlace.album.length); }}>‹</div>
              <div style={arrowBtnStyle('right')} onClick={(e) => { e.stopPropagation(); setZoomIndex((zoomIndex + 1) % detailPlace.album.length); }}>›</div>
              <div style={indexTagStyle}>{zoomIndex + 1} / {detailPlace.album.length}</div>
            </>
          )}
          <div style={closeZoomStyle}>×</div>
        </div>
      )}

      {/* 公告弹窗 */}
      {showNotice && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, textAlign: 'center', maxWidth: '420px' }}>
            <h2 style={{ color: '#2e6a4a', marginBottom: '15px' }}>📢 系统公告</h2>
            {isEditingNotice ? (
              <textarea value={noticeContent} onChange={(e) => setNoticeContent(e.target.value)} style={{ width: '100%', height: '150px', borderRadius: '12px', padding: '10px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }} />
            ) : (
              <div style={{ padding: '10px', color: '#555', fontSize: '15px', whiteSpace: 'pre-wrap', lineHeight: '1.6', textAlign: 'left', background: '#f9fcf9', borderRadius: '12px' }}>{noticeContent}</div>
            )}
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              {currentUser.phone === ADMIN_PHONE && (
                <button onClick={() => isEditingNotice ? handleUpdateNotice() : setIsEditingNotice(true)} style={{ ...btnSmallStyle(false), background: '#7dbf96', color: 'white', flex: 1 }}>{isEditingNotice ? "💾 保存" : "📝 编辑"}</button>
              )}
              <button onClick={() => setShowNotice(false)} style={{ ...btnMainStyle, flex: 2 }}>进入地图</button>
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ 2. 详情相册弹窗 (滑动优化 & 放大入口) */}
      {detailPlace && (
        <div style={modalOverlayStyle} onClick={() => setDetailPlace(null)}>
          <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h2 style={{ margin: 0, color: '#2e6a4a' }}>{detailPlace.name}</h2>
              <span style={{ cursor: 'pointer', fontSize: '28px', color: '#999' }} onClick={() => setDetailPlace(null)}>×</span>
            </div>
            <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: '0 0 15px 0' }}>{detailPlace.desc}</p>
            
            {/* ✅ 横向滑动容器：顺滑左右滑 ✅ */}
            <div style={{ 
              display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '15px', 
              whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' 
            }}>
              {detailPlace.album?.map((img, i) => (
                <img 
                  key={i} src={img} 
                  style={{ height: '200px', borderRadius: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', cursor: 'zoom-in', display: 'inline-block', flexShrink: 0 }} 
                  onClick={() => setZoomIndex(i)} 
                  alt="景点图" 
                />
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#bbb', margin: '5px 0 0 0' }}>左右滑动切换图片 · 点击图片放大</p>
            <button onClick={() => setDetailPlace(null)} style={{ ...btnMainStyle, marginTop: '15px' }}>返回列表</button>
          </div>
        </div>
      )}

      {/* 投诉建议 & 反馈库弹窗 */}
      {showFeedback && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '400px' }}>
            <h2 style={{ color: '#2e6a4a', textAlign: 'center' }}>投诉与建议</h2>
            <textarea placeholder="请详述建议或遇到的问题..." value={feedbackContent} onChange={e => setFeedbackContent(e.target.value)} style={textAreaStyle} />
            {feedbackImage && (
              <div style={{ position: 'relative', width: '80px', height: '80px', marginTop: '10px' }}>
                <img src={URL.createObjectURL(feedbackImage)} style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }} alt="预览" />
                <div onClick={() => setFeedbackImage(null)} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', width: '18px', height: '18px', textAlign: 'center', lineHeight: '16px', fontSize: '12px', cursor: 'pointer' }}>×</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
               <button onClick={() => document.getElementById('feedback-img').click()} style={btnIconStyle}>🖼️</button>
               <input type="file" id="feedback-img" hidden accept="image/*" onChange={(e) => setFeedbackImage(e.target.files[0])} />
               <button onClick={() => setShowFeedback(false)} style={btnCancelStyle}>取消</button>
               <button onClick={handleFeedbackSubmit} style={btnMainStyle}>提交</button>
            </div>
          </div>
        </div>
      )}

      {showAdminFeedback && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: '500px' }}>
            <h2 style={{ textAlign: 'center', color: '#2e6a4a' }}>📩 反馈库</h2>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {allFeedbacks.map(item => (
                <div key={item.id} style={feedbackItemStyle}>
                  <div style={{ fontSize: '11px', color: '#999' }}>{item.user_phone} | {new Date(item.created_at).toLocaleString()}</div>
                  <div style={{ fontSize: '14px', marginTop: '5px' }}>{item.content}</div>
                  {item.image_url && <img src={item.image_url} style={{ width: '100px', marginTop: '8px', borderRadius: '8px', cursor: 'zoom-in' }} onClick={() => setZoomedSingleImage(item.image_url)} alt="反馈" />}
                </div>
              ))}
            </div>
            <button onClick={() => setShowAdminFeedback(false)} style={btnMainStyle}>关闭</button>
          </div>
        </div>
      )}

      {/* 🟢 上部：百度地图 */}
      <div style={{ width: isMobile ? "100%" : "auto", height: isMobile ? "40vh" : "100%", flex: isMobile ? "none" : 1, position: "relative", zIndex: 10 }}>
        <BaiduMap targetPlaces={targetPlaces} userLocation={userLocation} />
        <button onClick={() => window.location.reload()} style={floatBtnStyle}>🎯</button>
      </div>

      {/* 🟢 下部：列表区域 */}
      <div style={{ width: isMobile ? "100%" : "380px", height: isMobile ? "60vh" : "100vh", overflowY: "auto", background: "white", zIndex: 15, padding: "0", boxSizing: "border-box" }}>
        
        {/* 用户头部信息 */}
        <div style={{ padding: "20px 20px 0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div onClick={() => document.getElementById('avatar-input').click()} style={{ position: 'relative', cursor: 'pointer' }}>
                <img src={currentUser.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + currentUser.phone} style={avatarStyle} alt="avatar" />
                <div style={plusIconStyle}>+</div>
            </div>
            <input type="file" id="avatar-input" hidden accept="image/*" onChange={handleAvatarUpload} />
            <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>{currentUser.username}</h3>
                <div style={{ display: 'flex', gap: '8px', fontSize: '12px', marginTop: '2px' }}>
                    <span onClick={handleLogout} style={{ color: "#d94f5c", cursor: "pointer" }}>退出</span>
                    <span onClick={() => setShowFeedback(true)} style={{ color: "#5aa77b", cursor: "pointer" }}>反馈建议</span>
                    {currentUser.phone === ADMIN_PHONE && <span onClick={fetchAllFeedbacks} style={{ color: "#333", cursor: "pointer" }}>查看反馈</span>}
                </div>
            </div>
          </div>
          <input placeholder="搜索目的地、路线..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
        </div>

        {/* 分类吸顶导航 */}
        <div style={{ position: "sticky", top: 0, background: "white", zIndex: 100, padding: "10px 20px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
            {[{ k: "all", l: "全部" }, { k: "favorite", l: "⭐收藏" }, { k: "food", l: "🍱美食" }, { k: "view", l: "🏞️景点" }, { k: "street", l: "🛍️商圈" }, { k: "cafe", l: "☕咖啡" }].map(item => (
              <button key={item.k} onClick={() => setFilter(item.k)} style={{ padding: "6px 12px", borderRadius: "20px", border: "none", background: filter === item.k ? "#5aa77b" : "#f0f0f0", color: filter === item.k ? "white" : "#666", cursor: "pointer", whiteSpace: "nowrap" }}>{item.l}</button>
            ))}
          </div>
        </div>

        {/* 列表渲染 */}
        <div style={{ padding: "10px 20px 30px 20px" }}>
          {filteredPlaces.map(p => (
            <div key={p.id} style={{ padding: "16px", background: "#f9fcf9", borderRadius: "20px", marginBottom: "15px", border: "1px solid #f0f5f1" }}>
              
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                 <div 
                    style={{ width: "65px", height: "65px", borderRadius: "12px", overflow: "hidden", flexShrink: 0, background: "#eee", cursor: 'zoom-in' }}
                    onClick={() => p.album && p.album.length > 0 && setZoomedSingleImage(p.album[0])}
                 >
                    <img src={p.album && p.album.length > 0 ? p.album[0] : "https://api.suzcore.top/uploads/places/default.jpg"} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="thumb" />
                 </div>
                 <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>{p.name}</h3>
                      <span onClick={() => toggleFavorite(p)} style={{ cursor: "pointer", fontSize: "22px" }}>{favorites.some(f => f.id === p.id) ? "⭐" : "☆"}</span>
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#5aa77b', background: '#e8f5eb', padding: '2px 6px', borderRadius: '4px' }}>
                        {p.type === 'food' ? '🍱 美食' : p.type === 'view' ? '🏞️ 景点' : p.type === 'cafe' ? '☕ 咖啡' : '🛍️ 商圈'}
                      </span>
                    </div>
                 </div>
              </div>

              <p style={{ fontSize: "12px", color: "#777", margin: "10px 0" }}>{p.desc}</p>
              <div style={{ fontSize: "12px", color: "#5aa77b", marginBottom: "10px" }}>📏 距你：{p.distVal} km</div>
              
              <div style={{ display: "flex", gap: "8px", flexWrap: 'wrap' }}>
                <button onClick={() => setDetailPlace(p)} style={{ ...btnSmallStyle(false), background: '#e8f5eb', color: '#2e6a4a' }}>🖼️ 详情</button>
                <button onClick={() => setTargetPlaces(prev => prev.some(tp => tp.id === p.id) ? prev.filter(tp => tp.id !== p.id) : [...prev, p])} style={btnSmallStyle(targetPlaces.some(tp => tp.id === p.id))}>
                  {targetPlaces.some(tp => tp.id === p.id) ? "取消路线" : "标记路线"}
                </button>
                <button onClick={() => window.open(`https://api.map.baidu.com/direction?destination=${p.lat},${p.lng}&mode=driving&region=海口&output=html`)} style={{ ...btnSmallStyle(false), background: "#5aa77b", color: "white" }}>🧭 导航</button>
              </div>

              {/* 评论区代码 */}
              <div style={{ marginTop: '12px', borderTop: '1px dashed #ddd', paddingTop: '10px' }}>
                <div onClick={() => { if (showCommentId === p.id) setShowCommentId(null); else { setShowCommentId(p.id); fetchComments(p.id); } }} style={{ color: '#5aa77b', cursor: 'pointer', fontSize: '13px' }}>💬 {showCommentId === p.id ? "收起评论" : "查看评论区"}</div>
                {showCommentId === p.id && (
                  <div style={{ marginTop: '10px', background: '#fff', borderRadius: '12px', padding: '12px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '10px' }}>
                      {(activeComments[p.id] || []).length === 0 ? <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>暂无评论</p> : 
                        activeComments[p.id].map(c => (
                          <div key={c.id} style={{ display: 'flex', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #f2f2f2', paddingBottom: '10px', position: 'relative' }}>
                            <img src={c.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + c.user_phone} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} alt="c-avatar" />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{c.username}</div>
                              {c.content && <div style={{ fontSize: '13px', color: '#555', margin: '4px 0' }}>{c.content}</div>}
                              {c.image_url && <img src={c.image_url} alt="comment" style={{ width: '100%', maxWidth: '120px', borderRadius: '8px', marginTop: '5px', cursor: 'zoom-in' }} onClick={() => setZoomedSingleImage(c.image_url)} />}
                            </div>
                            {c.user_phone === currentUser.phone && <span onClick={() => handleDeleteComment(c.id, p.id)} style={{ color: '#df6b76', fontSize: '11px', cursor: 'pointer', position: 'absolute', right: 0, top: 0 }}>删除</span>}
                          </div>
                        ))
                      }
                    </div>
                    <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '10px' }}>
                      <textarea placeholder="写点评..." value={newComment} onChange={e => setNewComment(e.target.value)} style={{ width: '100%', minHeight: '40px', border: 'none', background: 'transparent', fontSize: '13px', outline: 'none', resize: 'none' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                        <div onClick={() => document.getElementById(`comment-img-${p.id}`).click()} style={{ cursor: 'pointer', fontSize: '18px' }}>🖼️</div>
                        <input type="file" id={`comment-img-${p.id}`} hidden accept="image/*" onChange={(e) => setCommentImage(e.target.files[0])} />
                        <button onClick={() => handleAddComment(p.id)} style={{ background: '#5aa77b', color: 'white', border: 'none', borderRadius: '20px', padding: '5px 15px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>发布</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 💄 样式
const zoomOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.98)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' };
const zoomedImgStyle = { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' };
const closeZoomStyle = { position: 'absolute', top: '20px', right: '20px', color: 'white', fontSize: '40px', textShadow: '0 0 10px #000' };
const arrowBtnStyle = (dir) => ({ position: 'absolute', [dir]: '10px', top: '50%', color: 'white', fontSize: '50px', cursor: 'pointer', userSelect: 'none', background: 'rgba(255,255,255,0.1)', width: '50px', height: '50px', borderRadius: '50%', textAlign: 'center', lineHeight: '45px' });
const indexTagStyle = { position: 'absolute', bottom: '30px', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '5px 15px', borderRadius: '20px', fontSize: '14px' };

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px', boxSizing: 'border-box' };
const modalContentStyle = { background: 'white', width: '100%', maxWidth: '600px', borderRadius: '24px', padding: '24px', position: 'relative', overflowY: 'auto', maxHeight: '90vh' };
const inputStyle = { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "10px", border: "1px solid #ddd", boxSizing: "border-box" };
const btnCodeStyle = { background: "#7dbf96", color: "white", border: "none", borderRadius: "10px", width: "75px", cursor: "pointer", fontSize: "12px" };
const btnMainStyle = { width: "100%", padding: "14px", background: "#5aa77b", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" };
const linkStyle = { color: "#5aa77b", cursor: "pointer", textDecoration: "underline" };
const floatBtnStyle = { position: "absolute", right: "15px", bottom: "15px", width: "40px", height: "40px", borderRadius: "50%", background: "white", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", fontSize: "20px", zIndex: 20 };
const avatarStyle = { width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover", border: "2px solid #5aa77b" };
const plusIconStyle = { position: 'absolute', bottom: 0, right: 0, background: '#5aa77b', color: 'white', borderRadius: '50%', width: '18px', height: '18px', border: '2px solid white', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid white', fontSize: '12px' };
const btnSmallStyle = (isMarked) => ({ padding: "8px 12px", borderRadius: "8px", border: "none", background: isMarked ? "#df6b76" : "#e8f5eb", color: isMarked ? "white" : "#2e6a4a", fontWeight: "bold", fontSize: "12px", cursor: "pointer", marginBottom: '5px' });
const textAreaStyle = { width: '100%', height: '150px', borderRadius: '15px', padding: '15px', border: '1px solid #eee', background: '#f9f9f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const btnCancelStyle = { flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' };
const btnIconStyle = { flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: '18px' };
const feedbackItemStyle = { padding: '15px', borderBottom: '1px solid #eee', background: '#f9fcf9', borderRadius: '12px', marginBottom: '10px' };

export default App;