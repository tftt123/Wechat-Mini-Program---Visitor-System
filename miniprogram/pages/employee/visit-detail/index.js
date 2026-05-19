const api = require('../../../services/api')
const { getStatusInfo, showToast, formatDateTime, showConfirm } = require('../../../utils/util')
const app = getApp()

Page({
  data: {
    visitId: '',
    detail: null,
    userInfo: null,
    canConfirm: false,
    canItemCheck: false,
    canEdit: false,
    canCancel: false,
    showEditModal: false,
    editForm: { visitDate: '', visitTime: '', purpose: '' },
    showItemModal: false,
    itemForm: { description: '', photos: [] }
  },

  async onLoad(options) {
    if (!app.checkPagePermission('pages/employee/visit-detail/index')) {
      wx.navigateBack()
      return
    }
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
          canConfirm: userInfo && d.status === 'pending' && d.visitorName && userInfo.role === 'employee',
          canItemCheck: userInfo && d.status === 'checked_in' && userInfo.role === 'employee',
          canEdit: userInfo && ['pending', 'awaiting_visitor'].includes(d.status) && userInfo.role === 'employee',
          canCancel: userInfo && ['pending', 'awaiting_visitor'].includes(d.status) && userInfo.role === 'employee'
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

  // 不携带物品 — 直接提交
  async itemCheckNo() {
    const ok = await showConfirm('物品确认', '访客未携带物品，确认吗？')
    if (!ok) return

    wx.showLoading({ title: '处理中...' })
    try {
      const res = await api.itemCheck(this.data.visitId, this.data.userInfo, {
        itemsCarried: false,
        itemDescription: '',
        itemPhotos: []
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

  // 显示物品确认弹窗（携带物品）
  showItemModal() {
    this.setData({
      showItemModal: true,
      itemForm: { description: '', photos: [] }
    })
  },

  // 关闭物品确认弹窗
  closeItemModal() {
    this.setData({ showItemModal: false })
  },

  // 物品说明输入
  onItemDescInput(e) {
    this.setData({ 'itemForm.description': e.detail.value })
  },

  // 拍照/选择图片
  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        const photos = this.data.itemForm.photos.concat(tempPath)
        this.setData({ 'itemForm.photos': photos })
      }
    })
  },

  // 删除照片
  removePhoto(e) {
    const { index } = e.currentTarget.dataset
    const photos = this.data.itemForm.photos.filter((_, i) => i !== index)
    this.setData({ 'itemForm.photos': photos })
  },

  // 上传照片到云存储
  async uploadPhotos(tempPaths) {
    const uploads = tempPaths.map((path, idx) => {
      const ext = path.match(/\.\w+$/) ? path.match(/\.\w+$/)[0] : '.jpg'
      return wx.cloud.uploadFile({
        cloudPath: `item-photos/${Date.now()}_${idx}${ext}`,
        filePath: path
      })
    })
    const results = await Promise.all(uploads)
    return results.map(r => r.fileID)
  },

  // 提交携带物品确认
  async submitItemCheck() {
    const { itemForm, visitId, userInfo } = this.data

    if (!itemForm.description.trim()) {
      showToast('请填写物品说明')
      return
    }
    if (itemForm.photos.length === 0) {
      showToast('请至少拍摄一张照片')
      return
    }

    wx.showLoading({ title: '上传中...' })
    try {
      const fileIDs = await this.uploadPhotos(itemForm.photos)

      const res = await api.itemCheck(visitId, userInfo, {
        itemsCarried: true,
        itemDescription: itemForm.description.trim(),
        itemPhotos: fileIDs
      })
      wx.hideLoading()
      if (res.code === 0) {
        showToast('确认成功')
        this.setData({ showItemModal: false })
        await this.loadDetail()
      } else {
        showToast(res.msg)
      }
    } catch (err) {
      wx.hideLoading()
      showToast('上传失败')
    }
  },

  // 显示编辑弹窗
  showEdit() {
    const d = this.data.detail
    this.setData({
      showEditModal: true,
      editForm: {
        visitDate: d.visitDate || '',
        visitTime: d.visitTime || '',
        purpose: d.purpose || ''
      }
    })
  },

  // 关闭编辑弹窗
  closeEdit() {
    this.setData({ showEditModal: false })
  },

  // 编辑输入
  onEditInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [`editForm.${field}`]: e.detail.value })
  },

  // 提交修改
  async doUpdate() {
    const { visitId, userInfo, editForm } = this.data
    if (!editForm.visitDate) {
      showToast('请选择来访日期')
      return
    }
    if (!editForm.visitTime) {
      showToast('请选择来访时间')
      return
    }
    if (!editForm.purpose.trim()) {
      showToast('请输入来访目的')
      return
    }

    wx.showLoading({ title: '保存中...' })
    try {
      const res = await api.updateVisit(visitId, userInfo, {
        visitDate: editForm.visitDate,
        visitTime: editForm.visitTime,
        purpose: editForm.purpose.trim()
      })
      wx.hideLoading()
      if (res.code === 0) {
        showToast('修改成功')
        this.setData({ showEditModal: false })
        await this.loadDetail()
      } else {
        showToast(res.msg)
      }
    } catch (err) {
      wx.hideLoading()
      showToast('保存失败')
    }
  },

  // 作废
  async doCancel() {
    const ok = await showConfirm('确认作废', '作废后该拜访记录将失效，访客无法再使用此邀请码。确定吗？')
    if (!ok) return

    wx.showLoading({ title: '处理中...' })
    try {
      const res = await api.cancelVisit(this.data.visitId, this.data.userInfo)
      wx.hideLoading()
      if (res.code === 0) {
        showToast('已作废')
        setTimeout(() => wx.navigateBack(), 800)
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