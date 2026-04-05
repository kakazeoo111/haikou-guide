const { loginByWechatCode } = require("../../utils/api");

Page({
  data: {
    loading: false,
  },

  onShow() {
    const app = getApp();
    if (app.globalData.user?.phone) {
      wx.reLaunch({ url: "/pages/home/home" });
    }
  },

  async handleOneClickLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const wxLoginResult = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject,
        });
      });
      const wxCode = String(wxLoginResult?.code || "").trim();
      if (!wxCode) throw new Error("微信登录凭证获取失败，请重试");
      const result = await loginByWechatCode(wxCode);
      const user = result.data || {};
      getApp().globalData.user = user;
      wx.setStorageSync("mp_user", user);
      wx.showToast({ title: "登录成功", icon: "success" });
      wx.reLaunch({ url: "/pages/home/home" });
    } catch (error) {
      wx.showToast({ title: error.message || "登录失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },
});
