import { useCallback, useState } from "react";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 9000,
  background: "rgba(8, 23, 16, 0.42)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "18px",
  boxSizing: "border-box",
};

const panelStyle = {
  width: "100%",
  maxWidth: "340px",
  borderRadius: "22px",
  background: "linear-gradient(180deg, #ffffff 0%, #f6fbf8 100%)",
  boxShadow: "0 24px 60px rgba(26, 62, 45, 0.28)",
  border: "1px solid #dceee4",
  padding: "18px",
  boxSizing: "border-box",
};

const titleStyle = {
  margin: 0,
  color: "#1f4330",
  fontSize: "17px",
  fontWeight: 800,
};

const messageStyle = {
  margin: "9px 0 0",
  color: "#5d7468",
  fontSize: "13px",
  lineHeight: 1.65,
};

const actionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "18px",
};

const cancelButtonStyle = {
  border: "1px solid #d9e8df",
  borderRadius: "12px",
  background: "#fff",
  color: "#60766b",
  fontSize: "14px",
  fontWeight: 700,
  padding: "9px 16px",
  cursor: "pointer",
};

const confirmButtonStyle = {
  ...cancelButtonStyle,
  border: "1px solid #ffb8b8",
  background: "#ff4d4f",
  color: "#fff",
};

export function useConfirmDialog() {
  const [request, setRequest] = useState(null);

  const confirm = useCallback((options = {}) => new Promise((resolve) => {
    setRequest({
      title: options.title || "确认操作",
      message: options.message || "确定继续吗？",
      confirmText: options.confirmText || "确定",
      cancelText: options.cancelText || "取消",
      resolve,
    });
  }), []);

  const close = useCallback((result) => {
    setRequest((current) => {
      current?.resolve(Boolean(result));
      return null;
    });
  }, []);

  const ConfirmDialog = useCallback(() => {
    if (!request) return null;
    return (
      <div style={overlayStyle} onClick={(event) => event.target === event.currentTarget && close(false)}>
        <div style={panelStyle}>
          <h3 style={titleStyle}>{request.title}</h3>
          <p style={messageStyle}>{request.message}</p>
          <div style={actionsStyle}>
            <button type="button" style={cancelButtonStyle} onClick={() => close(false)}>
              {request.cancelText}
            </button>
            <button type="button" style={confirmButtonStyle} onClick={() => close(true)}>
              {request.confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  }, [close, request]);

  return { confirm, ConfirmDialog };
}
