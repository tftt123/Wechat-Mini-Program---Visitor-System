App({
  globalData: {
    userInfo: null,
    userRole: null,
    isLoggedIn: false
  },

  // 页面权限配置：key 为页面路径，value 为允许访问的角色列表
  PAGE_PERMISSIONS: {
    'pages/create-invite/index': ['employee', 'hr', 'it'],
    'pages/employee/index/index': ['employee', 'it'],
    'pages/employee/visit-detail/index': ['employee', 'it'],
    'pages/security/index/index': ['security', 'it'],
    'pages/security/visit-detail/index': ['security', 'it'],
    'pages/hr/index/index': ['hr', 'it'],
    'pages/hr/visit-detail/index': ['hr', 'it'],
    'pages/mine/index': ['employee', 'security', 'hr', 'it']
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
  },

  // 检查页面权限
  checkPagePermission(pagePath) {
    const userInfo = this.globalData.userInfo
    const allowedRoles = this.PAGE_PERMISSIONS[pagePath]
    if (!allowedRoles) return true // 未配置的页面默认允许
    if (!userInfo) return false
    return allowedRoles.includes(userInfo.role)
  }
})
