import {
  btnCodeStyle,
  btnMainStyle,
  inputStyle,
  linkStyle,
} from "../styles/appStyles";

function AuthPanel({
  authMode,
  loginForm,
  loginError,
  countdown,
  onModeChange,
  onFormChange,
  onSendCode,
  onSubmit,
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "#f4fbf6",
      }}
    >
      <style>{`
        @keyframes miniFloatSimple {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "white",
          padding: "40px 30px 30px 30px",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <img
              src="/doll.png"
              style={{
                position: "absolute",
                bottom: "-8px",
                right: "-55px",
                width: "50px",
                transform: "rotate(0deg)",
                zIndex: 1,
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
                animation: "miniFloatSimple 3s ease-in-out infinite",
              }}
              alt="cute-doll"
            />
            <h2
              style={{
                margin: 0,
                color: "#2e6a4a",
                fontSize: "28px",
                fontWeight: "bold",
                position: "relative",
                zIndex: 2,
              }}
            >
              海口之行
            </h2>
          </div>
        </div>

        <input
          placeholder="手机号"
          style={inputStyle}
          value={loginForm.phone}
          onChange={(e) => onFormChange({ phone: e.target.value })}
        />

        {authMode !== "login" && (
          <>
            {authMode === "register" && (
              <input
                placeholder="用户名"
                style={inputStyle}
                value={loginForm.username}
                onChange={(e) => onFormChange({ username: e.target.value })}
              />
            )}
            <div style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
              <input
                placeholder="验证码"
                style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                value={loginForm.code}
                onChange={(e) => onFormChange({ code: e.target.value })}
              />
              <button
                type="button"
                onClick={onSendCode}
                disabled={countdown > 0}
                style={btnCodeStyle}
              >
                {countdown > 0 ? `${countdown}s` : "获取"}
              </button>
            </div>
          </>
        )}

        <input
          type="password"
          placeholder="密码"
          style={inputStyle}
          value={loginForm.password}
          onChange={(e) => onFormChange({ password: e.target.value })}
        />
        {loginError && <p style={{ color: "red", fontSize: "13px" }}>{loginError}</p>}

        <button type="submit" style={btnMainStyle}>
          确定
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "20px",
            fontSize: "14px",
          }}
        >
          <span
            style={linkStyle}
            onClick={() => onModeChange(authMode === "login" ? "register" : "login")}
          >
            {authMode === "login" ? "注册账号" : "返回登录"}
          </span>
          {authMode === "login" && (
            <span style={linkStyle} onClick={() => onModeChange("reset")}>
              忘记密码？
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

export default AuthPanel;
