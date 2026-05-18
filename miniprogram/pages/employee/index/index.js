const api = require('../../../services/api')
const { getStatusInfo, showToast, getToday } = require('../../../utils/util')
const app = getApp()

Page({
  data: {
    userInfo: null,
    stats: {
      pending: 0,
      today: 0,
      total: 0
    },
    pendingList: [],
    todayList: [],
    currentTab: 'pending'
  },

  onShow() {
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      wx.redirectTo({ url: '/pages/mine/index' })
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
      const res = await api.getVisits(userInfo)
      wx.hideLoading()
      if (res.code === 0) {
        const all = res.data
        const today = getToday()
        const pending = all.filter(v => v.status === 'pending' || v.status === 'awaiting_visitor')
        const todayList = all.filter(v => v.visitDate === today && !['checked_out', 'cancelled'].includes(v.status))

        this.setData({
          stats: {
            pending: pending.length,
            today: todayList.length,
            total: all.length
          },
          pendingList: pending.map(v => ({ ...v, statusInfo: getStatusInfo(v.status) })),
          todayList: todayList.map(v => ({ ...v, statusInfo: getStatusInfo(v.status) }))
        })
      }
    } catch (err) {
      wx.hideLoading()
      showToast('加载失败')
    }
  },

  switchTab(e) {
    const { tab } = e.currentTarget.dataset
    this.setData({ currentTab: tab })
  },

  goToInviteCode() {
    wx.navigateTo({ url: '/pages/employee/invite-code/index' })
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/employee/visit-detail/index?id=${id}` })
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh()
    })
  }
})