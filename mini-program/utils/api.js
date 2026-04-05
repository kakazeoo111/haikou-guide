const BASE_URL = "https://api.suzcore.top";

function request(path, method = "GET", data = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${path}`,
      method,
      data,
      header: {
        "Content-Type": "application/json",
      },
      success: (response) => {
        const body = response.data || {};
        if (body.ok) {
          resolve(body);
          return;
        }
        reject(new Error(body.message || "请求失败"));
      },
      fail: (error) => {
        reject(new Error(error.errMsg || "网络错误"));
      },
    });
  });
}

function loginByWechatCode(wxCode) {
  return request("/api/mp/auth/login-by-wechat", "POST", { wxCode });
}

function fetchSignStatus(phone) {
  return request(`/api/mp/sign/status?phone=${encodeURIComponent(phone)}`);
}

function checkin(phone) {
  return request("/api/mp/sign/checkin", "POST", { phone });
}

function fetchPrizes() {
  return request("/api/mp/lottery/prizes");
}

function spinLottery(phone) {
  return request("/api/mp/lottery/spin", "POST", { phone });
}

function fetchLotteryLogs(phone) {
  return request(`/api/mp/lottery/logs?phone=${encodeURIComponent(phone)}`);
}

module.exports = {
  loginByWechatCode,
  fetchSignStatus,
  checkin,
  fetchPrizes,
  spinLottery,
  fetchLotteryLogs,
};
