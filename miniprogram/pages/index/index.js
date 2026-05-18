const api = require('../../services/api')
const { showToast } = require('../../utils/util')

Page({
  data: {
    inviteCode: ''
  },

  onLoad(options) {
    // 如果通过扫码进入，scene 参数可能包含信息
    if (options.scene) {
      console.log('扫码场景:', options.scene)
    }
  },

  onCodeInput(e) {
    this.setData({ inviteCode: e.detail.value })
  },

  // 提交邀请码
  async submitCode() {
    const { inviteCode } = this.data
    if (!inviteCode || inviteCode.length !== 6) {
      showToast('请输入6位数字邀请码')
      return
    }

    wx.showLoading({ title: '验证中...' })
    try {
      const res = await api.getInviteByCode(inviteCode)
      wx.hideLoading()
      if (res.code === 0) {
        // 跳转到访客填表页
        wx.navigateTo({
          url: `/pages/visitor-form/index?inviteCode=${inviteCode}`
        })
      } else {
        showToast(res.msg || '邀请码无效')
      }
    } catch (err) {
      wx.hideLoading()
      showToast('请求失败')
    }
  },

  // 扫码
  scanCode() {
    wx.scanCode({
      onlyFromCamera: true,
      success: (res) => {
        console.log('扫码结果:', res.result)
        // 扫码后依然在落地页，等待输入邀请码
        showToast('请输入邀请码完成登记')
      },
      fail: () => {
        showToast('扫码取消')
      }
    })
  }
})
