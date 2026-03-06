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

    // 获取高精度定位
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
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
  // ✅ 新增：头像上传逻辑
  // ================================
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("图片不能超过2MB");

    const formData = new FormData();
    formData.append("avatar", file);
    formData.append("phone", currentUser.phone);

    try {
      const res = await fetch(`${authApiBase}/api/user/upload-avatar`, {
        method: "POST",
        body: formData, // 上传文件浏览器会自动处理 Boundary
      });
      const data = await res.json();
      if (data.ok) {
        const updatedUser = { ...currentUser, avatar_url: data.avatarUrl };
        setCurrentUser(updatedUser);
        localStorage.setItem("haikouUser", JSON.stringify(updatedUser));
        alert("头像已更新");
      } else { alert(data.message); }
    } catch (error) { alert("上传失败，请检查后端运行状态"); }
  };

  // ================================
  // ✅ 认证业务逻辑 (登录、注册、重置)
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
    } catch (e) { setLoginError("服务器连接失败"); }
    finally { setIsAuthLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("haikouUser");
    setCurrentUser(null);
  };

  // ================================
  // ✅ 全部地点数据 (原样保留 40 个地点)
  // ================================
  const places = [
    { id: 1, type: "view", name: "云洞图书馆", desc: "海口经典打卡地", lat: 20.091026, lng: 110.262594 },
    { id: 2, type: "view", name: "世纪大桥", desc: "夜景唯美", lat: 20.055302, lng: 110.326392 },
    { id: 3, type: "view", name: "假日海滩", desc: "海口海边风景", lat: 20.038396, lng: 110.250973 },
    { id: 4, type: "view", name: "万绿园", desc: "城市中心大公园", lat: 20.039770, lng: 110.320249 },
    { id: 5, type: "street", name: "骑楼老街", desc: "历史商业街", lat: 20.046030, lng: 110.350885 },
    { id: 6, type: "street", name: "日月广场免税店", desc: "购物中心", lat: 20.022236, lng: 110.353345 },
    { id: 7, type: "view", name: "天空之山", desc: "出片美景", lat: 20.064052, lng: 110.313215 },
    { id: 8, type: "view", name: "西秀海滩", desc: "海边海滩", lat: 20.029237, lng: 110.270513 },
    { id: 9, type: "view", name: "观海台", desc: "网红出片地", lat: 20.037925, lng: 110.304154 },
    { id: 10, type: "view", name: "拾贝公园", desc: "小众海边", lat: 20.094954, lng: 110.375914 },
    { id: 11, type: "street", name: "友谊阳光城", desc: "人气商场", lat: 20.029385, lng: 110.330482 },
    { id: 12, type: "street", name: "龙湖天街", desc: "超大型商场", lat: 20.002361, lng: 110.336522 },
    { id: 13, type: "street", name: "吾悦广场", desc: "商业广场", lat: 19.982740, lng: 110.345532 },
    { id: 14, type: "street", name: "自在湾", desc: "临海步行街", lat: 20.042410, lng: 110.314577 },
    { id: 15, type: "food", name: "正方华", desc: "特色老爸茶", lat: 20.035661, lng: 110.349434 },
    { id: 16, type: "food", name: "高登福", desc: "招牌老爸茶", lat: 20.001903, lng: 110.362043 },
    { id: 17, type: "food", name: "九记甜品", desc: "深受游客喜爱", lat: 20.028871, lng: 110.335004 },
    { id: 18, type: "food", name: "柿里糖水铺", desc: "氛围甜水铺", lat: 20.027454, lng: 110.311212 },
    { id: 19, type: "food", name: "萝冰冰", desc: "适合带娃", lat: 20.025954, lng: 110.339806 },
    { id: 20, type: "food", name: "海大南门夜市", desc: "当地特色小吃", lat: 20.056054, lng: 110.343200 },
    { id: 21, type: "food", name: "阿娥餐饮店", desc: "特色炸炸店", lat: 20.044653, lng: 110.351382 },
    { id: 22, type: "food", name: "姚记辣汤饭", desc: "海南特色", lat: 20.049292, lng: 110.352991 },
    { id: 23, type: "food", name: "文昌邓记清补凉", desc: "清补凉必吃", lat: 20.026083, lng: 110.080660 },
    { id: 24, type: "food", name: "美元味饮食店", desc: "海南粉汤", lat: 20.010878, lng: 110.360648 },
    { id: 25, type: "food", name: "陈记粉条王", desc: "正宗后安粉", lat: 20.008954, lng: 110.320581 },
    { id: 26, type: "food", name: "三爷糟粕醋", desc: "口味独特", lat: 20.045964, lng: 110.349623 },
    { id: 27, type: "food", name: "陈记粉条王西沙店", desc: "香极了", lat: 20.025471, lng: 110.341446 },
    { id: 28, type: "food", name: "韩汪记糟粕醋", desc: "海南特色", lat: 20.006376, lng: 110.366164 },
    { id: 29, type: "food", name: "贞姐十三小鱼煲", desc: "从小吃到大", lat: 20.044265, lng: 110.353645 },
    { id: 30, type: "food", name: "无名鸡饭", desc: "口味榜第一", lat: 20.031529, lng: 110.340119 },
    { id: 31, type: "food", name: "肥婆兰鸡饭", desc: "味道不错", lat: 20.045125, lng: 110.350187 },
    { id: 32, type: "food", name: "白明泉椰子鸡", desc: "火锅首选", lat: 20.032235, lng: 110.338479 },
    { id: 33, type: "food", name: "文昌鸡椰子汤", desc: "还有煲仔饭", lat: 20.073184, lng: 110.336362 },
    { id: 34, type: "food", name: "西天庙", desc: "甜品一条街", lat: 20.047292, lng: 110.346373 },
    { id: 35, type: "cafe", name: "小夜盲", desc: "氛围极好", lat: 20.034977, lng: 110.346373 },
    { id: 36, type: "cafe", name: "工芸咖啡", desc: "海景咖啡馆", lat: 20.061229, lng: 110.317416 },
    { id: 37, type: "cafe", name: "斑马院子", desc: "懒人沙发", lat: 20.031764, lng: 110.332199 },
    { id: 38, type: "cafe", name: "青庭咖啡", desc: "阳光之窗", lat: 20.041134, lng: 110.325469 },
    { id: 39, type: "cafe", name: "肆意茶聊", desc: "竹林茶馆", lat: 20.033555, lng: 110.334263 },
    { id: 40, type: "cafe", name: "盐巴saltea", desc: "绿植小院", lat: 20.027084, lng: 110.307733 },
  ];

  // 距离计算
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
    const data = await res.json();
    if (data.ok) {
      if (data.action === "added") setFavorites([...favorites, place]);
      else setFavorites(favorites.filter((f) => f.id !== place.id));
    }
  };

  const filteredPlaces = places
    .filter(p => (filter === "all" ? true : filter === "favorite" ? favorites.some(f => f.id === p.id) : p.type === filter))
    .filter(p => p.name.includes(search))
    .map(p => ({ ...p, distance: getDistance(userLocation?.lat, userLocation?.lng, p.lat, p.lng) }))
    .sort((a, b) => a.distance - b.distance);

  // ======================== 渲染逻辑 A：登录系统 ========================
  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "#f4fbf6" }}>
        <form onSubmit={handleAuthSubmit} style={{ width: "100%", maxWidth: "400px", background: "white", padding: "30px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
          <h2 style={{ textAlign: "center", color: "#2e6a4a" }}>
             {authMode === "login" ? "登录海口地图" : authMode === "register" ? "新用户注册" : "重置密码"}
          </h2>
          <input placeholder="手机号" style={inputStyle} onChange={e => setLoginForm({...loginForm, phone: e.target.value})} />
          {authMode !== "login" && (
            <>
              {authMode === "register" && <input placeholder="用户名" style={inputStyle} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />}
              <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                <input placeholder="验证码" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} onChange={e => setLoginForm({...loginForm, code: e.target.value})} />
                <button type="button" onClick={handleSendCode} disabled={countdown > 0} style={btnCodeStyle}>{countdown > 0 ? `${countdown}s` : "获取"}</button>
              </div>
            </>
          )}
          <input type="password" placeholder="密码" style={inputStyle} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
          {loginError && <p style={{ color: "red", fontSize: "13px" }}>{loginError}</p>}
          <button type="submit" disabled={isAuthLoading} style={btnMainStyle}>{isAuthLoading ? "请稍候" : "确定"}</button>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", fontSize: "14px" }}>
            <span style={linkStyle} onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>{authMode === "login" ? "注册账号" : "返回登录"}</span>
            {authMode === "login" && <span style={linkStyle} onClick={() => setAuthMode("reset")}>忘记密码？</span>}
          </div>
        </form>
      </div>
    );
  }

  // ======================== ✅ 渲染逻辑 B：主界面 (手机吸顶优化版) ========================
  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: "100vh", overflow: "hidden", background: "#f4fbf6" }}>
      
      {/* 🔴 手机端吸顶地图 (40vh) */}
      <div style={{ 
        width: isMobile ? "100%" : "auto", 
        height: isMobile ? "40vh" : "100%", 
        flex: isMobile ? "none" : 1,
        position: "relative",
        zIndex: 10
      }}>
        <BaiduMap targetPlaces={targetPlaces} userLocation={userLocation} />
        {/* 回到定位按钮 */}
        <button onClick={() => window.location.reload()} style={floatBtnStyle}>🎯</button>
      </div>

      {/* 🔵 列表区 (手机端占 60vh 且独立滚动) */}
      <div style={{ 
        width: isMobile ? "100%" : "380px", 
        height: isMobile ? "60vh" : "100vh", 
        overflowY: "auto", 
        background: "white", 
        boxShadow: "0 -5px 20px rgba(0,0,0,0.05)",
        zIndex: 15, padding: "20px", boxSizing: "border-box"
      }}>
        
        {/* ✅ 用户头像与信息区域 */}
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
              <h3 style={{ margin: 0, fontSize: "18px", color: "#2e6a4a" }}>{currentUser.username}</h3>
              <p onClick={handleLogout} style={{ margin: 0, color: "#d94f5c", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}>退出登录</p>
           </div>
        </div>

        <input placeholder="搜索目的地..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />

        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "10px", marginBottom: "15px" }}>
          {["all", "favorite", "food", "view", "street", "cafe"].map(k => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "6px 12px", borderRadius: "20px", border: "none", background: filter === k ? "#5aa77b" : "#f0f0f0", color: filter === k ? "white" : "#666", cursor: "pointer", whiteSpace: "nowrap" }}>
              {k === "all" ? "全部" : k === "favorite" ? "⭐ 收藏" : k}
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
            <div style={{ fontSize: "12px", color: "#5aa77b", marginBottom: "12px" }}>📏 距你 {p.distance} km</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setTargetPlaces(prev => prev.some(tp => tp.id === p.id) ? prev.filter(tp => tp.id !== p.id) : [...prev, p])} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: targetPlaces.some(tp => tp.id === p.id) ? "#df6b76" : "#e8f5eb", color: targetPlaces.some(tp => tp.id === p.id) ? "white" : "#2e6a4a", fontWeight: "bold", fontSize: "13px" }}>
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

// 💄 样式
const inputStyle = { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "10px", border: "1px solid #ddd", boxSizing: "border-box" };
const btnCodeStyle = { background: "#7dbf96", color: "white", border: "none", borderRadius: "10px", width: "75px", cursor: "pointer", fontSize: "12px" };
const btnMainStyle = { width: "100%", padding: "14px", background: "#5aa77b", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold" };
const linkStyle = { color: "#5aa77b", cursor: "pointer", textDecoration: "underline" };
const floatBtnStyle = { position: "absolute", right: "15px", bottom: "15px", width: "40px", height: "40px", borderRadius: "50%", background: "white", border: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", fontSize: "20px", zIndex: 20 };
const plusIconStyle = { position: 'absolute', bottom: 0, right: 0, background: '#5aa77b', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid white', fontSize: '12px' };

export default App;