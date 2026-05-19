const api = require('../../../services/api')
const { getStatusInfo, showToast, getToday } = require('../../../utils/util')
const app = getApp()

Page({
  data: {
    userInfo: null,
    currentTab: 'day',
    visits: [],
    stats: {
      total: 0,
      visits: 0,
      visitsLabel: '今日来访',
      checkedIn: 0,
      checkedOut: 0
    },
    filterEmployeeName: '',
    allRawData: []
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
    const { userInfo } = this.data
    if (!userInfo) return

    wx.showLoading({ title: '加载中...' })
    try {
      const res = await api.getVisits(userInfo)
      wx.hideLoading()
      if (res.code === 0) {
        this.setData({
          allRawData: res.data
        }, () => {
          this.filterData()
        })
      }
    } catch (err) {
      wx.hideLoading()
      showToast('加载失败')
    }
  },

  // Tab 切换
  switchTab(e) {
    const { tab } = e.currentTarget.dataset
    this.setData({ currentTab: tab }, () => {
      this.filterData()
    })
  },

  // 按日/月/年过滤数据
  filterData() {
    const { currentTab, allRawData, filterEmployeeName } = this.data
    const today = getToday()
    const currentMonth = today.substring(0, 7)
    const currentYear = today.substring(0, 4)

    // 先按时间维度过滤
    let filtered = allRawData.filter(v => {
      if (!v.visitDate) return false
      if (currentTab === 'day') {
        return v.visitDate === today
      } else if (currentTab === 'month') {
        return v.visitDate.startsWith(currentMonth)
      } else if (currentTab === 'year') {
        return v.visitDate.startsWith(currentYear)
      }
      return true
    })

    // 再按姓名过滤
    if (filterEmployeeName.trim()) {
      const keyword = filterEmployeeName.trim().toLowerCase()
      filtered = filtered.filter(v =>
        (v.employeeName && v.employeeName.toLowerCase().includes(keyword)) ||
        (v.visitorName && v.visitorName.toLowerCase().includes(keyword))
      )
    }

    // 统计标签
    const visitsLabelMap = {
      day: '今日来访',
      month: '本月来访',
      year: '本年来访'
    }

    // 计算统计
    const stats = {
      total: filtered.length,
      visits: filtered.filter(v => {
        if (currentTab === 'day') return v.visitDate === today
        if (currentTab === 'month') return v.visitDate && v.visitDate.startsWith(currentMonth)
        if (currentTab === 'year') return v.visitDate && v.visitDate.startsWith(currentYear)
        return false
      }).length,
      visitsLabel: visitsLabelMap[currentTab],
      checkedIn: filtered.filter(v => v.status === 'checked_in').length,
      checkedOut: filtered.filter(v => v.status === 'checked_out').length
    }

    this.setData({
      visits: filtered.map(v => ({ ...v, statusInfo: getStatusInfo(v.status) })),
      stats
    })
  },

  onNameInput(e) {
    this.setData({ filterEmployeeName: e.detail.value })
  },

  searchByName() {
    this.filterData()
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
