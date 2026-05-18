const api = require('../../../services/api')
const { getStatusInfo, showToast, formatDateTime, showConfirm } = require('../../../utils/util')
const app = getApp()

Page({
  data: {
    visitId: '',
    detail: null,
    userInfo: null,
    canConfirm: false,
    canItemCheck: false
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
          canConfirm: userInfo && d.status === 'pending' && userInfo.role === 'employee',
          canItemCheck: userInfo && d.status === 'checked_in' && userInfo.role === 'employee'
        })
      }
    } catch (err) {
      wx.hideLoading()
      showToast('加载失败')
    }
  },

  // 确认拜访
  async confirmVisit() {
    const ok = await showConfirm('确认拜访', '确认该访客的拜访申请吗？')
    if (!ok) return

    wx.showLoading({ title: '处理中...' })
    try {
      const res = await api.confirmVisit(this.data.visitId, this.data.userInfo)
      wx.hideLoading()
      if (res.code === 0) {
        showToast('已确认')
        await this.loadDetail()
      } else {
        showToast(res.msg)
      }
    } catch (err) {
      wx.hideLoading()
      showToast('操作失败')
    }
  },

  // 物品确认
  async itemCheck(e) {
    const { type } = e.currentTarget.dataset
    const itemDescription = type === 'yes' ? '' : ''

    const ok = await showConfirm(
      '物品确认',
      type === 'yes' ? '访客携带物品，请填写物品说明' : '访客未携带物品，确认吗？'
    )
    if (!ok) return

    let desc = ''
    if (type === 'yes') {
      // 实际项目中可用 wx.showModal 带输入框或用页面跳转
      desc = '携带物品'
    }

    wx.showLoading({ title: '处理中...' })
    try {
      const res = await api.itemCheck(this.data.visitId, this.data.userInfo, {
        itemsCarried: type === 'yes',
        itemDescription: desc
      })
      wx.hideLoading()
      if (res.code === 0) {
        showToast('确认成功')
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