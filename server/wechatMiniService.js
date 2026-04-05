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
    throw new Error("Missing mini program env: WECHAT_MINI_APPID or WECHAT_MINI_APPSECRET");
  }
  return { appid, secret };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`WeChat API request failed: ${response.status}`);
  }
  return response.json();
}

function buildTokenUrl({ appid, secret }) {
  const query = new URLSearchParams({
    grant_type: "client_credential",
    appid,
    secret,
  });
  return `https://api.weixin.qq.com/cgi-bin/token?${query.toString()}`;
}

export async function fetchOpenIdByLoginCode(wxLoginCode) {
  const code = String(wxLoginCode || "").trim();
  if (!code) throw new Error("wx.login code is required");
  const { appid, secret } = readMiniEnv();
  const query = new URLSearchParams({
    appid,
    secret,
    js_code: code,
    grant_type: "authorization_code",
  });
  const url = `https://api.weixin.qq.com/sns/jscode2session?${query.toString()}`;
  const data = await requestJson(url);
  const errCode = Number(data?.errcode || 0);
  if (errCode !== 0) {
    const error = new Error(String(data?.errmsg || "jscode2session failed"));
    error.code = errCode;
    throw error;
  }
  const openId = String(data?.openid || "").trim();
  if (!openId) throw new Error("openid missing from jscode2session");
  return openId;
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
    const error = new Error(String(data?.errmsg || "fetch access_token failed"));
    error.code = Number(data?.errcode || 0);
    throw error;
  }
  const expiresIn = Number(data?.expires_in || DEFAULT_TOKEN_EXPIRE_SECONDS);
  wxTokenCache.accessToken = accessToken;
  wxTokenCache.expiresAt = now + Math.max(expiresIn - TOKEN_REFRESH_GAP_SECONDS, 60) * 1000;
  return accessToken;
}
