const api = require('../../services/api')
const { getRoleText, showToast } = require('../../utils/util')
const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    roleText: '',
    showLogin: false,
    showRegister: false,
    loginPhone: '',
    regForm: {
      phone: '',
      name: '',
      role: 'employee',
      department: ''
    }
  },

  onShow() {
    const userInfo = app.globalData.userInfo
    this.setData({
      isLoggedIn: !!userInfo,
      userInfo: userInfo || null,
      roleText: userInfo ? getRoleText(userInfo.role) : ''
    })
  },

  // 显示登录框
  showLoginPanel() {
    this.setData({ showLogin: true, showRegister: false })
  },

  // 显示注册框
  showRegisterPanel() {
    this.setData({ showRegister: true, showLogin: false })
  },

  // 关闭弹窗
  closePanel() {
    this.setData({ showLogin: false, showRegister: false })
  },

  onLoginPhoneInput(e) {
    this.setData({ loginPhone: e.detail.value })
  },

  onRegInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [`regForm.${field}`]: e.detail.value })
  },

  onRoleChange(e) {
    const roles = ['employee', 'hr', 'security', 'it']
    this.setData({ 'regForm.role': roles[e.detail.value] })
  },

  // 登录
  async doLogin() {
    const { loginPhone } = this.data
    if (!loginPhone || !/^1[3-9]\d{9}$/.test(loginPhone)) {
      showToast('请输入正确的手机号')
      return
    }

    wx.showLoading({ title: '登录中...' })
    try {
      const res = await api.login(loginPhone)
      wx.hideLoading()
      if (res.code === 0) {
        app.setLoginInfo(res.data)
        this.setData({
          isLoggedIn: true,
          userInfo: res.data,
          roleText: getRoleText(res.data.role),
          showLogin: false
        })
        showToast('登录成功', 'success')
      } else {
        showToast(res.msg)
      }
    } catch (err) {
      wx.hideLoading()
      showToast('登录失败')
    }
  },

  // 注册
  async doRegister() {
    const { regForm } = this.data
    if (!regForm.phone || !/^1[3-9]\d{9}$/.test(regForm.phone)) {
      showToast('请输入正确的手机号')
      return
    }
    if (!regForm.name.trim()) {
      showToast('请输入姓名')
      return
    }

    wx.showLoading({ title: '注册中...' })
    try {
      const res = await api.register(regForm)
      wx.hideLoading()
      if (res.code === 0) {
        app.setLoginInfo(res.data)
        this.setData({
          isLoggedIn: true,
          userInfo: res.data,
          roleText: getRoleText(res.data.role),
          showRegister: false
        })
        showToast('注册成功', 'success')
      } else {
        showToast(res.msg)
      }
    } catch (err) {
      wx.hideLoading()
      showToast('注册失败')
    }
  },

  goToCreateInvite() {
    wx.navigateTo({ url: '/pages/create-invite/index' })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.logout()
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            roleText: ''
          })
          showToast('已退出')
        }
      }
    })
  }
})
