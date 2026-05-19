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
    },
    errors: {
      visitorName: '',
      visitorPhone: ''
    },
    isFormValid: false
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
        }, () => {
          this.checkFormValidity()
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
    }, () => {
      this.checkFormValidity()
    })
  },

  onBadgeTypeChange(e) {
    const types = this.data.badgeTypes
    this.setData({ 'form.badgeType': types[e.detail.value] }, () => {
      this.checkFormValidity()
    })
  },

  // 字段失焦验证
  validateField(e) {
    const { field } = e.currentTarget.dataset
    const { form } = this.data
    let error = ''

    if (field === 'visitorName' && !form.visitorName.trim()) {
      error = '请输入姓名'
    }
    if (field === 'visitorPhone') {
      if (!form.visitorPhone.trim()) {
        error = '请输入手机号'
      } else if (!/^1[3-9]\d{9}$/.test(form.visitorPhone)) {
        error = '请输入正确的手机号'
      }
    }

    this.setData({
      [`errors.${field}`]: error
    })
  },

  // 检查表单整体有效性
  checkFormValidity() {
    const { form } = this.data
    const isValid = !!form.visitorName.trim() &&
                    !!form.visitorPhone.trim() &&
                    /^1[3-9]\d{9}$/.test(form.visitorPhone) &&
                    !!form.visitDate &&
                    !!form.visitTime &&
                    !!form.purpose.trim()
    this.setData({ isFormValid: isValid })
  },

  // 提交表单
  async submitForm() {
    const { inviteCode, form } = this.data

    // 前置验证
    if (!form.visitorName.trim()) {
      this.setData({ 'errors.visitorName': '请输入姓名' })
      return
    }
    if (!form.visitorPhone.trim() || !/^1[3-9]\d{9}$/.test(form.visitorPhone)) {
      this.setData({ 'errors.visitorPhone': '请输入正确的手机号' })
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
        // 使用绿色 toast 提示成功，2s 后跳转
        wx.showToast({
          title: '提交成功',
          icon: 'success',
          duration: 2000
        })
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/index/index' })
        }, 2000)
      } else {
        showToast(res.msg)
      }
    } catch (err) {
      wx.hideLoading()
      showToast('提交失败')
    }
  }
})
