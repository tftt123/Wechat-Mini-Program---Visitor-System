const api = require('../../../services/api')
const { getStatusInfo, showToast, formatDateTime, showConfirm } = require('../../../utils/util')
const app = getApp()

Page({
  data: {
    visitId: '',
    detail: null,
    userInfo: null,
    canCheckIn: false,
    canCheckOut: false,
    badgeTypes: ['类型1', '类型2', '类型3'],
    escortForm: { escortName: '', badgeType: '' },
    showCheckOutModal: false,
    badgeReturned: null
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
          canCheckIn: userInfo && d.status === 'confirmed' && userInfo.role === 'security' &&
                      !!d.escortName && !!d.badgeType,
          canCheckOut: userInfo && d.status === 'item_checked' && userInfo.role === 'security',
          escortForm: {
            escortName: d.escortName || '',
            badgeType: d.badgeType || ''
          }
        })
      }
    } catch (err) {
      wx.hideLoading()
      showToast('加载失败')
    }
  },

  // 确认入
  async checkIn() {
    const { escortForm } = this.data
    if (!escortForm.escortName.trim()) {
      showToast('请输入带领人姓名')
      return
    }
    if (!escortForm.badgeType) {
      showToast('请选择工牌类型')
      return
    }

    const ok = await showConfirm('确认入厂', '核实访客身份无误，确认允许入厂？')
    if (!ok) return

    const { visitId, userInfo } = this.data
    wx.showLoading({ title: '处理中...' })
    try {
      await api.updateEscort(visitId, userInfo, {
        escortName: escortForm.escortName,
        badgeType: escortForm.badgeType
      })

      const res = await api.checkIn(visitId, userInfo)
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

  // 打开确认出厂弹窗
  openCheckOutModal() {
    this.setData({ showCheckOutModal: true, badgeReturned: null })
  },

  // 关闭确认出厂弹窗
  closeCheckOutModal() {
    this.setData({ showCheckOutModal: false })
  },

  // 选择回收工牌
  selectBadgeReturned(e) {
    const { value } = e.currentTarget.dataset
    this.setData({ badgeReturned: value === 'true' })
  },

  // 确认出厂
  async doCheckOut() {
    const { visitId, userInfo, badgeReturned } = this.data
    if (badgeReturned === null) {
      showToast('请选择是否回收工牌')
      return
    }
    wx.showLoading({ title: '处理中...' })
    try {
      const res = await api.checkOut(visitId, userInfo, badgeReturned)
      wx.hideLoading()
      if (res.code === 0) {
        showToast('已确认出厂')
        this.setData({ showCheckOutModal: false })
        await this.loadDetail()
      } else {
        showToast(res.msg)
      }
    } catch (err) {
      wx.hideLoading()
      showToast('操作失败')
    }
  },

  // 计算确认入厂按钮状态
  computeCanCheckIn(escortForm) {
    const { detail, userInfo } = this.data
    return userInfo && detail && detail.status === 'confirmed' && userInfo.role === 'security' &&
           !!escortForm.escortName.trim() && !!escortForm.badgeType
  },

  // 带领人输入
  onEscortInput(e) {
    const { field } = e.currentTarget.dataset
    const escortForm = { ...this.data.escortForm, [field]: e.detail.value }
    this.setData({
      escortForm,
      canCheckIn: this.computeCanCheckIn(escortForm)
    })
  },

  // 工牌类型选择
  onBadgeTypeChange(e) {
    const types = this.data.badgeTypes
    const escortForm = { ...this.data.escortForm, badgeType: types[e.detail.value] }
    this.setData({
      escortForm,
      canCheckIn: this.computeCanCheckIn(escortForm)
    })
  },

  onPullDownRefresh() {
    this.loadDetail().finally(() => {
      wx.stopPullDownRefresh()
    })
  }
})