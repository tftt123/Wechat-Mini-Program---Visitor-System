const api = require('../../../services/api')
const { showToast, getToday } = require('../../../utils/util')
const app = getApp()

Page({
  data: {
    form: {
      visitDate: getToday(),
      visitTime: '',
      purpose: ''
    },
    inviteCode: '',
    showResult: false
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  async generateCode() {
    const { form } = this.data
    const userInfo = app.globalData.userInfo

    if (!form.visitDate) {
      showToast('请选择来访日期')
      return
    }
    if (!form.visitTime) {
      showToast('请选择来访时间')
      return
    }
    if (!form.purpose.trim()) {
      showToast('请输入来访目的')
      return
    }

    wx.showLoading({ title: '生成中...' })
    try {
      const res = await api.createInvite({
        employeeId: userInfo.userId,
        visitDate: form.visitDate,
        visitTime: form.visitTime,
        purpose: form.purpose.trim(),
        employeeName: userInfo.name,
        department: userInfo.department
      })
      wx.hideLoading()
      if (res.code === 0) {
        this.setData({
          inviteCode: res.data.inviteCode,
          showResult: true
        })
      } else {
        showToast(res.msg)
      }
    } catch (err) {
      wx.hideLoading()
      showToast('生成失败')
    }
  },

  // 复制邀请码
  copyCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => {
        showToast('已复制')
      }
    })
  },

  // 返回首页
  goBack() {
    wx.navigateBack()
  },

  // 再生成一个
  reset() {
    this.setData({
      inviteCode: '',
      showResult: false,
      form: {
        visitDate: getToday(),
        visitTime: '',
        purpose: ''
      }
    })
  }
})