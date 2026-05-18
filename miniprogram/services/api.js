// API 封装
const callCloudFunction = (name, data = {}) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => {
        if (res.result && res.result.code !== undefined) {
          resolve(res.result)
        } else {
          resolve({ code: 0, data: res.result })
        }
      },
      fail: err => {
        console.error(`云函数 ${name} 调用失败:`, err)
        reject({ code: -1, msg: '网络请求失败' })
      }
    })
  })
}

module.exports = {
  // 认证
  register: (data) => callCloudFunction('auth', { action: 'register', ...data }),
  login: (phone) => callCloudFunction('auth', { action: 'login', phone }),
  getUserInfo: (userId) => callCloudFunction('auth', { action: 'getUserInfo', userId }),

  // 邀请码
  createInvite: (data) => callCloudFunction('invites', { action: 'create', ...data }),
  getInviteByCode: (inviteCode) => callCloudFunction('invites', { action: 'getByCode', inviteCode }),
  fillVisitorInfo: (inviteCode, visitorInfo) => callCloudFunction('invites', { action: 'fillVisitorInfo', inviteCode, visitorInfo }),

  // 拜访记录
  getVisits: (userInfo, filters = {}) => callCloudFunction('visits', { action: 'list', userInfo, filters }),
  getVisitDetail: (visitId) => callCloudFunction('visits', { action: 'detail', visitId }),
  confirmVisit: (visitId, userInfo) => callCloudFunction('visits', { action: 'confirm', visitId, userInfo }),
  checkIn: (visitId, userInfo) => callCloudFunction('visits', { action: 'checkIn', visitId, userInfo }),
  itemCheck: (visitId, userInfo, itemCheckData) => callCloudFunction('visits', { action: 'itemCheck', visitId, userInfo, itemCheckData }),
  checkOut: (visitId, userInfo) => callCloudFunction('visits', { action: 'checkOut', visitId, userInfo }),

  // 通知
  getNotifications: (userId) => callCloudFunction('notifications', { action: 'list', userId }),
  markRead: (notificationId) => callCloudFunction('notifications', { action: 'markRead', notificationId }),
  markAllRead: (userId) => callCloudFunction('notifications', { action: 'markAllRead', userId })
}
