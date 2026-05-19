const api = require('../../../services/api')
const { getStatusInfo, showToast, formatDateTime } = require('../../../utils/util')
const app = getApp()

Page({
  data: {
    visitId: '',
    detail: null
  },

  async onLoad(options) {
    if (!app.checkPagePermission('pages/hr/visit-detail/index')) {
      wx.navigateBack()
      return
    }
    if (!options.id) {
      showToast('拜访ID缺失')
      wx.navigateBack()
      return
    }
    this.setData({ visitId: options.id })
    await this.loadDetail()
  },

  async loadDetail() {
    wx.showLoading({ title: '加载中...' })
    try {
      const res = await api.getVisitDetail(this.data.visitId)
      wx.hideLoading()
      if (res.code === 0) {
        const d = res.data
        this.setData({
          detail: {
            ...d,
            statusInfo: getStatusInfo(d.status),
            createdAtStr: formatDateTime(d.createdAt),
            checkedInAtStr: d.checkedInAt ? formatDateTime(d.checkedInAt) : '',
            checkedOutAtStr: d.checkedOutAt ? formatDateTime(d.checkedOutAt) : ''
          }
        })
      }
    } catch (err) {
      wx.hideLoading()
      showToast('加载失败')
    }
  },

  onPullDownRefresh() {
    this.loadDetail().finally(() => {
      wx.stopPullDownRefresh()
    })
  }
})
