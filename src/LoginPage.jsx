import { useEffect, useMemo, useState } from "react";

const PHONE_REGEX = /^1\d{10}$/;
const SMS_API_BASE = import.meta.env.VITE_SMS_API_BASE || "http://localhost:3001";

function LoginPage({ onLogin, currentCover }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [tip, setTip] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  const phoneValid = useMemo(() => PHONE_REGEX.test(phone), [phone]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!phoneValid) {
      setTip("请输入有效的手机号（11位，以1开头）");
      return;
    }

    setLoading(true);
    setTip("正在发送验证码...");

    try {
      const response = await fetch(`${SMS_API_BASE}/api/sms/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setTip(result.message || "验证码发送失败");
        return;
      }

      setTip("验证码已发送，请查收短信");
      setCountdown(60);
    } catch {
      setTip("请求短信服务失败，请检查后端是否启动");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!phoneValid) {
      setTip("请输入有效手机号后再登录");
      return;
    }

    if (!codeInput) {
      setTip("请输入验证码");
      return;
    }

    setLoading(true);
    setTip("正在校验验证码...");

    try {
      const response = await fetch(`${SMS_API_BASE}/api/sms/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, code: codeInput }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setTip(result.message || "验证码校验失败");
        return;
      }

      setTip("验证成功，正在进入...");
      onLogin({
        name: name.trim() || "旅行者",
        phone,
      });
    } catch {
      setTip("请求短信服务失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #f2fbf5 0%, #e2f4e8 60%, #d6eddf 100%)",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "28px",
          padding: "20px",
          boxShadow: "0 12px 30px rgba(75, 130, 100, 0.15)",
          border: "1px solid #d9ecdf",
        }}
      >
        <div
          style={{
            borderRadius: "20px",
            height: "150px",
            marginBottom: "14px",
            backgroundImage: currentCover.kind === "image" ? `url(${currentCover.value})` : undefined,
            background: currentCover.kind === "gradient" ? currentCover.value : undefined,
            backgroundColor: "#a8c9df",
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            alignItems: "flex-end",
            padding: "12px",
          }}
        >
          <div style={{ color: "#fff", fontWeight: 700, textShadow: "0 1px 5px rgba(0,0,0,0.2)" }}>
            海口旅行 App
          </div>
        </div>

        <h2 style={{ marginBottom: "10px", color: "#2e6a4a" }}>手机号登录 👋</h2>

        <input
          placeholder="输入昵称（可选）"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            border: "1px solid #cfe3d6",
            borderRadius: "14px",
            padding: "10px 12px",
            marginBottom: "10px",
            background: "#f8fcf9",
          }}
        />

        <input
          placeholder="输入手机号"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
          style={{
            width: "100%",
            border: "1px solid #cfe3d6",
            borderRadius: "14px",
            padding: "10px 12px",
            marginBottom: "10px",
            background: "#f8fcf9",
          }}
        />

        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          <input
            placeholder="输入验证码"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
            style={{
              flex: 1,
              border: "1px solid #cfe3d6",
              borderRadius: "14px",
              padding: "10px 12px",
              background: "#f8fcf9",
            }}
          />
          <button
            onClick={handleSendCode}
            disabled={countdown > 0 || loading}
            style={{
              border: "1px solid #b7d9c4",
              borderRadius: "12px",
              padding: "0 10px",
              background: countdown > 0 ? "#eef5f1" : "#f3faf6",
              color: "#35624c",
              cursor: countdown > 0 || loading ? "not-allowed" : "pointer",
              minWidth: "100px",
            }}
          >
            {countdown > 0 ? `${countdown}s` : "获取验证码"}
          </button>
        </div>

        <p style={{ fontSize: "12px", color: "#557a67", minHeight: "18px", margin: "0 0 12px" }}>{tip}</p>

        <p style={{ fontSize: "12px", color: "#557a67", margin: "0 0 14px" }}>
          登录后会按手机号保存你的收藏、标记和筛选状态。
        </p>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            border: "none",
            borderRadius: "14px",
            padding: "11px",
            background: "linear-gradient(135deg, #76c199 0%, #5aa77b 100%)",
            color: "#fff",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.85 : 1,
          }}
        >
          {loading ? "请稍候..." : "验证并进入 App"}
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
