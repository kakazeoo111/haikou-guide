const DEFAULT_TOKEN_EXPIRE_SECONDS = 7200;
const TOKEN_REFRESH_GAP_SECONDS = 60;

const wxTokenCache = {
  accessToken: "",
  expiresAt: 0,
};

function readMiniEnv() {
  const appid = String(process.env.WECHAT_MINI_APPID || "").trim();
  const secret = String(process.env.WECHAT_MINI_APPSECRET || "").trim();
  if (!appid || !secret) {
    throw new Error("缺少微信小程序环境变量：WECHAT_MINI_APPID 或 WECHAT_MINI_APPSECRET");
  }
  return { appid, secret };
}

function buildTokenUrl({ appid, secret }) {
  const query = new URLSearchParams({
    grant_type: "client_credential",
    appid,
    secret,
  });
  return `https://api.weixin.qq.com/cgi-bin/token?${query.toString()}`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`微信接口请求失败: ${response.status}`);
  }
  return response.json();
}

export async function getMiniAccessToken() {
  const now = Date.now();
  if (wxTokenCache.accessToken && now < wxTokenCache.expiresAt - TOKEN_REFRESH_GAP_SECONDS * 1000) {
    return wxTokenCache.accessToken;
  }
  const env = readMiniEnv();
  const data = await requestJson(buildTokenUrl(env));
  const accessToken = String(data?.access_token || "").trim();
  if (!accessToken) {
    const message = String(data?.errmsg || "获取微信 access_token 失败");
    const error = new Error(message);
    error.code = Number(data?.errcode || 0);
    throw error;
  }
  const expiresIn = Number(data?.expires_in || DEFAULT_TOKEN_EXPIRE_SECONDS);
  wxTokenCache.accessToken = accessToken;
  wxTokenCache.expiresAt = now + Math.max(expiresIn - TOKEN_REFRESH_GAP_SECONDS, 60) * 1000;
  return accessToken;
}

export async function fetchPhoneByWxCode(wxCode) {
  const normalizedCode = String(wxCode || "").trim();
  if (!normalizedCode) {
    throw new Error("微信手机号登录 code 不能为空");
  }
  const accessToken = await getMiniAccessToken();
  const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(accessToken)}`;
  const data = await requestJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code: normalizedCode }),
  });
  const errCode = Number(data?.errcode || 0);
  if (errCode !== 0) {
    const message = String(data?.errmsg || "微信手机号获取失败");
    const error = new Error(message);
    error.code = errCode;
    throw error;
  }
  const phone = String(data?.phone_info?.phoneNumber || "").trim();
  if (!phone) {
    throw new Error("未获取到有效手机号");
  }
  return phone;
}
