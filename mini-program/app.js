App({
  globalData: {
    user: null,
  },
  onLaunch() {
    try {
      const cachedUser = wx.getStorageSync("mp_user");
      if (cachedUser && cachedUser.phone) {
        this.globalData.user = cachedUser;
      }
    } catch (error) {
      console.error("读取小程序用户缓存失败:", error);
    }
  },
});
