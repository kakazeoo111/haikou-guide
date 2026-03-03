import React, { useEffect, useState } from "react";
import BaiduMap from "./BaiduMap";
import { APP_DEFAULT_COVER } from "./appConfig";


function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [targetPlaces, setTargetPlaces] = useState([]);
  const [currentPage, setCurrentPage] = useState("home");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
  const [appCover] = useState(APP_DEFAULT_COVER);



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
      desc: "布满绿植的院子",
      lat: 20.027084,
      lng: 110.307733,
    },
  ];



  // ================================
  // ✅距离计算（km）
  function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;

    return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(2);
  }

  const togglePlaceOnMap = (place) => {
  setTargetPlaces((prev) => {
    const exists = prev.find((p) => p.id === place.id);

    if (exists) {
      // 已存在 → 再点一次就移除
      return prev.filter((p) => p.id !== place.id);
    }

    // 不存在 → 加进去
    return [...prev, place];
  });
};


  // ================================
  // ✅打开百度地图导航
  function openBaiduNavigation(place) {
    const destination = `${place.lat},${place.lng}|name:${encodeURIComponent(
      place.name
    )}`;

    const origin = userLocation
      ? `${userLocation.lat},${userLocation.lng}|name:${encodeURIComponent(
          "我的位置"
        )}`
      : "";

    const query = new URLSearchParams({
      destination,
      mode: "driving",
      region: "海口",
      output: "html",
      src: "haikou-guide",
    });

    if (origin) {
      query.set("origin", origin);
    }

    const navUrl = `https://api.map.baidu.com/direction?${query.toString()}`;
    window.open(navUrl, "_blank", "noopener,noreferrer");
  }

  // ================================
  // ✅收藏切换函数
 const toggleFavorite = (place) => {

  // ✅判断这个地点是不是已经收藏了
  const alreadyFav = favorites.some((f) => f.id === place.id);

  if (alreadyFav) {
    // ===========================
    // ❌情况1：已经收藏 → 现在取消收藏
    // ===========================

    // 1️⃣从收藏列表删除
    setFavorites((prev) =>
      prev.filter((f) => f.id !== place.id)
    );

    // 2️⃣同时从地图标记中删除（重点！！）
    setTargetPlaces((prev) =>
      prev.filter((p) => p.id !== place.id)
    );

  } else {
    // ===========================
    // ✅情况2：没收藏 → 添加收藏
    // ===========================

    setFavorites((prev) => [...prev, place]);
  }
};


  // ================================
  // ✅按手机号加载该用户数据
  useEffect(() => {
    if (!isLoggedIn || !userPhone) return;

    const storageKey = `haikou_user_data_${userPhone}`;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setFavorites([]);
        setTargetPlaces([]);
        setFilter("all");
        setSearch("");
        setCurrentPage("home");
        setIsUserDataLoaded(true);
        return;
      }

      const parsed = JSON.parse(raw);
      setFavorites(Array.isArray(parsed.favorites) ? parsed.favorites : []);
      setTargetPlaces(Array.isArray(parsed.targetPlaces) ? parsed.targetPlaces : []);
      setFilter(parsed.filter || "all");
      setSearch(parsed.search || "");
      setCurrentPage(parsed.currentPage || "home");
      setUserName((prev) => parsed.name || prev || "旅行者");
    } catch {
      setFavorites([]);
      setTargetPlaces([]);
      setFilter("all");
      setSearch("");
      setCurrentPage("home");
    } finally {
      setIsUserDataLoaded(true);
    }
  }, [isLoggedIn, userPhone]);

  // ================================
  // ✅按手机号保存该用户数据
  useEffect(() => {
    if (!isLoggedIn || !userPhone || !isUserDataLoaded) return;

    const storageKey = `haikou_user_data_${userPhone}`;
    const payload = {
      phone: userPhone,
      name: userName || "旅行者",
      favorites,
      targetPlaces,
      filter,
      search,
      currentPage,
      updatedAt: Date.now(),
    };

    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [
    isLoggedIn,
    userPhone,
    userName,
    favorites,
    targetPlaces,
    filter,
    search,
    currentPage,
    isUserDataLoaded,
  ]);

  // ================================
  // ✅初始化地图 + Marker
  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      const location = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };

      setUserLocation(location);

      const BMapGL = window.BMapGL;
      const mapInstance = new BMapGL.Map("map");

      mapInstance.centerAndZoom(
        new BMapGL.Point(location.lng, location.lat),
        14
      );

      mapInstance.enableScrollWheelZoom(true);

      // ✅用户位置
      const userMarker = new BMapGL.Marker(
        new BMapGL.Point(location.lng, location.lat)
      );

      mapInstance.addOverlay(userMarker);

      userMarker.setLabel(
        new BMapGL.Label("📍你在这里", {
          offset: new BMapGL.Size(20, -10),
        })
      );

      
    });
  }, []);

  // ================================
  // ✅筛选 + 距离排序
  const filteredPlaces = places
    .filter((p) => {
      if (filter === "all") return true;
      if (filter === "favorite") {
        return favorites.some((f) => f.id === p.id);
      }
      return p.type === filter;
    })
    .filter((p) => p.name.includes(search))
    .map((p) => ({
      ...p,
      distance: userLocation
        ? getDistance(userLocation.lat, userLocation.lng, p.lat, p.lng)
        : null,
    }))
    .sort((a, b) => a.distance - b.distance);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);


  const appBackgroundStyle =
    appCover.kind === "image"
      ? {
          backgroundImage: `linear-gradient(rgba(244, 251, 246, 0.82), rgba(232, 245, 235, 0.9)), url(${appCover.value})`,
          backgroundColor: "#d8eaf6",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : { background: appCover.value };;
  }

  // ================================
  // ✅页面渲染
  return (
    <div style={{ display: isMobile ? "block" : "flex", minHeight: "100vh", ...appBackgroundStyle }}>
      {/* 左侧面板 */}
      <div
        style={{
          width: isMobile ? "100%" : "380px",
          padding: "20px",
          overflowY: isMobile ? "visible" : "auto",
          background: "#ffffff",
          borderRight: isMobile ? "none" : "1px solid #d9ecdf",
          boxShadow: isMobile ? "none" : "4px 0 20px rgba(63, 110, 84, 0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <h2 style={{ color: "#2e6a4a", marginBottom: 0 }}>📍海口推荐地图 · {userName}</h2>
          <button
            onClick={() => {
              setIsLoggedIn(false);
              setUserName("");
              setUserPhone("");
              setIsUserDataLoaded(false);
              setFavorites([]);
              setTargetPlaces([]);
              setFilter("all");
              setSearch("");
              setCurrentPage("home");
            }}
            style={{
              border: "1px solid #cfe3d6",
              borderRadius: "12px",
              padding: "6px 10px",
              background: "#f5fbf7",
              color: "#2f6048",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            退出
          </button>
        </div>
        <div style={{ color: "#5f7e6f", fontSize: "12px", marginBottom: "10px" }}>
          当前账号：{userPhone}
        </div>

        {/* 页面切换 */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
          <button
            onClick={() => setCurrentPage("home")}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: "14px",
              border: "none",
              cursor: "pointer",
              background: currentPage === "home" ? "#69bb8d" : "#e7f3ec",
              color: currentPage === "home" ? "white" : "#1f3d32",
              fontWeight: "bold",
            }}
          >
            🗺️ 地点列表
          </button>
          <button
            onClick={() => setCurrentPage("favorites")}
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: "14px",
              border: "none",
              cursor: "pointer",
              background: currentPage === "favorites" ? "#8ccaa4" : "#e7f3ec",
              color: currentPage === "favorites" ? "white" : "#1f3d32",
              fontWeight: "bold",
            }}
          >
            ⭐ 我的收藏（{favorites.length}）
          </button>
        </div>

        {currentPage === "home" ? (
          <>
            {isMobile && (
              <div
                style={{
                  height: "180px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  marginBottom: "12px",
                  position: "sticky",
                  top: "0",
                  zIndex: 20,
                  background: "#f4fbf6",
                  boxShadow: "0 2px 8px rgba(63, 110, 84, 0.12)",
                }}
              >
                <BaiduMap targetPlaces={targetPlaces} />
              </div>
            )}

            {/* 搜索框 */}
            <input
              placeholder="搜索地点..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 11px",
                marginBottom: "13px",
                borderRadius: "14px",
                border: "1px solid #cfe3d6",
                background: "#f8fcf9",
              }}
            />

            {/* 分类按钮 */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                marginBottom: "6px",
              }}
            >
              {[
                { key: "all", label: "全部", icon: "🌟" },
                { key: "favorite", label: "收藏", icon: "💖" },
                { key: "food", label: "美食", icon: "🍡" },
                { key: "view", label: "景点", icon: "🌈" },
                { key: "street", label: "商圈", icon: "🎀" },
                { key: "cafe", label: "咖啡", icon: "☕" },
              ].map((item) => {
                const active = filter === item.key;

                return (
                  <button
                    key={item.key}
                    onClick={() => setFilter(item.key)}
                    style={{
                      padding: "6px 11px",
                      borderRadius: "999px",
                      border: active ? "1px solid #62af85" : "1px solid #cfe3d6",
                      background: active
                        ? "linear-gradient(135deg, #77c49a 0%, #62af85 100%)"
                        : "#f1f9f4",
                      color: active ? "#fff" : "#35624c",
                      cursor: "pointer",
                      fontWeight: active ? "700" : "600",
                      boxShadow: active
                        ? "0 5px 10px rgba(98, 175, 133, 0.28)"
                        : "0 1px 2px rgba(34, 84, 61, 0.08)",
                      transition: "all 0.18s ease",
                      fontSize: "13px",
                    }}
                  >
                    <span style={{ marginRight: "3px", fontSize: "13px" }}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #d9ecdf", margin: "14px 0" }} />

            {filter === "favorite" && filteredPlaces.length === 0 && (
              <p style={{ color: "#5f7d6d", fontSize: "14px", margin: "8px 0 12px" }}>还没有收藏地点，点击下方“🤍 收藏地点”即可加入。</p>
            )}

            {/* 地点列表 */}
            {filteredPlaces.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  marginBottom: "12px",
                  background: "#f4fbf6",
                }}
              >
                <h3 style={{ color: "#2f6c4c", marginBottom: "4px" }}>{p.name}</h3>
                <p style={{ color: "#4f6f5f", marginBottom: "6px" }}>{p.desc}</p>
                <p style={{ color: "#5f7d6d", fontSize: "14px", marginBottom: "10px" }}>📏距离：{p.distance} km</p>

                {/* 收藏按钮 */}
                <button
                  onClick={() => toggleFavorite(p)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "10px",
                    border: "1px solid #b8d8c6",
                    background: favorites.find((f) => f.id === p.id)
                      ? "#df6b76"
                      : "#e7f3ec",
                    color: favorites.find((f) => f.id === p.id)
                      ? "white"
                      : "#24523d",
                    cursor: "pointer",
                    marginBottom: "8px",
                  }}
                >
                  {favorites.find((f) => f.id === p.id)
                    ? "❤️ 已收藏"
                    : "🤍 收藏地点"}
                </button>

                {/* 🚩 到这里 / 删除标记 */}
                <button
                  onClick={() => togglePlaceOnMap(p)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "10px",
                    border: "1px solid #b8d8c6",
                    background: targetPlaces.some((tp) => tp.id === p.id)
                      ? "#8ca697"
                      : "#4f9b70",
                    color: "white",
                    fontSize: "15px",
                    cursor: "pointer",
                    marginBottom: "8px",
                  }}
                >
                  {targetPlaces.some((tp) => tp.id === p.id)
                    ? "❌ 取消标记"
                    : "📍 到这里"}
                </button>

                <button
                  onClick={() => openBaiduNavigation(p)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#5f9f7c",
                    color: "white",
                    fontSize: "15px",
                    cursor: "pointer",
                  }}
                >
                  🧭 导航
                </button>
              </div>
            ))}
          </>
        ) : (
          <div
            style={{
              background: "#e9f6ee",
              padding: "12px",
              borderRadius: "15px",
            }}
          >
            <h3>⭐ 我的收藏（{favorites.length}）</h3>

            {favorites.length === 0 && (
              <p style={{ fontSize: "13px" }}>暂无收藏地点</p>
            )}

            {favorites.map((f) => {
              const isMarked = targetPlaces.some((p) => p.id === f.id);

              return (
                <div
                  key={f.id}
                  style={{
                    marginBottom: "10px",
                    padding: "10px",
                    borderRadius: "12px",
                    background: "#ffffff",
                  }}
                >
                  ❤️ {f.name}

                  {!isMarked ? (
                    <button
                      onClick={() => {
                        setTargetPlaces((prev) => [...prev, f]);
                      }}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "10px",
                        background: "#4f9b70",
                        color: "white",
                        fontSize: "15px",
                        marginTop: "8px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      🚗 去这里
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setTargetPlaces((prev) =>
                          prev.filter((p) => p.id !== f.id)
                        );
                      }}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "10px",
                        background: "#8ca697",
                        color: "white",
                        fontSize: "15px",
                        marginTop: "8px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      ❌ 删除标记
                    </button>
                  )}

                  <button
                    onClick={() => openBaiduNavigation(f)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "10px",
                      border: "none",
                      background: "#5f9f7c",
                      color: "white",
                      fontSize: "15px",
                      marginTop: "6px",
                      cursor: "pointer",
                    }}
                  >
                    🧭 导航
                  </button>

                  <button
                    onClick={() => toggleFavorite(f)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      marginTop: "6px",
                      borderRadius: "10px",
                      border: "none",
                      background: "#df6b76",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    ❤️ 取消收藏
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 右侧地图（桌面端） */}
      {!isMobile && (
        <div style={{ flex: 1 }}>
          <BaiduMap targetPlaces={targetPlaces} />
        </div>
      )}
    </div>
  );
}

export default App;
