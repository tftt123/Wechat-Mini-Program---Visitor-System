const api = require('../../../services/api')
const { getStatusInfo, showToast, getToday } = require('../../../utils/util')
const app = getApp()

Page({
  data: {
    userInfo: null,
    visits: [],
    stats: {
      total: 0,
      today: 0,
      checkedIn: 0,
      checkedOut: 0
    },
    filterDate: getToday(),
    filterEmployeeName: ''
  },

  onShow() {
    const userInfo = app.globalData.userInfo
    if (!userInfo) {
      wx.switchTab({ url: '/pages/mine/index' })
      return
    }
    if (!app.checkPagePermission('pages/hr/index/index')) {
      wx.switchTab({ url: '/pages/mine/index' })
      return
    }
    this.setData({ userInfo })
    this.loadData()
  },

  async loadData() {
    const { userInfo, filterDate, filterEmployeeName } = this.data
    if (!userInfo) return

    wx.showLoading({ title: '加载中...' })
    try {
      const filters = {}
      if (filterDate) filters.date = filterDate
      if (filterEmployeeName) filters.employeeName = filterEmployeeName

      const res = await api.getVisits(userInfo, filters)
      wx.hideLoading()
      if (res.code === 0) {
        const all = res.data.map(v => ({ ...v, statusInfo: getStatusInfo(v.status) }))
        const today = getToday()
        this.setData({
          visits: all,
          stats: {
            total: all.length,
            today: all.filter(v => v.visitDate === today).length,
            checkedIn: all.filter(v => v.status === 'checked_in').length,
            checkedOut: all.filter(v => v.status === 'checked_out').length
          }
        })
      }
    } catch (err) {
      wx.hideLoading()
      showToast('加载失败')
    }
  },

  onDateChange(e) {
    this.setData({ filterDate: e.detail.value })
    this.loadData()
  },

  onNameInput(e) {
    this.setData({ filterEmployeeName: e.detail.value })
  },

  searchByName() {
    this.loadData()
  },

  goToDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/hr/visit-detail/index?id=${id}` })
  },

  onPullDownRefresh() {
    this.loadData().finally(() => {
      wx.stopPullDownRefresh()
    })
  }
})
