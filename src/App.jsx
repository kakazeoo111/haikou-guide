import React, { useEffect, useState } from "react";
import BaiduMap from "./BaiduMap";

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [targetPlaces, setTargetPlaces] = useState([]); 
  const [currentPage, setCurrentPage] = useState("home");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // ✅ 认证状态逻辑
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login"); 
  const [loginForm, setLoginForm] = useState({ username: "", phone: "", code: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [codeHint, setCodeHint] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const authApiBase = "https://api.suzcore.top";

  // 1. 初始化与窗口监听
  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("haikouUser"));
    if (savedUser) setCurrentUser(savedUser);

    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);

    // ✅ 核心：请求高精度实时定位
    const getPos = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(newLoc);
            console.log("定位成功", newLoc);
          },
          (err) => console.error("定位失败", err),
          { enableHighAccuracy: true } // 开启高精度
        );
      }
    };
    getPos();
    
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 2. 云端收藏同步
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
  // ✅ 认证逻辑
  // ================================

  const handleSendCode = async () => {
    const { phone } = loginForm;
    if (!/^1\d{10}$/.test(phone)) return setLoginError("请输入有效的11位手机号");
    setIsSendingCode(true);
    setLoginError("");
    try {
      const response = await fetch(`${authApiBase}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, type: authMode }), 
      });
      const result = await response.json();
      if (result.ok) {
        setCodeHint("验证码已发送");
        setCountdown(60);
      } else { setLoginError(result.message); }
    } catch (e) { setLoginError("网络错误"); }
    finally { setIsSendingCode(false); }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    let endpoint = "/api/auth/login";
    if (authMode === "register") endpoint = "/api/auth/register";
    if (authMode === "reset") endpoint = "/api/auth/reset-password";

    setIsAuthLoading(true);
    setLoginError("");
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

  const handleLogout = () => {
    localStorage.removeItem("haikouUser");
    setCurrentUser(null);
  };

  // ================================
  // ✅ 地点列表 (原样保留)
  // ================================
  const places = [
    { id: 1, type: "view", name: "云洞图书馆", desc: "海口经典打卡地", lat: 20.091026, lng: 110.262594 },
    { id: 2, type: "view", name: "世纪大桥", desc: "夜景唯美", lat: 20.055302, lng: 110.326392 },
    { id: 3, type: "view", name: "假日海滩", desc: "海口海边风景", lat: 20.038396, lng: 110.250973 },
    { id: 4, type: "view", name: "万绿园", desc: "城市中心大公园", lat: 20.039770, lng: 110.320249 },
    { id: 5, type: "street", name: "骑楼老街", desc: "历史商业街", lat: 20.046030, lng: 110.350885 },
    { id: 6, type: "street", name: "日月广场免税店", desc: "海口最大商业购物中心", lat: 20.022236, lng: 110.353345 },
    { id: 7, type: "view", name: "天空之山", desc: "适合拍照的美景", lat: 20.064052, lng: 110.313215 },
    { id: 8, type: "view", name: "西秀海滩", desc: "海边海滩 出片地", lat: 20.029237, lng: 110.270513 },
    { id: 9, type: "view", name: "观海台", desc: "临近海边网红出片地", lat: 20.037925, lng: 110.304154 },
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
    { id: 23, type: "food", name: "文昌邓记清补凉", desc: "海南清补凉你值得拥有", lat: 20.026083, lng: 110.080660 },
    { id: 24, type: "food", name: "美元味饮食店", desc: "海南粉，粉汤伊面汤", lat: 20.010878, lng: 110.360648 },
    { id: 25, type: "food", name: "老机场陈记粉条王", desc: "正宗后安粉，味道top1", lat: 20.008954, lng: 110.320581 },
    { id: 26, type: "food", name: "三爷糟粕醋", desc: "海南特色糟粕醋 口味独特", lat: 20.045964, lng: 110.349623 },
    { id: 27, type: "food", name: "老机场陈记粉条王(西沙店)", desc: "正宗后安粉 香极了", lat: 20.025471, lng: 110.341446 },
    { id: 28, type: "food", name: "韩汪记糟粕醋", desc: "海南特色糟粕醋 口味独特", lat: 20.006376, lng: 110.366164 },
    { id: 29, type: "food", name: "贞姐十三小鱼煲", desc: "特色鱼煲，作者从小吃到大", lat: 20.044265, lng: 110.353645 },
    { id: 30, type: "food", name: "无名鸡饭", desc: "海南文昌鸡，小红书榜第一", lat: 20.031529, lng: 110.340119 },
    { id: 31, type: "food", name: "肥婆兰鸡饭", desc: "海南文昌鸡 味道也不错", lat: 20.045125, lng: 110.350187 },
    { id: 32, type: "food", name: "白明泉椰子鸡", desc: "特色椰子鸡，火锅首选", lat: 20.032235, lng: 110.338479 },
    { id: 33, type: "food", name: "文昌鸡椰子汤", desc: "特色椰子鸡，还有煲仔饭", lat: 20.073184, lng: 110.336362 },
    { id: 34, type: "food", name: "西天庙", desc: "甜品小吃一条街", lat: 20.047292, lng: 110.346373 },
    { id: 35, type: "cafe", name: "小夜盲", desc: "氛围特别好的一个小咖啡馆", lat: 20.034977, lng: 110.346373 },
    { id: 36, type: "cafe", name: "工芸咖啡", desc: "能看海景的咖啡馆", lat: 20.061229, lng: 110.317416 },
    { id: 37, type: "cafe", name: "斑马院子", desc: "有懒人沙发很舒服", lat: 20.031764, lng: 110.332199 },
    { id: 38, type: "cafe", name: "青庭咖啡", desc: "有面朝阳光的窗，很出片", lat: 20.041134, lng: 110.325469 },
    { id: 39, type: "cafe", name: "肆意茶聊", desc: "清冷感的竹林茶馆", lat: 20.033555, lng: 110.334263 },
    { id: 40, type: "cafe", name: "盐巴saltea(金茂店）", desc: "布满绿植的咖啡小院子", lat: 20.027084, lng: 110.307733 },
  ];

  // ================================
  // ✅ 核心功能逻辑 (收藏、标记、导航)
  // ================================

  function getDistance(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1) return "...";
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(2);
  }

  const toggleFavorite = async (place) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${authApiBase}/api/favorites/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, placeId: place.id }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.action === "added") setFavorites([...favorites, place]);
        else setFavorites(favorites.filter((f) => f.id !== place.id));
      }
    } catch (e) { console.error("同步失败"); }
  };

  const togglePlaceOnMap = (place) => {
    const exists = targetPlaces.find((p) => p.id === place.id);
    if (exists) setTargetPlaces(targetPlaces.filter((p) => p.id !== place.id));
    else setTargetPlaces([...targetPlaces, place]);
  };

  const filteredPlaces = places
    .filter(p => (filter === "all" ? true : filter === "favorite" ? favorites.some(f => f.id === p.id) : p.type === filter))
    .filter(p => p.name.includes(search))
    .map(p => ({ ...p, distance: getDistance(userLocation?.lat, userLocation?.lng, p.lat, p.lng) }))
    .sort((a, b) => a.distance - b.distance);

  // ================================
  // 渲染逻辑 A：登录/注册/重置
  // ================================
  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "#f4fbf6" }}>
        <form onSubmit={handleAuthSubmit} style={{ width: "100%", maxWidth: "420px", background: "white", padding: "30px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
          <h2 style={{ textAlign: "center", color: "#2e6a4a", marginTop: 0 }}>
             {authMode === "login" ? "登录海口地图" : authMode === "register" ? "新用户注册" : "找回密码"}
          </h2>
          <input value={loginForm.phone} onChange={e => setLoginForm({...loginForm, phone: e.target.value})} placeholder="手机号" style={inputStyle} />
          {authMode !== "login" && (
            <>
              {authMode === "register" && <input value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} placeholder="用户名" style={inputStyle} />}
              <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                <input value={loginForm.code} onChange={e => setLoginForm({...loginForm, code: e.target.value})} placeholder="验证码" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                <button type="button" onClick={handleSendCode} disabled={countdown > 0 || isSendingCode} style={btnCodeStyle}>{countdown > 0 ? `${countdown}s` : "获取"}</button>
              </div>
            </>
          )}
          <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} placeholder="密码" style={inputStyle} />
          {loginError && <p style={{ color: "red", fontSize: "13px", textAlign: "center" }}>⚠️ {loginError}</p>}
          {codeHint && <p style={{ color: "green", fontSize: "13px", textAlign: "center" }}>✅ {codeHint}</p>}
          <button type="submit" disabled={isAuthLoading} style={btnMainStyle}>{isAuthLoading ? "处理中..." : authMode === "login" ? "登录" : authMode === "register" ? "注册" : "重置"}</button>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", fontSize: "14px" }}>
            {authMode === "login" ? (
              <><span style={linkStyle} onClick={() => setAuthMode("register")}>注册账号</span><span style={linkStyle} onClick={() => setAuthMode("reset")}>忘记密码？</span></>
            ) : ( <span style={linkStyle} onClick={() => setAuthMode("login")}>返回登录</span> )}
          </div>
        </form>
      </div>
    );
  }

  // ================================
  // ✅ 渲染逻辑 B：主界面 (手机端地图吸顶优化版)
  // ================================
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: isMobile ? "column" : "row", // 手机端纵向排列
      height: "100vh", 
      width: "100vw",
      overflow: "hidden", // 防止整页滑动
      background: "#f4fbf6" 
    }}>
      
      {/* 🟢 上部/右侧：百度地图 (手机端高度固定为40%) */}
      <div style={{ 
        width: isMobile ? "100%" : "auto", 
        height: isMobile ? "40vh" : "100%", 
        flex: isMobile ? "none" : 1,
        position: "relative",
        zIndex: 10
      }}>
        {/* ✅ 将 userLocation 传给地图 */}
        <BaiduMap targetPlaces={targetPlaces} userLocation={userLocation} />
        
        {/* 地图上的悬浮按钮 */}
        <button 
          onClick={() => window.location.reload()} 
          style={{ position: "absolute", right: "15px", bottom: "15px", width: "40px", height: "40px", borderRadius: "50%", background: "white", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", fontSize: "20px", cursor: "pointer", zIndex: 20 }}
        >🎯</button>
      </div>

      {/* 🟢 下部/左侧：列表区域 (手机端支持独立滚动) */}
      <div style={{ 
        width: isMobile ? "100%" : "380px", 
        height: isMobile ? "60vh" : "100vh", 
        overflowY: "auto", 
        background: "white", 
        boxShadow: isMobile ? "0 -5px 20px rgba(0,0,0,0.05)" : "4px 0 20px rgba(0,0,0,0.05)",
        zIndex: 15,
        padding: "20px",
        boxSizing: "border-box"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <div>
            <h2 style={{ margin: 0, color: "#2e6a4a", fontSize: "18px" }}>海口导览 Map</h2>
            <p style={{ margin: 0, color: "#999", fontSize: "12px" }}>Hi, {currentUser.username}</p>
          </div>
          <button onClick={handleLogout} style={{ background: "#fdebee", color: "#d94f5c", border: "none", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" }}>退出</button>
        </div>

        <input placeholder="搜索店名、路线..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />

        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "10px", marginBottom: "10px" }}>
          {["all", "favorite", "food", "view", "street", "cafe"].map(k => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "6px 12px", borderRadius: "20px", border: "none", background: filter === k ? "#5aa77b" : "#f0f0f0", color: filter === k ? "white" : "#666", cursor: "pointer", whiteSpace: "nowrap" }}>
              {k === "all" ? "全部" : k === "favorite" ? "⭐ 收藏" : k === "food" ? "🍱 美食" : k === "view" ? "景点" : k === "street" ? "商圈" : "☕"}
            </button>
          ))}
        </div>

        {/* 列表渲染 */}
        <div style={{ paddingBottom: "30px" }}>
          {filteredPlaces.map(p => (
            <div key={p.id} style={{ padding: "16px", background: "#f9fcf9", borderRadius: "16px", marginBottom: "15px", border: "1px solid #f0f5f1" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, fontSize: "16px" }}>{p.name}</h3>
                <span onClick={() => toggleFavorite(p)} style={{ cursor: "pointer", fontSize: "20px" }}>{favorites.some(f => f.id === p.id) ? "⭐" : "☆"}</span>
              </div>
              <p style={{ fontSize: "13px", color: "#777", margin: "5px 0" }}>{p.desc}</p>
              <div style={{ fontSize: "12px", color: "#5aa77b", marginBottom: "10px" }}>📏 距你：{p.distance} km</div>
              
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => togglePlaceOnMap(p)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: targetPlaces.some(tp => tp.id === p.id) ? "#df6b76" : "#e8f5eb", color: targetPlaces.some(tp => tp.id === p.id) ? "white" : "#2e6a4a", fontSize: "13px", fontWeight: "bold" }}>
                  {targetPlaces.some(tp => tp.id === p.id) ? "取消路线" : "标记路线"}
                </button>
                <button onClick={() => {
                  const url = `https://api.map.baidu.com/direction?destination=${p.lat},${p.lng}|name:${encodeURIComponent(p.name)}&mode=driving&region=海口&output=html&src=haikou-guide`;
                  window.open(url, "_blank");
                }} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: "#5aa77b", color: "white", fontSize: "13px", fontWeight: "bold" }}>🧭 导航</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 样式定义
const inputStyle = { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "10px", border: "1px solid #ddd", boxSizing: "border-box" };
const btnCodeStyle = { background: "#7dbf96", color: "white", border: "none", borderRadius: "10px", width: "80px", cursor: "pointer", fontWeight: "bold" };
const btnMainStyle = { width: "100%", padding: "14px", background: "#5aa77b", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" };
const linkStyle = { color: "#5aa77b", cursor: "pointer", textDecoration: "underline" };

export default App;