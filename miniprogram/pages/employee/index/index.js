const api = require('../../../services/api')
const { getStatusInfo, showToast, getToday } = require('../../../utils/util')

function getCurrentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
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
    allList: [],
    currentTab: 'pending',
    currentMonth: getCurrentMonth(),
    allRawData: []
  },

  onShow() {
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      wx.switchTab({ url: '/pages/mine/index' })
      return
    }
    if (!app.checkPagePermission('pages/employee/index/index')) {
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
      const res = await api.getVisits(userInfo)
      wx.hideLoading()
      if (res.code === 0) {
        const all = res.data
        const today = getToday()
        const { currentMonth } = this.data
        const pending = all.filter(v => v.status === 'pending' || v.status === 'awaiting_visitor')
        const todayList = all.filter(v => v.visitDate === today && !['checked_out', 'cancelled'].includes(v.status))
        const monthList = all.filter(v => v.status !== 'cancelled' && v.visitDate && v.visitDate.startsWith(currentMonth))

        this.setData({
          stats: {
            pending: pending.length,
            today: todayList.length,
            total: all.length
          },
          pendingList: pending.map(v => ({ ...v, statusInfo: getStatusInfo(v.status) })),
          todayList: todayList.map(v => ({ ...v, statusInfo: getStatusInfo(v.status) })),
          allList: monthList.map(v => ({ ...v, statusInfo: getStatusInfo(v.status) })),
          allRawData: all
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

  onMonthChange(e) {
    const month = e.detail.value
    const { allRawData } = this.data
    const monthList = allRawData.filter(v => v.status !== 'cancelled' && v.visitDate && v.visitDate.startsWith(month))
    this.setData({
      currentMonth: month,
      allList: monthList.map(v => ({ ...v, statusInfo: getStatusInfo(v.status) }))
    })
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