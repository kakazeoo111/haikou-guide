import { useState } from "react";
import { AUTH_API_BASE } from "../appConfig";

const PHONE_PATTERN = /^1\d{10}$/;
const authApiBase = AUTH_API_BASE;

export function useUserPointsCard() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const close = () => setVisible(false);

  const openByPhone = async (phone) => {
    const normalizedPhone = String(phone || "").trim();
    if (!PHONE_PATTERN.test(normalizedPhone)) return;
    setVisible(true);
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(`${authApiBase}/api/users/${normalizedPhone}/summary`);
      const result = await res.json();
      if (!result.ok) {
        alert(result.message || "用户信息获取失败");
        setVisible(false);
        return;
      }
      setData(result.data || null);
    } catch (error) {
      console.error("用户点数卡片加载失败:", error);
      alert("网络错误，用户信息加载失败");
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  return { visible, loading, data, close, openByPhone };
}
