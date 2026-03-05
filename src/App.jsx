import React, { useEffect, useState } from "react";
import BaiduMap from "./BaiduMap";

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState([]); // 这里现在同步 MySQL 数据
  const [targetPlaces, setTargetPlaces] = useState([]); // 地图上的大头针
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // ✅ 认证与模式状态
  const [currentUser, setCurrentUser] = useState(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", phone: "", code: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [codeHint, setCodeHint] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // 后端 API 地址
  const authApiBase = "http://localhost:3001";

  // ================================
  // 1. 初始化与定位
  // ================================
  useEffect(() => {
    // 读取本地登录状态
    const savedUser = JSON.parse(localStorage.getItem("haikouUser"));
    if (savedUser) setCurrentUser(savedUser);

    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    
    // 获取当前位置
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error("无法获取定位", err)
    );

    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ================================
  // 2. ✅ 云端收藏同步逻辑
  // ================================
  useEffect(() => {
    if (currentUser) {
      // 登录后，去 MySQL 拿这个人的收藏列表
      fetch(`${authApiBase}/api/favorites/${currentUser.phone}`)
        .then(res => res.json())
        .then(data => {
          if (data.ok) {
            // data.favIds 是一个数字数组，例如 [1, 5, 20]
            // 从全量地点库中过滤出这些对象
            const cloudFavs = places.filter(p => data.favIds.includes(p.id));
            setFavorites(cloudFavs);
          }
        })
        .catch(err => console.error("获取云端收藏失败", err));
    } else {
      setFavorites([]); // 退出登录清空收藏预览
    }
  }, [currentUser]);

  // 验证码倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // ================================
  // 3. 认证逻辑 (注册/登录)
  // ================================
  const handleSendCode = async () => {
    const { phone } = loginForm;
    if (!/^1\d{10}$/.test(phone)) return setLoginError("手机号不正确");
    setIsSendingCode(true);
    try {
      const res = await fetch(`${authApiBase}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.ok) { setCodeHint("验证码已发出"); setCountdown(60); }
      else setLoginError(data.message);
    } catch (e) { setLoginError("后端未启动"); }
    finally { setIsSendingCode(false); }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isRegisterMode ? "/api/auth/register" : "/api/auth/login";
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
        if (isRegisterMode) {
          alert("注册成功，请登录！");
          setIsRegisterMode(false);
        } else {
          setCurrentUser(data.user);
          localStorage.setItem("haikouUser", JSON.stringify(data.user));
        }
      } else { setLoginError(data.message); }
    } catch (e) { setLoginError("连接服务器失败"); }
    finally { setIsAuthLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem("haikouUser");
    setCurrentUser(null);
  };

  // ================================
  // 4. ✅ 收藏云同步操作
  // ================================
  const toggleFavorite = async (place) => {
    if (!currentUser) return alert("请先登录");

    try {
      // 请求后端：数据库里有就删除，没有就添加
      const res = await fetch(`${authApiBase}/api/favorites/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentUser.phone, placeId: place.id }),
      });
      const data = await res.json();

      if (data.ok) {
        if (data.action === "added") {
          setFavorites([...favorites, place]);
        } else {
          setFavorites(favorites.filter((f) => f.id !== place.id));
        }
      }
    } catch (error) {
      alert("云端同步失败，请重试");
    }
  };

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



  function getDistance(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1) return "...";
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(2);
  }

  const togglePlaceOnMap = (place) => {
    const exists = targetPlaces.find((p) => p.id === place.id);
    setTargetPlaces(exists ? targetPlaces.filter((p) => p.id !== place.id) : [...targetPlaces, place]);
  };

  const filteredPlaces = places
    .filter((p) => {
      if (filter === "all") return true;
      if (filter === "favorite") return favorites.some((f) => f.id === p.id);
      return p.type === filter;
    })
    .filter((p) => p.name.includes(search))
    .map((p) => ({
      ...p,
      distVal: userLocation ? parseFloat(getDistance(userLocation.lat, userLocation.lng, p.lat, p.lng)) : 999
    }))
    .sort((a, b) => a.distVal - b.distVal);

  // ================================
  // 6. UI 渲染
  // ================================
  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#e8f5eb" }}>
        <form onSubmit={handleAuthSubmit} style={{ width: "360px", background: "white", padding: "30px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
          <h2 style={{ textAlign: "center", color: "#2e6a4a" }}>{isRegisterMode ? "账号注册" : "海口推荐地图"}</h2>
          
          <input 
            placeholder="手机号" 
            style={{ width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "10px", border: "1px solid #ddd", boxSizing: "border-box" }}
            onChange={e => setLoginForm({...loginForm, phone: e.target.value})} 
          />

          {isRegisterMode && (
            <>
              <input placeholder="用户名" style={{ width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "10px", border: "1px solid #ddd", boxSizing: "border-box" }} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
              <div style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
                <input placeholder="验证码" style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #ddd" }} onChange={e => setLoginForm({...loginForm, code: e.target.value})} />
                <button type="button" onClick={handleSendCode} disabled={countdown > 0} style={{ borderRadius: "10px", border: "none", background: "#7dbf96", color: "white", cursor: "pointer", width: "80px" }}>
                  {countdown > 0 ? `${countdown}s` : "获取"}
                </button>
              </div>
            </>
          )}

          <input type="password" placeholder="密码" style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "10px", border: "1px solid #ddd", boxSizing: "border-box" }} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />

          {loginError && <p style={{ color: "red", fontSize: "13px" }}>{loginError}</p>}
          
          <button type="submit" style={{ width: "100%", padding: "14px", background: "#5aa77b", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
            {isAuthLoading ? "处理中..." : (isRegisterMode ? "注册" : "登录")}
          </button>

          <p onClick={() => setIsRegisterMode(!isRegisterMode)} style={{ textAlign: "center", color: "#5aa77b", marginTop: "15px", cursor: "pointer", fontSize: "14px" }}>
            {isRegisterMode ? "已有账号？去登录" : "新用户？去注册账号"}
          </p>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: isMobile ? "block" : "flex", height: "100vh" }}>
      <div style={{ width: isMobile ? "100%" : "380px", padding: "20px", overflowY: "auto", background: "white", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ margin: 0 }}>📍 海口推荐</h2>
          <button onClick={handleLogout} style={{ border: "none", background: "#fdebee", color: "#d94f5c", borderRadius: "5px", padding: "5px 10px", cursor: "pointer" }}>退出</button>
        </div>

        <input placeholder="搜索地点..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #eee", marginBottom: "15px", boxSizing: "border-box" }} />

        <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "20px" }}>
          {["all", "favorite", "food", "view", "street", "cafe"].map(k => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: "6px 15px", borderRadius: "20px", border: "none", background: filter === k ? "#5aa77b" : "#eee", color: filter === k ? "white" : "#666", cursor: "pointer", whiteSpace: "nowrap" }}>
              {k === "all" ? "全部" : k === "favorite" ? "⭐" : k}
            </button>
          ))}
        </div>

        {filteredPlaces.map(p => (
          <div key={p.id} style={{ padding: "15px", borderRadius: "15px", background: "#f9fcf9", marginBottom: "15px", border: "1px solid #f0f5f1" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>{p.name}</h3>
              <span onClick={() => toggleFavorite(p)} style={{ cursor: "pointer", fontSize: "20px" }}>
                {favorites.some(f => f.id === p.id) ? "⭐" : "☆"}
              </span>
            </div>
            <p style={{ color: "#666", fontSize: "14px", margin: "5px 0" }}>{p.desc}</p>
            <div style={{ fontSize: "12px", color: "#5aa77b" }}>📏 {p.distVal} km</div>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={() => togglePlaceOnMap(p)} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: targetPlaces.some(tp => tp.id === p.id) ? "#df6b76" : "#e8f5eb", color: targetPlaces.some(tp => tp.id === p.id) ? "white" : "#2e6a4a", cursor: "pointer" }}>
                {targetPlaces.some(tp => tp.id === p.id) ? "移除标记" : "📍 标记"}
              </button>
              <button onClick={() => {
                const url = `https://api.map.baidu.com/direction?destination=${p.lat},${p.lng}|name:${encodeURIComponent(p.name)}&mode=driving&region=海口&output=html&src=haikou-guide`;
                window.open(url, "_blank");
              }} style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: "#5aa77b", color: "white", cursor: "pointer" }}>🧭 导航</button>
            </div>
          </div>
        ))}
      </div>
      {!isMobile && <div style={{ flex: 1 }}><BaiduMap targetPlaces={targetPlaces} /></div>}
    </div>
  );
}

export default App;