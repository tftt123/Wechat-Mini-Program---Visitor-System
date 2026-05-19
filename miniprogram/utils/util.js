// 工具函数

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 格式化日期时间
function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${formatDate(dateStr)} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// 获取今天日期
function getToday() {
  const d = new Date()
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 状态映射 — 语义化配色（V2.0 企业级规范）
const STATUS_MAP = {
  'awaiting_visitor': { text: '待访客填表', class: 'status-awaiting' },
  'pending': { text: '待确认', class: 'status-pending' },
  'confirmed': { text: '已确认', class: 'status-confirmed' },
  'checked_in': { text: '已入厂', class: 'status-checked-in' },
  'item_checked': { text: '待出厂', class: 'status-item-checked' },
  'checked_out': { text: '已出厂', class: 'status-checked-out' },
  'cancelled': { text: '已作废', class: 'status-cancelled' }
}

function getStatusInfo(status) {
  return STATUS_MAP[status] || { text: '未知', class: '' }
}

// 角色映射
const ROLE_MAP = {
  'employee': '员工',
  'hr': '人事',
  'security': '门卫',
  'it': 'IT'
}

function getRoleText(role) {
  return ROLE_MAP[role] || role
}

// 防抖
function debounce(fn, delay = 500) {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// 显示提示
function showToast(title, icon = 'none') {
  wx.showToast({ title, icon })
}

function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true })
}

function hideLoading() {
  wx.hideLoading()
}

// 确认对话框
function showConfirm(title, content) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => resolve(res.confirm)
    })
  })
}

module.exports = {
  formatDate,
  formatDateTime,
  getToday,
  getStatusInfo,
  getRoleText,
  debounce,
  showToast,
  showLoading,
  hideLoading,
  showConfirm
}
