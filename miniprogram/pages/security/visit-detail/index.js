const api = require('../../../services/api')
const { getStatusInfo, showToast, formatDateTime, showConfirm } = require('../../../utils/util')
const app = getApp()

Page({
  data: {
    visitId: '',
    detail: null,
    userInfo: null,
    canCheckIn: false,
    canCheckOut: false
  },

  async onLoad(options) {
    if (!options.id) {
      showToast('拜访ID缺失')
      wx.navigateBack()
      return
    }
    this.setData({
      visitId: options.id,
      userInfo: app.globalData.userInfo
    })
    await this.loadDetail()
  },

  async loadDetail() {
    wx.showLoading({ title: '加载中...' })
    try {
      const res = await api.getVisitDetail(this.data.visitId)
      wx.hideLoading()
      if (res.code === 0) {
        const d = res.data
        const userInfo = this.data.userInfo
        this.setData({
          detail: {
            ...d,
            statusInfo: getStatusInfo(d.status),
            createdAtStr: formatDateTime(d.createdAt),
            checkedInAtStr: d.checkedInAt ? formatDateTime(d.checkedInAt) : '',
            checkedOutAtStr: d.checkedOutAt ? formatDateTime(d.checkedOutAt) : ''
          },
          canCheckIn: userInfo && d.status === 'confirmed' && userInfo.role === 'security',
          canCheckOut: userInfo && d.status === 'item_checked' && userInfo.role === 'security'
        })
      }
    } catch (err) {
      wx.hideLoading()
      showToast('加载失败')
    }
  },

  // 确认入
  async checkIn() {
    const ok = await showConfirm('确认入厂', '核实访客身份无误，确认允许入厂？')
    if (!ok) return

    wx.showLoading({ title: '处理中...' })
    try {
      const res = await api.checkIn(this.data.visitId, this.data.userInfo)
      wx.hideLoading()
      if (res.code === 0) {
        showToast('已确认入厂')
        await this.loadDetail()
      } else {
        showToast(res.msg)
      }
    } catch (err) {
      wx.hideLoading()
      showToast('操作失败')
    }
  },

  // 确认出
  async checkOut() {
    const ok = await showConfirm('确认出厂', '核实物品无误，确认允许出厂？')
    if (!ok) return

    wx.showLoading({ title: '处理中...' })
    try {
      const res = await api.checkOut(this.data.visitId, this.data.userInfo)
      wx.hideLoading()
      if (res.code === 0) {
        showToast('已确认出厂')
        await this.loadDetail()
      } else {
        showToast(res.msg)
      }
    } catch (err) {
      wx.hideLoading()
      showToast('操作失败')
    }
  },

  onPullDownRefresh() {
    this.loadDetail().finally(() => {
      wx.stopPullDownRefresh()
    })
  }
})