const api = require('../../services/api')
const { showToast, getToday } = require('../../utils/util')

Page({
  data: {
    inviteCode: '',
    visitInfo: null,
    badgeTypes: ['类型1', '类型2', '类型3'],
    form: {
      visitorName: '',
      visitorPhone: '',
      visitorCompany: '',
      visitDate: getToday(),
      visitTime: '',
      purpose: '',
      escortName: '',
      badgeType: ''
    }
  },

  async onLoad(options) {
    if (!options.inviteCode) {
      showToast('邀请码缺失')
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }

    this.setData({ inviteCode: options.inviteCode })
    await this.loadVisitInfo(options.inviteCode)
  },

  // 加载拜访信息
  async loadVisitInfo(code) {
    wx.showLoading({ title: '加载中...' })
    try {
      const res = await api.getInviteByCode(code)
      wx.hideLoading()
      if (res.code === 0) {
        this.setData({
          visitInfo: res.data,
          form: {
            visitorName: res.data.visitorName || '',
            visitorPhone: res.data.visitorPhone || '',
            visitorCompany: res.data.visitorCompany || '',
            visitDate: res.data.visitDate || getToday(),
            visitTime: res.data.visitTime || '',
            purpose: res.data.purpose || '',
            escortName: res.data.escortName || '',
            badgeType: res.data.badgeType || ''
          }
        })
      } else {
        showToast(res.msg)
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/index/index' })
        }, 1500)
      }
    } catch (err) {
      wx.hideLoading()
      showToast('加载失败')
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({
      [`form.${field}`]: e.detail.value
    })
  },

  onBadgeTypeChange(e) {
    const types = this.data.badgeTypes
    this.setData({ 'form.badgeType': types[e.detail.value] })
  },

  // 提交表单
  async submitForm() {
    const { inviteCode, form } = this.data

    if (!form.visitorName.trim()) {
      showToast('请输入姓名')
      return
    }
    if (!form.visitorPhone.trim() || !/^1[3-9]\d{9}$/.test(form.visitorPhone)) {
      showToast('请输入正确的手机号')
      return
    }
    if (!form.visitDate) {
      showToast('请选择拜访日期')
      return
    }
    if (!form.visitTime) {
      showToast('请选择拜访时间')
      return
    }
    if (!form.purpose.trim()) {
      showToast('请输入来访目的')
      return
    }

    wx.showLoading({ title: '提交中...' })
    try {
      const res = await api.fillVisitorInfo(inviteCode, form)
      wx.hideLoading()
      if (res.code === 0) {
        wx.showModal({
          title: '提交成功',
          content: '您的拜访信息已提交，等待被访人确认',
          showCancel: false,
          success: () => {
            wx.redirectTo({ url: '/pages/index/index' })
          }
        })
      } else {
        showToast(res.msg)
      }
    } catch (err) {
      wx.hideLoading()
      showToast('提交失败')
    }
  }
})
