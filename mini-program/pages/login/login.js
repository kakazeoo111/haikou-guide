const { sendCode, loginByCode, loginByWxPhoneCode } = require("../../utils/api");

const PHONE_REGEX = /^1\d{10}$/;
const CODE_LENGTH = 6;

Page({
  data: {
    phone: "",
    code: "",
    loading: false,
    sendingCode: false,
    countdown: 0,
  },

  onShow() {
    const app = getApp();
    if (app.globalData.user?.phone) {
      wx.reLaunch({ url: "/pages/home/home" });
    }
  },

  onPhoneInput(event) {
    this.setData({ phone: String(event.detail.value || "").trim() });
  },

  onCodeInput(event) {
    this.setData({ code: String(event.detail.value || "").trim() });
  },

  async handleSendCode() {
    const { phone, sendingCode, countdown } = this.data;
    if (sendingCode || countdown > 0) return;
    if (!PHONE_REGEX.test(phone)) {
      wx.showToast({ title: "手机号格式错误", icon: "none" });
      return;
    }
    this.setData({ sendingCode: true });
    try {
      await sendCode(phone);
      wx.showToast({ title: "验证码已发送", icon: "success" });
      this.startCountdown();
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    } finally {
      this.setData({ sendingCode: false });
    }
  },

  startCountdown() {
    this.setData({ countdown: 60 });
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      const next = this.data.countdown - 1;
      if (next <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.setData({ countdown: 0 });
        return;
      }
      this.setData({ countdown: next });
    }, 1000);
  },

  async handleLogin() {
    const { phone, code, loading } = this.data;
    if (loading) return;
    if (!PHONE_REGEX.test(phone)) {
      wx.showToast({ title: "手机号格式错误", icon: "none" });
      return;
    }
    if (code.length !== CODE_LENGTH) {
      wx.showToast({ title: "请输入6位验证码", icon: "none" });
      return;
    }
    this.setData({ loading: true });
    try {
      const result = await loginByCode(phone, code);
      const user = result.data || {};
      getApp().globalData.user = user;
      wx.setStorageSync("mp_user", user);
      wx.showToast({ title: "登录成功", icon: "success" });
      wx.reLaunch({ url: "/pages/home/home" });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  async handleWxPhoneLogin(event) {
    if (this.data.loading) return;
    const wxCode = String(event?.detail?.code || "").trim();
    if (!wxCode) {
      wx.showToast({ title: "当前主体可能不支持一键手机号，请用验证码登录", icon: "none" });
      return;
    }
    this.setData({ loading: true });
    try {
      const result = await loginByWxPhoneCode(wxCode);
      const user = result.data || {};
      getApp().globalData.user = user;
      wx.setStorageSync("mp_user", user);
      wx.showToast({ title: "登录成功", icon: "success" });
      wx.reLaunch({ url: "/pages/home/home" });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  onUnload() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  },
});
