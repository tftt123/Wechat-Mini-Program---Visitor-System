const api = require('../../../services/api')
const { getStatusInfo, showToast, getToday } = require('../../../utils/util')
const app = getApp()

Page({
  data: {
    userInfo: null,
    currentTab: 'toCheckIn',
    toCheckIn: [],
    checkedIn: [],
    toCheckOut: [],
    checkedOut: []
  },

  onShow() {
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      wx.switchTab({ url: '/pages/mine/index' })
      return
    }
    if (!app.checkPagePermission('pages/security/index/index')) {
      wx.switchTab({ url: '/pages/mine/index' })
      return
    }
    this.setData({ userInfo })
    this.loadData()
  },

  async loadData() {
    const { userInfo } = this.data
    if (!userInfo) return

    wx.showLoading({ title: '加载中...' })
    try {
      const res = await api.getVisits(userInfo, { date: getToday() })
      wx.hideLoading()
      if (res.code === 0) {
        const all = res.data.map(v => ({ ...v, statusInfo: getStatusInfo(v.status) }))
        this.setData({
          toCheckIn: all.filter(v => v.status === 'confirmed'),
          checkedIn: all.filter(v => v.status === 'checked_in'),
          toCheckOut: all.filter(v => v.status === 'item_checked'),
          checkedOut: all.filter(v => v.status === 'checked_out')
        })
      }
    } catch (err) {
      wx.hideLoading()
      showToast('加载失败')
    }
  },

  switchTab(e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab })
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/security/visit-detail/index?id=${id}` })
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh()
    })
  }
})