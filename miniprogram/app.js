App({
  globalData: {
    userInfo: null,
    userRole: null,
    isLoggedIn: false
  },

  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloudbase-d3gi0e9aja6b3259e', // 替换为您的云开发环境ID
        traceUser: true
      })
    }
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.userRole = userInfo.role
      this.globalData.isLoggedIn = true
    }
  },

  // 保存登录信息
  setLoginInfo(userInfo) {
    wx.setStorageSync('userInfo', userInfo)
    this.globalData.userInfo = userInfo
    this.globalData.userRole = userInfo.role
    this.globalData.isLoggedIn = true
  },

  // 退出登录
  logout() {
    wx.removeStorageSync('userInfo')
    this.globalData.userInfo = null
    this.globalData.userRole = null
    this.globalData.isLoggedIn = false
  }
})
