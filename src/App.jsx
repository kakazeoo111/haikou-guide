import React, { useEffect, useState } from "react";
import BaiduMap from "./BaiduMap";

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [targetPlaces, setTargetPlaces] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // ✅ 认证状态：login (登录), register (注册), reset (重置密码)
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login"); 
  const [form, setForm] = useState({ username: "", phone: "", code: "", password: "" });
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const apiBase = "https://api.suzcore.top";

  // 初始化
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("haikouUser"));
    if (saved) setCurrentUser(saved);
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    navigator.geolocation.getCurrentPosition(p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }));
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // 云端同步收藏
  useEffect(() => {
    if (currentUser) {
      fetch(`${apiBase}/api/favorites/${currentUser.phone}`)
        .then(r => r.json())
        .then(d => d.ok && setFavorites(places.filter(p => d.favIds.includes(p.id))));
    }
  }, [currentUser]);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 发送验证码逻辑
  const handleSendCode = async () => {
    if (!/^1\d{10}$/.test(form.phone)) return setError("请输入正确的手机号");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, type: authMode }),
      });
      const data = await res.json();
      if (data.ok) { setHint("验证码已发送"); setCountdown(60); }
      else setError(data.message);
    } catch (e) { setError("后端未启动或网络异常"); }
    finally { setLoading(false); }
  };

  // 提交逻辑 (登录/注册/重置)
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    let endpoint = "/api/auth/login";
    if (authMode === "register") endpoint = "/api/auth/register";
    if (authMode === "reset") endpoint = "/api/auth/reset-password";

    try {
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        if (authMode === "login") {
          setCurrentUser(data.user);
          localStorage.setItem("haikouUser", JSON.stringify(data.user));
        } else {
          alert(data.message);
          setAuthMode("login");
          setForm({ ...form, code: "" });
        }
      } else { setError(data.message); }
    } catch (e) { setError("服务器连接失败"); }
    finally { setLoading(false); }
  };

  const handleLogout = () => { localStorage.removeItem("haikouUser"); setCurrentUser(null); };

  // ================================
  // ✅你自己的推荐地点（四大分类）
  const places = [
    {
      id: 1,
      type: "view",
      name: "云洞图书馆",
      desc: "海口经典打卡地",
      lat: 20.091026,
      lng: 110.262594,
    },
    {
      id: 2,
      type: "view",
      name: "世纪大桥",
      desc: "夜景唯美",
      lat: 20.055302,
      lng: 110.326392,
    },
    {
      id: 3,
      type: "view",
      name: "假日海滩",
      desc: "海口海边风景",
      lat: 20.038396,
      lng: 110.250973,
    },
    {
      id: 4,
      type: "view",
      name: "万绿园",
      desc: "城市中心大公园，适合散步",
      lat: 20.039770,
      lng: 110.320249,
    },
    {
      id: 5,
      type: "street",
      name: "骑楼老街",
      desc: "海口历史商业街，网红打卡地",
      lat: 20.046030,
      lng: 110.350885,
    },
    {
      id: 6,
      type: "street",
      name: "日月广场免税店",
      desc: "海口最大商业购物中心",
      lat: 20.022236,
      lng: 110.353345,
    },
    {
      id: 7,
      type: "view",
      name: "天空之山",
      desc: "适合拍照的美景",
      lat: 20.064052,
      lng: 110.313215,
    },
    {
      id: 8,
      type: "view",
      name: "西秀海滩",
      desc: "海边海滩 出片地",
      lat: 20.029237,
      lng: 110.270513,
    },
    {
      id: 9,
      type: "view",
      name: "观海台",
      desc: "临近海边网红出片地",
      lat: 20.037925,
      lng: 110.304154,
    },
    {
      id: 10,
      type: "view",
      name: "拾贝公园",
      desc: "小众高级感海边",
      lat: 20.094954,
      lng: 110.375914,
    },
    {
      id: 11,
      type: "street",
      name: "友谊阳光城",
      desc: "人气商场",
      lat: 20.029385,
      lng: 110.330482,
    },
    {
      id: 12,
      type: "street",
      name: "龙湖天街",
      desc: "人气超大型商场商场",
      lat: 20.002361,
      lng: 110.336522,
    },
    {
      id: 13,
      type: "street",
      name: "吾悦广场",
      desc: "曾经的辉煌商场",
      lat: 19.982740,
      lng: 110.345532,
    },
    {
      id: 14,
      type: "street",
      name: "自在湾",
      desc: "绝美临海步行街",
      lat: 20.042410,
      lng: 110.314577,
    },
    {
      id: 15,
      type: "food",
      name: "正方华(明珠广场店)",
      desc: "海南特色老爸茶",
      lat: 20.035661,
      lng: 110.349434,
    },
    {
      id: 16,
      type: "food",
      name: "高登福(高登街店)",
      desc: "海南招牌老爸茶",
      lat: 20.001903,
      lng: 110.362043,
    },
    {
      id: 17,
      type: "food",
      name: "九记甜品(华海店)",
      desc: "海南网红甜品，深受游客喜爱",
      lat: 20.028871,
      lng: 110.335004,
    },
    {
      id: 18,
      type: "food",
      name: "柿里糖水铺(世贸直营店)",
      desc: "海南特色甜水铺，氛围好",
      lat: 20.027454,
      lng: 110.311212,
    },
    {
      id: 19,
      type: "food",
      name: "萝冰冰",
      desc: "人气甜品店 适合带娃",
      lat: 20.025954,
      lng: 110.339806,
    },
    {
      id: 20,
      type: "food",
      name: "海大南门夜市",
      desc: "比较火的小吃街，有很多当地特色",
      lat: 20.056054,
      lng: 110.343200,
    },
    {
      id: 21,
      type: "food",
      name: "阿娥餐饮店",
      desc: "作者十分喜爱的炸炸店，是甜口的，价格便宜还有当地特色冷饮",
      lat: 20.044653,
      lng: 110.351382,
    },
    {
      id: 22,
      type: "food",
      name: "姚记辣汤饭",
      desc: "海南特色，值得一试",
      lat: 20.049292,
      lng: 110.352991,
    },
    {
      id: 23,
      type: "food",
      name: "文昌邓记清补凉(盛达景都店)",
      desc: "海南清补凉你值得拥有",
      lat: 20.026083,
      lng: 110.080660,
    },
    {
      id: 24,
      type: "food",
      name: "美元味饮食店",
      desc: "海南粉，粉汤伊面汤，是作者高中夜宵常客",
      lat: 20.010878,
      lng: 110.360648,
    },
    {
      id: 25,
      type: "food",
      name: "老机场陈记粉条王(金牛岭店)",
      desc: "正宗后安粉，味道top1",
      lat: 20.008954,
      lng: 110.320581,
    },
    {
      id: 26,
      type: "food",
      name: "三爷糟粕醋  ",
      desc: "海南特色糟粕醋 口味独特",
      lat: 20.045964,
      lng: 110.349623,
    },
     {
      id: 27,
      type: "food",
      name: "老机场陈记粉条王(西沙店)",
      desc: "正宗后安粉 香极了",
      lat: 20.025471,
      lng: 110.341446,
    },
    {
      id: 28,
      type: "food",
      name: "韩汪记糟粕醋",
      desc: "海南特色糟粕醋 口味独特",
      lat: 20.006376,
      lng: 110.366164,
    },
    {
      id: 29,
      type: "food",
      name: "贞姐十三小鱼煲  ",
      desc: "特色鱼煲，作者从小吃到大，值得一试",
      lat: 20.044265,
      lng: 110.353645,
    },
    {
      id: 30,
      type: "food",
      name: "无名鸡饭 ",
      desc: "海南文昌鸡，小红书口味榜第一",
      lat: 20.031529,
      lng: 110.340119,
    },
    {
      id: 31,
      type: "food",
      name: "肥婆兰鸡饭 ",
      desc: "海南文昌鸡 味道也不错",
      lat: 20.045125,
      lng: 110.350187,
    },
    {
      id: 32,
      type: "food",
      name: "白明泉椰子鸡 ",
      desc: "特色椰子鸡，火锅首选",
      lat: 20.032235,
      lng: 110.338479,
    },
    {
      id: 33,
      type: "food",
      name: "文昌鸡椰子汤 ",
      desc: "特色椰子鸡，还有煲仔饭",
      lat: 20.073184,
      lng: 110.336362,
    },
    {
      id: 34,
      type: "food",
      name: "西天庙 ",
      desc: "甜品小吃一条街",
      lat: 20.047292,
      lng: 110.346373,
    },
    {
      id: 35,
      type: "cafe",
      name: "小夜盲 ",
      desc: "氛围特别好的一个小咖啡馆",
      lat: 20.034977,
      lng: 110.346373,
    },
    {
      id: 36,
      type: "cafe",
      name: "工芸咖啡(华彩海口湾店) ",
      desc: "能看海景的咖啡馆 部分位置可以预约",
      lat: 20.061229,
      lng: 110.317416,
    },
    {
      id: 37,
      type: "cafe",
      name: "斑马院子 ",
      desc: "有懒人沙发很舒服",
      lat: 20.031764,
      lng: 110.332199,
    },
    {
      id: 38,
      type: "cafe",
      name: "青庭咖啡 ",
      desc: "有面朝阳光的窗，很出片",
      lat: 20.041134,
      lng: 110.325469,
    },
    {
      id: 39,
      type: "cafe",
      name: "肆意茶聊 ",
      desc: "清冷感的竹林茶馆",
      lat: 20.033555,
      lng: 110.334263,
    },
    {
      id: 40,
      type: "cafe",
      name: "盐巴saltea(金茂店）",
      desc: "布满绿植的咖啡小院子",
      lat: 20.027084,
      lng: 110.307733,
    },
  ];


