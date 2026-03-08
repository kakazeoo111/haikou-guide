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
  const [authMode, setAuthMode] = useState("login"); // "login" | "register" | "reset"
  const [loginForm, setLoginForm] = useState({ username: "", phone: "", code: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [codeHint, setCodeHint] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // ✅ 评论功能相关状态
  const [showCommentId, setShowCommentId] = useState(null); // 当前展开评论区的地点ID
  const [activeComments, setActiveComments] = useState({}); // 存放各个地点的评论数据 {placeId: []}
  const [newComment, setNewComment] = useState(""); // 输入框内容
  const [commentImage, setCommentImage] = useState(null); // ✅ 新增：评论选中的图片文件

  const authApiBase = "https://api.suzcore.top";

  // 1. 初始化
  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("haikouUser"));
    if (savedUser) setCurrentUser(savedUser);

    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);

    // 获取高精度定位 (🚶 我的位置)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.error("定位失败", err),
        { enableHighAccuracy: true }
      );
    }
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 2. 云端收藏同步 (登录后自动拉取)
  useEffect(() => {
    if (currentUser) {
      fetch(`${authApiBase}/api/favorites/${currentUser.phone}`)
        .then(res => res.json())
        .then(data => {
          if (data.ok) {
            const cloudFavs = places.filter(p => data.favIds.includes(p.id));
            setFavorites(cloudFavs);
          }
        });
    }
  }, [currentUser]);

  // 3. 验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // ================================
  // ✅ 核心业务逻辑
  // ================================

  // 头像上传
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("phone", currentUser.phone);
    try {
      const res = await fetch(`${authApiBase}/api/user/upload-avatar`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok) {
        const updatedUser = { ...currentUser, avatar_url: data.avatarUrl };
        setCurrentUser(updatedUser);
        localStorage.setItem("haikouUser", JSON.stringify(updatedUser));
      }
    } catch (e) { alert("上传失败"); }
  };

  // 获取评论
  const fetchComments = async (placeId) => {
    try {
      const res = await fetch(`${authApiBase}/api/comments/${placeId}`);
      const data = await res.json();
      if (data.ok) {
        setActiveComments(prev => ({ ...prev, [placeId]: data.comments }));
      }
    } catch (e) { console.error("获取评论失败"); }
  };

  // ✅ 修改后：发表评论 (支持图文)
  const handleAddComment = async (placeId) => {
    if (!newComment.trim() && !commentImage) return alert("写点什么或传张图吧~");
    
    const formData = new FormData();
    formData.append("phone", currentUser.phone);
    formData.append("placeId", placeId);
    formData.append("content", newComment);
    if (commentImage) {
      formData.append("image", commentImage); // 这里的 'image' 需对应后端的 multer 配置
    }

    try {
      const res = await fetch(`${authApiBase}/api/comments/add`, {
        method: "POST",
        body: formData, // 使用 FormData 发送图片
      });
      const data = await res.json();
      if (data.ok) {
        setNewComment(""); // 清空输入
        setCommentImage(null); // 清空图片
        fetchComments(placeId); // 刷新列表
      } else { alert(data.message); }
    } catch (e) { alert("网络异常"); }
  };

  // ✅ 新增：删除评论逻辑
  const handleDeleteComment = async (commentId, placeId) => {
    if (!window.confirm("确定要删除这条评论吗？")) return;
    
    try {
      const res = await fetch(`${authApiBase}/api/comments/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, commentId }),
      });
      const data = await res.json();
      if (data.ok) {
        fetchComments(placeId); // 刷新列表
      } else { alert(data.message); }
    } catch (e) { alert("删除请求失败"); }
  };

  const handleSendCode = async () => {
    const { phone } = loginForm;
    if (!/^1\d{10}$/.test(phone)) return setLoginError("手机号不正确");
    setIsSendingCode(true); setLoginError("");
    try {
      const response = await fetch(`${authApiBase}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, type: authMode }),
      });
      const result = await response.json();
      if (result.ok) { setCodeHint("验证码已发送"); setCountdown(60); }
      else { setLoginError(result.message); }
    } catch (e) { setLoginError("网络错误"); }
    finally { setIsSendingCode(false); }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    let endpoint = "/api/auth/login";
    if (authMode === "register") endpoint = "/api/auth/register";
    if (authMode === "reset") endpoint = "/api/auth/reset-password";

    setIsAuthLoading(true); setLoginError("");
    try {
      const res = await fetch(`${authApiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (data.ok) {
        if (authMode === "login") {
          setCurrentUser(data.user);
          localStorage.setItem("haikouUser", JSON.stringify(data.user));
        } else {
          alert(data.message);
          setAuthMode("login");
        }
      } else { setLoginError(data.message); }
    } catch (e) { setLoginError("连接后端失败"); }
    finally { setIsAuthLoading(false); }
  };

  // ================================
  // ✅ 40个完整地点数据
  // ================================
  const places = [
    { id: 1, type: "view", name: "云洞图书馆", desc: "海口经典打卡地", lat: 20.091026, lng: 110.262594 },
    { id: 2, type: "view", name: "世纪大桥", desc: "夜景唯美", lat: 20.055302, lng: 110.326392 },
    { id: 3, type: "view", name: "假日海滩", desc: "海口海边风景", lat: 20.038396, lng: 110.250973 },
    { id: 4, type: "view", name: "万绿园", desc: "城市中心大公园", lat: 20.039770, lng: 110.320249 },
    { id: 5, type: "street", name: "骑楼老街", desc: "历史商业街，网红打卡地", lat: 20.046030, lng: 110.350885 },
    { id: 6, type: "street", name: "日月广场免税店", desc: "海口最大商业中心", lat: 20.022236, lng: 110.353345 },
    { id: 7, type: "view", name: "天空之山", desc: "适合拍照的美景", lat: 20.064052, lng: 110.313215 },
    { id: 8, type: "view", name: "西秀海滩", desc: "出片海滩", lat: 20.029237, lng: 110.270513 },
    { id: 9, type: "view", name: "观海台", desc: "临海网红出片地", lat: 20.037925, lng: 110.304154 },
    { id: 10, type: "view", name: "拾贝公园", desc: "小众高级感海边", lat: 20.094954, lng: 110.375914 },
    { id: 11, type: "street", name: "友谊阳光城", desc: "人气商场", lat: 20.029385, lng: 110.330482 },
    { id: 12, type: "street", name: "龙湖天街", desc: "人气超大型商场商场", lat: 20.002361, lng: 110.336522 },
    { id: 13, type: "street", name: "吾悦广场", desc: "曾经的辉煌商场", lat: 19.982740, lng: 110.345532 },
    { id: 14, type: "street", name: "自在湾", desc: "绝美临海步行街", lat: 20.042410, lng: 110.314577 },
    { id: 15, type: "food", name: "正方华(明珠广场店)", desc: "海南特色老爸茶", lat: 20.035661, lng: 110.349434 },
    { id: 16, type: "food", name: "高登福(高登街店)", desc: "海南招牌老爸茶", lat: 20.001903, lng: 110.362043 },
    { id: 17, type: "food", name: "九记甜品(华海店)", desc: "海南网红甜品", lat: 20.028871, lng: 110.335004 },
    { id: 18, type: "food", name: "柿里糖水铺(世贸直营店)", desc: "海南特色甜水铺", lat: 20.027454, lng: 110.311212 },
    { id: 19, type: "food", name: "萝冰冰", desc: "人气甜品店 适合带娃", lat: 20.025954, lng: 110.339806 },
    { id: 20, type: "food", name: "海大南门夜市", desc: "比较火的小吃街", lat: 20.056054, lng: 110.343200 },
    { id: 21, type: "food", name: "阿娥餐饮店", desc: "作者十分喜爱的炸炸店", lat: 20.044653, lng: 110.351382 },
    { id: 22, type: "food", name: "姚记辣汤饭", desc: "海南特色，值得一试", lat: 20.049292, lng: 110.352991 },
    { id: 23, type: "food", name: "文昌邓记清补凉", desc: "海南清补凉", lat: 20.026083, lng: 110.080660 },
    { id: 24, type: "food", name: "美元味饮食店", desc: "海南粉，粉汤伊面汤", lat: 20.010878, lng: 110.360648 },
    { id: 25, type: "food", name: "老机场陈记粉条王", desc: "正宗后安粉", lat: 20.008954, lng: 110.320581 },
    { id: 26, type: "food", name: "三爷糟粕醋", desc: "海南特色糟粕醋", lat: 20.045964, lng: 110.349623 },
    { id: 27, type: "food", name: "陈记粉条王(西沙店)", desc: "香极了", lat: 20.025471, lng: 110.341446 },
    { id: 28, type: "food", name: "韩汪记糟粕醋", desc: "口味独特", lat: 20.006376, lng: 110.366164 },
    { id: 29, type: "food", name: "贞姐十三小鱼煲", desc: "特色鱼煲", lat: 20.044265, lng: 110.353645 },
    { id: 30, type: "food", name: "无名鸡饭", desc: "文昌鸡口味第一", lat: 20.031529, lng: 110.340119 },
    { id: 31, type: "food", name: "肥婆兰鸡饭", desc: "味道不错", lat: 20.045125, lng: 110.350187 },
    { id: 32, type: "food", name: "白明泉椰子鸡", desc: "特色椰子鸡火锅", lat: 20.032235, lng: 110.338479 },
    { id: 33, type: "food", name: "文昌鸡椰子汤", desc: "煲仔饭不错", lat: 20.073184, lng: 110.336362 },
    { id: 34, type: "food", name: "西天庙", desc: "甜品小吃一条街", lat: 20.047292, lng: 110.346373 },
    { id: 35, type: "cafe", name: "小夜盲", desc: "氛围咖啡馆", lat: 20.034977, lng: 110.346373 },
    { id: 36, type: "cafe", name: "工芸咖啡", desc: "海景咖啡馆", lat: 20.061229, lng: 110.317416 },
    { id: 37, type: "cafe", name: "斑马院子", desc: "有懒人沙发", lat: 20.031764, lng: 110.332199 },
    { id: 38, type: "cafe", name: "青庭咖啡", desc: "很出片", lat: 20.041134, lng: 110.325469 },
    { id: 39, type: "cafe", name: "肆意茶聊", desc: "清冷感竹林", lat: 20.033555, lng: 110.334263 },
    { id: 40, type: "cafe", name: "盐巴saltea", desc: "绿植小院", lat: 20.027084, lng: 110.307733 },
  ];

  function getDistance(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1) return "...";
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(2);
  }

  const toggleFavorite = async (place) => {
    const res = await fetch(`${authApiBase}/api/favorites/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: currentUser.phone, placeId: place.id }),
    });
    const d = await res.json();
    if (d.ok) d.action === "added" ? setFavorites([...favorites, place]) : setFavorites(favorites.filter(f => f.id !== place.id));
  };

  const filteredPlaces = places
    .filter(p => (filter === "all" ? true : filter === "favorite" ? favorites.some(f => f.id === p.id) : p.type === filter))
    .filter(p => p.name.includes(search))
    .map(p => ({ ...p, distVal: getDistance(userLocation?.lat, userLocation?.lng, p.lat, p.lng) }))
    .sort((a, b) => parseFloat(a.distVal) - parseFloat(b.distVal));

  // ================================
  // 渲染逻辑 A：登录/注册/重置界面
  // ================================
  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "#f4fbf6" }}>
        <form onSubmit={handleAuthSubmit} style={{ width: "100%", maxWidth: "420px", background: "white", padding: "30px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
          <h2 style={{ textAlign: "center", color: "#2e6a4a", marginTop:0 }}>{authMode === "login" ? "海口导览登录" : (authMode === "register" ? "新用户注册" : "找回密码")}</h2>
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
          {codeHint && <p style={{ color: "green", fontSize: "13px" }}>{codeHint}</p>}
          <button type="submit" style={btnMainStyle}>{isAuthLoading ? "请稍候" : "确定"}</button>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", fontSize: "14px" }}>
            <span style={linkStyle} onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>{authMode === "login" ? "去注册" : "返回登录"}</span>
            {authMode === "login" && <span style={linkStyle} onClick={() => setAuthMode("reset")}>忘记密码？</span>}
          </div>
        </form>
      </div>
    );
  }

  // ================================
  // ✅ 渲染逻辑 B：主界面 (原版手机吸顶布局)
  // ================================
  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100vh", overflow: "hidden", background: "#f4fbf6" }}>
      
      {/* 🔴 手机端吸顶地图 (40vh) */}
      <div style={{ width: isMobile ? "100%" : "auto", height: isMobile ? "40vh" : "100%", flex: isMobile ? "none" : 1, position: "relative", zIndex: 10 }}>
        <BaiduMap targetPlaces={targetPlaces} userLocation={userLocation} />
        <button onClick={() => window.location.reload()} style={floatBtnStyle}>🎯</button>
      </div>

      {/* 🔵 列表区 (60vh 独立滚动) */}
      <div style={{ 
        width: isMobile ? "100%" : "380px", height: isMobile ? "60vh" : "100vh", 
        overflowY: "auto", background: "white", boxShadow: "0 -5px 20px rgba(0,0,0,0.05)",
        zIndex: 15, padding: "20px", boxSizing: "border-box"
      }}>
        
        {/* 用户头像与信息 */}
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
           <div onClick={() => document.getElementById('avatar-input').click()} style={{ position: 'relative', cursor: 'pointer' }}>
              <img src={currentUser.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + currentUser.phone} style={{ width: "55px", height: "55px", borderRadius: "50%", objectFit: "cover", border: "2px solid #5aa77b" }} />
              <div style={plusIconStyle}>+</div>
           </div>
           <input type="file" id="avatar-input" hidden accept="image/*" onChange={handleAvatarUpload} />
           <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: "17px", color: "#2e6a4a" }}>{currentUser.username}</h3>
              <p onClick={() => { localStorage.removeItem("haikouUser"); window.location.reload(); }} style={{ margin: 0, color: "#d94f5c", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}>退出登录</p>
           </div>
        </div>

        <input placeholder="搜索目的地、路线..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />

        {/* 六个分类按钮 */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "15px" }}>
          {[
            { k: "all", l: "全部" }, { k: "favorite", l: "⭐收藏" }, { k: "food", l: "🍱美食" },
            { k: "view", l: "🏞️景点" }, { k: "street", l: "🛍️商圈" }, { k: "cafe", l: "☕咖啡" }
          ].map(item => (
            <button key={item.k} onClick={() => setFilter(item.k)} style={{ padding: "6px 12px", borderRadius: "20px", border: "none", background: filter === item.k ? "#5aa77b" : "#f0f0f0", color: filter === item.k ? "white" : "#666", cursor: "pointer", whiteSpace: "nowrap" }}>{item.l}</button>
          ))}
        </div>

        {/* 列表渲染 */}
        <div style={{ paddingBottom: "30px" }}>
          {filteredPlaces.map(p => (
            <div key={p.id} style={{ padding: "16px", background: "#f9fcf9", borderRadius: "16px", marginBottom: "15px", border: "1px solid #f0f5f1" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, fontSize: "16px" }}>{p.name}</h3>
                <span onClick={() => toggleFavorite(p)} style={{ cursor: "pointer", fontSize: "22px" }}>{favorites.some(f => f.id === p.id) ? "⭐" : "☆"}</span>
              </div>
              <p style={{ fontSize: "13px", color: "#777", margin: "5px 0" }}>{p.desc}</p>
              <div style={{ fontSize: "12px", color: "#5aa77b", marginBottom: "10px" }}>📏 距你：{p.distVal} km</div>
              
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setTargetPlaces(prev => prev.some(tp => tp.id === p.id) ? prev.filter(tp => tp.id !== p.id) : [...prev, p])} style={btnSmallStyle(targetPlaces.some(tp => tp.id === p.id))}>
                  {targetPlaces.some(tp => tp.id === p.id) ? "取消路线" : "标记路线"}
                </button>
                <button onClick={() => {
                  const url = `https://api.map.baidu.com/direction?destination=${p.lat},${p.lng}|name:${encodeURIComponent(p.name)}&mode=driving&region=海口&output=html&src=haikou-guide`;
                  window.open(url, "_blank");
                }} style={{ ...btnSmallStyle(false), background: "#5aa77b", color: "white" }}>🧭 导航</button>
              </div>

              {/* ✅ 评论区改造：支持发图 + 删除 ✅ */}
              <div style={{ marginTop: '12px', borderTop: '1px dashed #ddd', paddingTop: '10px' }}>
                <div 
                  onClick={() => {
                    if (showCommentId === p.id) setShowCommentId(null);
                    else { setShowCommentId(p.id); fetchComments(p.id); }
                  }} 
                  style={{ color: '#5aa77b', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  💬 {showCommentId === p.id ? "收起评论" : "查看评论区"}
                </div>

                {showCommentId === p.id && (
                  <div style={{ marginTop: '10px', background: '#fff', borderRadius: '12px', padding: '12px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                    {/* 评论列表 */}
                    <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '10px' }}>
                      {(activeComments[p.id] || []).length === 0 ? (
                        <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>暂无评论，快来抢沙发~</p>
                      ) : (
                        activeComments[p.id].map(c => (
                          <div key={c.id} style={{ display: 'flex', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #f2f2f2', paddingBottom: '10px', position: 'relative' }}>
                            <img src={c.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + c.user_phone} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>{c.username}</div>
                              {/* 文字内容 */}
                              {c.content && <div style={{ fontSize: '13px', color: '#555', margin: '4px 0' }}>{c.content}</div>}
                              {/* ✅ 显示评论图片 ✅ */}
                              {c.image_url && (
                                <img 
                                  src={c.image_url} 
                                  alt="comment" 
                                  style={{ width: '100%', maxWidth: '150px', borderRadius: '8px', marginTop: '5px', border: '1px solid #eee' }} 
                                  onClick={() => window.open(c.image_url)} 
                                />
                              )}
                              <div style={{ fontSize: '10px', color: '#bbb', marginTop: '5px' }}>{new Date(c.created_at).toLocaleString()}</div>
                            </div>
                            {/* ✅ 删除按钮：仅本人可见 ✅ */}
                            {c.user_phone === currentUser.phone && (
                              <span 
                                onClick={() => handleDeleteComment(c.id, p.id)} 
                                style={{ position: 'absolute', right: 0, top: 0, color: '#df6b76', fontSize: '11px', cursor: 'pointer', padding: '2px' }}
                              >
                                删除
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* ✅ 发表评论框 (支持发图) ✅ */}
                    <div style={{ background: '#f9f9f9', padding: '10px', borderRadius: '10px' }}>
                      <textarea 
                        placeholder="写点评价..." 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        style={{ width: '100%', minHeight: '40px', border: 'none', background: 'transparent', fontSize: '13px', outline: 'none', resize: 'none' }}
                      />
                      
                      {/* 图片预览 */}
                      {commentImage && (
                        <div style={{ position: 'relative', width: '60px', height: '60px', marginTop: '5px' }}>
                          <img src={URL.createObjectURL(commentImage)} style={{ width: '100%', height: '100%', borderRadius: '5px', objectFit: 'cover' }} />
                          <div 
                            onClick={() => setCommentImage(null)}
                            style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', width: '15px', height: '15px', textAlign: 'center', lineHeight: '13px', fontSize: '10px', cursor: 'pointer' }}
                          >×</div>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        {/* 选择图片按钮 */}
                        <div onClick={() => document.getElementById(`comment-img-${p.id}`).click()} style={{ cursor: 'pointer', fontSize: '18px' }}>🖼️</div>
                        <input 
                          type="file" 
                          id={`comment-img-${p.id}`} 
                          hidden 
                          accept="image/*" 
                          onChange={(e) => setCommentImage(e.target.files[0])} 
                        />

                        <button 
                          onClick={() => handleAddComment(p.id)}
                          style={{ background: '#5aa77b', color: 'white', border: 'none', borderRadius: '20px', padding: '5px 15px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                        >
                          发布
                        </button>
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

// 💄 样式定义
const inputStyle = { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "10px", border: "1px solid #ddd", boxSizing: "border-box" };
const btnCodeStyle = { background: "#7dbf96", color: "white", border: "none", borderRadius: "10px", width: "75px", cursor: "pointer", fontSize: "12px" };
const btnMainStyle = { width: "100%", padding: "14px", background: "#5aa77b", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold" };
const linkStyle = { color: "#5aa77b", cursor: "pointer", textDecoration: "underline" };
const floatBtnStyle = { position: "absolute", right: "15px", bottom: "15px", width: "40px", height: "40px", borderRadius: "50%", background: "white", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", fontSize: "20px", zIndex: 20 };
const plusIconStyle = { position: 'absolute', bottom: 0, right: 0, background: '#5aa77b', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid white', fontSize: '12px' };
const btnSmallStyle = (isMarked) => ({ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: isMarked ? "#df6b76" : "#e8f5eb", color: isMarked ? "white" : "#2e6a4a", fontWeight: "bold", fontSize: "13px", cursor: "pointer" });

export default App;