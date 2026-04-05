const {
  fetchSignStatus,
  checkin,
  fetchPrizes,
  spinLottery,
  fetchLotteryLogs,
} = require("../../utils/api");

function normalizePrizeName(name) {
  return String(name || "").trim() || "Unknown Prize";
}

Page({
  data: {
    user: null,
    signedToday: false,
    totalSignedDays: 0,
    continuousDays: 0,
    drawChances: 0,
    prizes: [],
    logs: [],
    spinning: false,
    wheelDeg: 0,
    currentRotation: 0,
    latestPrizeName: "",
  },

  onShow() {
    const user = wx.getStorageSync("mp_user");
    if (!user?.phone) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    this.setData({ user });
    this.loadPageData(user.phone);
  },

  async loadPageData(phone) {
    try {
      const [statusResult, prizesResult, logsResult] = await Promise.all([
        fetchSignStatus(phone),
        fetchPrizes(),
        fetchLotteryLogs(phone),
      ]);
      this.setData({
        signedToday: Boolean(statusResult.data?.signedToday),
        totalSignedDays: Number(statusResult.data?.totalSignedDays || 0),
        continuousDays: Number(statusResult.data?.continuousDays || 0),
        drawChances: Number(statusResult.data?.drawChances || 0),
        prizes: prizesResult.data || [],
        logs: logsResult.data || [],
      });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  async handleCheckin() {
    const phone = this.data.user?.phone;
    if (!phone) return;
    if (this.data.signedToday) {
      wx.showToast({ title: "Checked in today", icon: "none" });
      return;
    }
    try {
      const result = await checkin(phone);
      this.setData({
        signedToday: Boolean(result.data?.signedToday),
        totalSignedDays: Number(result.data?.totalSignedDays || 0),
        continuousDays: Number(result.data?.continuousDays || 0),
        drawChances: Number(result.data?.drawChances || 0),
      });
      wx.showToast({ title: "Check-in success +1", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  async handleSpin() {
    if (this.data.spinning) return;
    if (this.data.drawChances <= 0) {
      wx.showToast({ title: "Check in first", icon: "none" });
      return;
    }
    const phone = this.data.user?.phone;
    if (!phone) return;

    this.setData({ spinning: true });
    try {
      const result = await spinLottery(phone);
      const prize = result.data?.prize || {};
      const prizeKey = String(prize.key || "");
      const prizes = this.data.prizes || [];
      const segment = prizes.length > 0 ? 360 / prizes.length : 360;
      const index = Math.max(0, prizes.findIndex((item) => item.key === prizeKey));
      const centerAngle = index * segment + segment / 2;
      const targetAngle = 360 - centerAngle;
      const finalDeg = this.data.currentRotation + 2160 + targetAngle;

      this.setData({
        wheelDeg: finalDeg,
        currentRotation: finalDeg,
        latestPrizeName: normalizePrizeName(prize.name),
      });

      setTimeout(() => {
        wx.showModal({
          title: "Draw Result",
          content: `You won: ${normalizePrizeName(prize.name)}`,
          showCancel: false,
        });
        this.setData({
          spinning: false,
          drawChances: Number(result.data?.drawChances || 0),
        });
        this.refreshLogs();
      }, 3400);
    } catch (error) {
      this.setData({ spinning: false });
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  async refreshLogs() {
    const phone = this.data.user?.phone;
    if (!phone) return;
    try {
      const logsResult = await fetchLotteryLogs(phone);
      this.setData({ logs: logsResult.data || [] });
    } catch (error) {
      console.error("Refresh lottery logs failed:", error.message);
    }
  },

  handleLogout() {
    wx.removeStorageSync("mp_user");
    getApp().globalData.user = null;
    wx.reLaunch({ url: "/pages/login/login" });
  },
});
