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
  // ✅ 业务功能逻辑
  // ================================

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
        const updated = { ...currentUser, avatar_url: data.avatarUrl };
        setCurrentUser(updated);
        localStorage.setItem("haikouUser", JSON.stringify(updated));
      }
    } catch (e) { alert("上传失败"); }
  };

  const handleSendCode = async () => {
    const { phone } = loginForm;
    if (!/^1\d{10}$/.test(phone)) return setLoginError("手机号不正确");
    setIsSendingCode(true); setLoginError("");
    try {
      const res = await fetch(`${authApiBase}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, type: authMode }),
      });
      const d = await res.json();
      if (d.ok) { setCodeHint("验证码已发送"); setCountdown(60); }
      else { setLoginError(d.message); }
    } finally { setIsSendingCode(false); }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    let ep = authMode === "register" ? "/api/auth/register" : (authMode === "reset" ? "/api/auth/reset-password" : "/api/auth/login");
    setIsAuthLoading(true); setLoginError("");
    try {
      const res = await fetch(`${authApiBase}${ep}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const d = await res.json();
      if (d.ok) {
        if (authMode === "login") { setCurrentUser(d.user); localStorage.setItem("haikouUser", JSON.stringify(d.user)); }
        else { alert(d.message); setAuthMode("login"); }
      } else { setLoginError(d.message); }
    } finally { setIsAuthLoading(false); }
  };

  // ================================
  // ✅ 40个完整地点数据 (归位)
  // ================================
  const places = [
    { id: 1, type: "view", name: "云洞图书馆", desc: "海口经典打卡地", lat: 20.091026, lng: 110.262594 },
    { id: 2, type: "view", name: "世纪大桥", desc: "夜景唯美", lat: 20.055302, lng: 110.326392 },
    { id: 3, type: "view", name: "假日海滩", desc: "海口海边风景", lat: 20.038396, lng: 110.250973 },
    { id: 4, type: "view", name: "万绿园", desc: "城市中心大公园", lat: 20.039770, lng: 110.320249 },
    { id: 5, type: "street", name: "骑楼老街", desc: "历史商业街", lat: 20.046030, lng: 110.350885 },
    { id: 6, type: "street", name: "日月广场免税店", desc: "海口最大商业中心", lat: 20.022236, lng: 110.353345 },
    { id: 7, type: "view", name: "天空之山", desc: "适合拍照的美景", lat: 20.064052, lng: 110.313215 },
    { id: 8, type: "view", name: "西秀海滩", desc: "出片海滩", lat: 20.029237, lng: 110.270513 },
    { id: 9, type: "view", name: "观海台", desc: "临海网红出片地", lat: 20.037925, lng: 110.304154 },
    { id: 10, type: "view", name: "拾贝公园", desc: "小众高级感海边", lat: 20.094954, lng: 110.375914 },
    { id: 11, type: "street", name: "友谊阳光城", desc: "人气商场", lat: 20.029385, lng: 110.330482 },
    { id: 12, type: "street", name: "龙湖天街", desc: "人气超大型商场", lat: 20.002361, lng: 110.336522 },
    { id: 13, type: "street", name: "吾悦广场", desc: "大型购物广场", lat: 19.982740, lng: 110.345532 },
    { id: 14, type: "street", name: "自在湾", desc: "绝美临海步行街", lat: 20.042410, lng: 110.314577 },
    { id: 15, type: "food", name: "正方华", desc: "海南特色老爸茶", lat: 20.035661, lng: 110.349434 },
    { id: 16, type: "food", name: "高登福", desc: "海南招牌老爸茶", lat: 20.001903, lng: 110.362043 },
    { id: 17, type: "food", name: "九记甜品", desc: "海南网红甜品", lat: 20.028871, lng: 110.335004 },
    { id: 18, type: "food", name: "柿里糖水铺", desc: "海南特色甜水铺", lat: 20.027454, lng: 110.311212 },
    { id: 19, type: "food", name: "萝冰冰", desc: "人气甜品店", lat: 20.025954, lng: 110.339806 },
    { id: 20, type: "food", name: "海大南门夜市", desc: "当地特色小吃街", lat: 20.056054, lng: 110.343200 },
    { id: 21, type: "food", name: "阿娥餐饮店", desc: "甜口特色炸炸", lat: 20.044653, lng: 110.351382 },
    { id: 22, type: "food", name: "姚记辣汤饭", desc: "海南必吃特色", lat: 20.049292, lng: 110.352991 },
    { id: 23, type: "food", name: "文昌邓记清补凉", desc: "海南清补凉", lat: 20.026083, lng: 110.080660 },
    { id: 24, type: "food", name: "美元味饮食店", desc: "海南粉，夜宵常客", lat: 20.010878, lng: 110.360648 },
    { id: 25, type: "food", name: "陈记粉条王(金牛岭)", desc: "正宗后安粉", lat: 20.008954, lng: 110.320581 },
    { id: 26, type: "food", name: "三爷糟粕醋", desc: "海南特色酸辣口味", lat: 20.045964, lng: 110.349623 },
    { id: 27, type: "food", name: "陈记粉条王(西沙)", desc: "正宗后安粉 香极了", lat: 20.025471, lng: 110.341446 },
    { id: 28, type: "food", name: "韩汪记糟粕醋", desc: "口味独特", lat: 20.006376, lng: 110.366164 },
    { id: 29, type: "food", name: "贞姐十三小鱼煲", desc: "特色鱼煲", lat: 20.044265, lng: 110.353645 },
    { id: 30, type: "food", name: "无名鸡饭", desc: "文昌鸡口味第一", lat: 20.031529, lng: 110.340119 },
    { id: 31, type: "food", name: "肥婆兰鸡饭", desc: "经典海南鸡饭", lat: 20.045125, lng: 110.350187 },
    { id: 32, type: "food", name: "白明泉椰子鸡", desc: "正宗椰子鸡火锅", lat: 20.032235, lng: 110.338479 },
    { id: 33, type: "food", name: "文昌鸡椰子汤", desc: "特色汤和煲仔饭", lat: 20.073184, lng: 110.336362 },
    { id: 34, type: "food", name: "西天庙", desc: "甜品小吃一条街", lat: 20.047292, lng: 110.346373 },
    { id: 35, type: "cafe", name: "小夜盲", desc: "氛围感极佳咖啡馆", lat: 20.034977, lng: 110.346373 },
    { id: 36, type: "cafe", name: "工芸咖啡", desc: "海景咖啡馆", lat: 20.061229, lng: 110.317416 },
    { id: 37, type: "cafe", name: "斑马院子", desc: "有舒服的懒人沙发", lat: 20.031764, lng: 110.332199 },
    { id: 38, type: "cafe", name: "青庭咖啡", desc: "非常出片的阳光窗", lat: 20.041134, lng: 110.325469 },
    { id: 39, type: "cafe", name: "肆意茶聊", desc: "清冷感竹林茶馆", lat: 20.033555, lng: 110.334263 },
    { id: 40, type: "cafe", name: "盐巴saltea", desc: "绿植咖啡小院", lat: 20.027084, lng: 110.307733 },
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

  // --- 登录界面 ---
  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "#f4fbf6" }}>
        <form onSubmit={handleAuthSubmit} style={{ width: "100%", maxWidth: "380px", background: "white", padding: "30px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
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
  // ✅ 主界面 (手机端地图吸顶、列表滚动优化)
  // ================================
  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100vh", overflow: "hidden", background: "#f4fbf6" }}>
      
      {/* 🟢 上部/右侧：地图 (40vh 固定) */}
      <div style={{ width: isMobile ? "100%" : "auto", height: isMobile ? "40vh" : "100%", flex: isMobile ? "none" : 1, position: "relative", zIndex: 10 }}>
        <BaiduMap targetPlaces={targetPlaces} userLocation={userLocation} />
        {/* 定位/刷新按钮 */}
        <button onClick={() => window.location.reload()} style={floatBtnStyle}>🎯</button>
      </div>

      {/* 🟢 下部/左侧：列表区域 (60vh 滚动) */}
      <div style={{ 
        width: isMobile ? "100%" : "380px", 
        height: isMobile ? "60vh" : "100vh", 
        overflowY: "auto", 
        background: "white", 
        boxShadow: "0 -5px 20px rgba(0,0,0,0.05)",
        zIndex: 15, padding: "20px", boxSizing: "border-box"
      }}>
        
        {/* 用户区域：头像上传 */}
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
           <div onClick={() => document.getElementById('avatar-input').click()} style={{ position: 'relative', cursor: 'pointer' }}>
              <img 
                src={currentUser.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + currentUser.phone} 
                style={{ width: "55px", height: "55px", borderRadius: "50%", objectFit: "cover", border: "2px solid #5aa77b" }} 
              />
              <div style={plusIconStyle}>+</div>
           </div>
           <input type="file" id="avatar-input" hidden accept="image/*" onChange={handleAvatarUpload} />
           <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: "17px", color: "#2e6a4a" }}>{currentUser.username}</h3>
              <p onClick={() => { localStorage.removeItem("haikouUser"); window.location.reload(); }} style={{ margin: 0, color: "#d94f5c", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}>退出登录</p>
           </div>
        </div>

        <input placeholder="搜索目的地、路线..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />

        {/* ✅ 六个分类按钮 (回归) */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "15px" }}>
          {[
            { k: "all", l: "全部" },
            { k: "favorite", l: "⭐收藏" },
            { k: "food", l: "🍱美食" },
            { k: "view", l: "🏞️景点" },
            { k: "street", l: "🛍️商圈" },
            { k: "cafe", l: "☕咖啡" }
          ].map(item => (
            <button 
              key={item.k} 
              onClick={() => setFilter(item.k)} 
              style={{ padding: "6px 12px", borderRadius: "20px", border: "none", background: filter === item.k ? "#5aa77b" : "#f0f0f0", color: filter === item.k ? "white" : "#666", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {item.l}
            </button>
          ))}
        </div>

        {filteredPlaces.map(p => (
          <div key={p.id} style={{ padding: "16px", background: "#f9fcf9", borderRadius: "16px", marginBottom: "15px", border: "1px solid #f0f5f1" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: "16px" }}>{p.name}</h3>
              <span onClick={() => toggleFavorite(p)} style={{ cursor: "pointer", fontSize: "22px" }}>{favorites.some(f => f.id === p.id) ? "⭐" : "☆"}</span>
            </div>
            <p style={{ fontSize: "13px", color: "#777", margin: "5px 0" }}>{p.desc}</p>
            <div style={{ fontSize: "12px", color: "#5aa77b", marginBottom: "12px" }}>📏 距你：{p.distVal} km</div>
            
            <div style={{ display: "flex", gap: "8px" }}>
              <button 
                onClick={() => setTargetPlaces(prev => prev.some(tp => tp.id === p.id) ? prev.filter(tp => tp.id !== p.id) : [...prev, p])} 
                style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: targetPlaces.some(tp => tp.id === p.id) ? "#df6b76" : "#e8f5eb", color: targetPlaces.some(tp => tp.id === p.id) ? "white" : "#2e6a4a", fontWeight: "bold", fontSize: "13px" }}
              >
                {targetPlaces.some(tp => tp.id === p.id) ? "取消路线" : "标记路线"}
              </button>
              <button onClick={() => {
                const url = `https://api.map.baidu.com/direction?destination=${p.lat},${p.lng}|name:${encodeURIComponent(p.name)}&mode=driving&region=海口&output=html&src=haikou-guide`;
                window.open(url, "_blank");
              }} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: "#5aa77b", color: "white", fontWeight: "bold", fontSize: "13px" }}>🧭 导航</button>
            </div>
          </div>
        ))}
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

export default App;