const toggleFavorite = async (p) => {
    const res = await fetch(`${apiBase}/api/favorites/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: currentUser.phone, placeId: p.id }),
    });
    const data = await res.json();
    if (data.ok) setFavorites(data.action === 'added' ? [...favorites, p] : favorites.filter(f => f.id !== p.id));
  };

  const filteredPlaces = places.filter(p => (filter === "all" ? true : filter === "favorite" ? favorites.some(f => f.id === p.id) : p.type === filter)).filter(p => p.name.includes(search));

  // --- 渲染逻辑 ---
  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4fbf6", padding: "20px" }}>
        <form onSubmit={handleAuthSubmit} style={{ width: "100%", maxWidth: "380px", background: "white", padding: "30px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
          <h2 style={{ textAlign: "center", color: "#2e6a4a" }}>
            {authMode === "login" ? "欢迎回来" : authMode === "register" ? "新用户注册" : "找回密码"}
          </h2>
          
          <input placeholder="手机号" style={inputStyle} onChange={e => setForm({...form, phone: e.target.value})} />

          {authMode !== "login" && (
            <>
              {authMode === "register" && <input placeholder="用户名" style={inputStyle} onChange={e => setForm({...form, username: e.target.value})} />}
              <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                <input placeholder="验证码" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} onChange={e => setForm({...form, code: e.target.value})} />
                <button type="button" onClick={handleSendCode} disabled={countdown > 0} style={btnCodeStyle}>
                  {countdown > 0 ? `${countdown}s` : "获取"}
                </button>
              </div>
            </>
          )}

          <input type="password" placeholder={authMode === "reset" ? "设置新密码" : "请输入密码"} style={inputStyle} onChange={e => setForm({...form, password: e.target.value})} />

          {error && <p style={{ color: "red", fontSize: "13px" }}>{error}</p>}
          {hint && <p style={{ color: "green", fontSize: "13px" }}>{hint}</p>}

          <button type="submit" style={btnMainStyle}>
            {loading ? "处理中..." : authMode === "login" ? "立即登录" : authMode === "register" ? "确认注册" : "修改密码"}
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", fontSize: "14px" }}>
            {authMode === "login" ? (
              <><span style={linkStyle} onClick={() => setAuthMode("register")}>注册账号</span><span style={linkStyle} onClick={() => setAuthMode("reset")}>忘记密码？</span></>
            ) : (
              <span style={linkStyle} onClick={() => { setAuthMode("login"); setError(""); setHint(""); }}>已有账号？返回登录</span>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: isMobile ? "block" : "flex", height: "100vh" }}>
      <div style={{ width: isMobile ? "100%" : "380px", padding: "20px", overflowY: "auto", background: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2>📍 海口推荐</h2>
          <button onClick={handleLogout} style={{ border: "none", background: "#fdebee", color: "#d94f5c", borderRadius: "5px", padding: "5px 10px" }}>退出</button>
        </div>
        {filteredPlaces.map(p => (
          <div key={p.id} style={{ padding: "15px", background: "#f9fcf9", borderRadius: "15px", marginBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{p.name}</strong>
              <span onClick={() => toggleFavorite(p)} style={{ cursor: "pointer" }}>{favorites.some(f => f.id === p.id) ? "⭐" : "☆"}</span>
            </div>
            <p style={{ fontSize: "13px", color: "#666" }}>{p.desc}</p>
          </div>
        ))}
      </div>
      {!isMobile && <div style={{ flex: 1 }}><BaiduMap targetPlaces={targetPlaces} /></div>}
    </div>
  );
}

// 样式定义
const inputStyle = { width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "10px", border: "1px solid #ddd", boxSizing: "border-box" };
const btnCodeStyle = { background: "#7dbf96", color: "white", border: "none", borderRadius: "10px", width: "80px", cursor: "pointer" };
const btnMainStyle = { width: "100%", padding: "14px", background: "#5aa77b", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" };
const linkStyle = { color: "#5aa77b", cursor: "pointer", textDecoration: "underline" };

export default App;