const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, visitId, userInfo, itemCheckData, filters } = event

  try {
    switch (action) {
      case 'list':
        return await listVisits(userInfo, filters)
      case 'detail':
        return await getDetail(visitId)
      case 'confirm':
        return await confirmVisit(visitId, userInfo)
      case 'checkIn':
        return await checkIn(visitId, userInfo)
      case 'itemCheck':
        return await itemCheck(visitId, userInfo, itemCheckData)
      case 'checkOut':
        return await checkOut(visitId, userInfo)
      default:
        return { code: -1, msg: '未知操作' }
    }
  } catch (err) {
    console.error('visits error:', err)
    return { code: -1, msg: err.message || '操作失败' }
  }
}

// 获取拜访列表
async function listVisits(userInfo, filters = {}) {
  if (!userInfo) {
    return { code: -1, msg: '用户信息缺失' }
  }

  let query = {}
  const today = new Date().toISOString().split('T')[0]

  // 根据角色过滤
  if (userInfo.role === 'employee') {
    query.employeeId = userInfo.userId
  } else if (userInfo.role === 'security') {
    // 门卫看今日的
    query.visitDate = today
    query.status = _.in(['confirmed', 'checked_in', 'item_checked', 'checked_out'])
  }
  // HR 看全部

  // 状态过滤
  if (filters.status) {
    query.status = filters.status
  }
  if (filters.date) {
    query.visitDate = filters.date
  }
  if (filters.employeeName) {
    query.employeeName = db.RegExp({ regexp: filters.employeeName, options: 'i' })
  }

  const res = await db.collection('visits')
    .where(query)
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get()

  return {
    code: 0,
    data: res.data.map(v => ({
      visitId: v._id,
      inviteCode: v.inviteCode,
      visitorName: v.visitorName,
      visitorPhone: v.visitorPhone,
      visitorCompany: v.visitorCompany,
      visitDate: v.visitDate,
      visitTime: v.visitTime,
      purpose: v.purpose,
      employeeName: v.employeeName,
      department: v.department,
      status: v.status,
      checkedInAt: v.checkedInAt,
      checkedOutAt: v.checkedOutAt,
      itemsCarried: v.itemsCarried,
      itemDescription: v.itemDescription,
      createdAt: v.createdAt
    }))
  }
}

// 获取详情
async function getDetail(visitId) {
  if (!visitId) return { code: -1, msg: '拜访ID不能为空' }

  const res = await db.collection('visits').doc(visitId).get()
  if (!res.data) {
    return { code: -1, msg: '拜访记录不存在' }
  }

  const v = res.data
  // 查询日志
  const logsRes = await db.collection('visit_logs')
    .where({ visitId })
    .orderBy('createdAt', 'asc')
    .get()

  return {
    code: 0,
    data: {
      visitId: v._id,
      inviteCode: v.inviteCode,
      visitorName: v.visitorName,
      visitorPhone: v.visitorPhone,
      visitorCompany: v.visitorCompany,
      visitDate: v.visitDate,
      visitTime: v.visitTime,
      purpose: v.purpose,
      employeeId: v.employeeId,
      employeeName: v.employeeName,
      department: v.department,
      status: v.status,
      itemsCarried: v.itemsCarried,
      itemDescription: v.itemDescription,
      checkedInAt: v.checkedInAt,
      checkedOutAt: v.checkedOutAt,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      logs: logsRes.data
    }
  }
}

// 被访人确认
async function confirmVisit(visitId, userInfo) {
  if (!visitId) return { code: -1, msg: '拜访ID不能为空' }

  const res = await db.collection('visits').doc(visitId).get()
  if (!res.data) return { code: -1, msg: '拜访记录不存在' }

  const visit = res.data
  if (visit.status !== 'pending') {
    return { code: -1, msg: '该拜访记录状态不正确' }
  }

  const now = new Date()
  await db.collection('visits').doc(visitId).update({
    data: { status: 'confirmed', updatedAt: now }
  })

  await db.collection('visit_logs').add({
    data: {
      visitId,
      action: 'confirm',
      operatorRole: 'employee',
      operatorName: userInfo.name,
      createdAt: now
    }
  })

  // 创建通知（给人事和门卫）
  await createNotifications(visitId, 'visit_confirmed', `访客 ${visit.visitorName} 已确认拜访 ${visit.employeeName}`, ['hr', 'security'])

  return { code: 0, msg: '确认成功' }
}

// 门卫确认入
async function checkIn(visitId, userInfo) {
  if (!visitId) return { code: -1, msg: '拜访ID不能为空' }

  const res = await db.collection('visits').doc(visitId).get()
  if (!res.data) return { code: -1, msg: '拜访记录不存在' }

  const visit = res.data
  if (visit.status !== 'confirmed') {
    return { code: -1, msg: '该拜访记录未确认，无法入厂' }
  }

  const now = new Date()
  await db.collection('visits').doc(visitId).update({
    data: { status: 'checked_in', checkedInAt: now, updatedAt: now }
  })

  await db.collection('visit_logs').add({
    data: {
      visitId,
      action: 'check_in',
      operatorRole: 'security',
      operatorName: userInfo.name,
      createdAt: now
    }
  })

  // 通知被访人
  await createNotifications(visitId, 'visit_check_in', `访客 ${visit.visitorName} 已入厂`, ['employee'])

  return { code: 0, msg: '入厂确认成功' }
}

// 被访人物品确认
async function itemCheck(visitId, userInfo, itemCheckData) {
  if (!visitId) return { code: -1, msg: '拜访ID不能为空' }

  const res = await db.collection('visits').doc(visitId).get()
  if (!res.data) return { code: -1, msg: '拜访记录不存在' }

  const visit = res.data
  if (visit.status !== 'checked_in') {
    return { code: -1, msg: '访客未入厂，无法进行物品确认' }
  }

  const now = new Date()
  const { itemsCarried, itemDescription } = itemCheckData || {}

  await db.collection('visits').doc(visitId).update({
    data: {
      status: 'item_checked',
      itemsCarried: !!itemsCarried,
      itemDescription: itemDescription || '',
      updatedAt: now
    }
  })

  await db.collection('visit_logs').add({
    data: {
      visitId,
      action: 'item_check',
      operatorRole: 'employee',
      operatorName: userInfo.name,
      createdAt: now
    }
  })

  // 通知门卫
  const itemText = itemsCarried ? `携带物品：${itemDescription || '未说明'}` : '无携带物品'
  await createNotifications(visitId, 'visit_item_check', `访客 ${visit.visitorName} ${itemText}，等待确认出厂`, ['security'])

  return { code: 0, msg: '物品确认成功' }
}

// 门卫确认出
async function checkOut(visitId, userInfo) {
  if (!visitId) return { code: -1, msg: '拜访ID不能为空' }

  const res = await db.collection('visits').doc(visitId).get()
  if (!res.data) return { code: -1, msg: '拜访记录不存在' }

  const visit = res.data
  if (visit.status !== 'item_checked') {
    return { code: -1, msg: '访客未进行物品确认，无法出厂' }
  }

  const now = new Date()
  await db.collection('visits').doc(visitId).update({
    data: { status: 'checked_out', checkedOutAt: now, updatedAt: now }
  })

  await db.collection('visit_logs').add({
    data: {
      visitId,
      action: 'check_out',
      operatorRole: 'security',
      operatorName: userInfo.name,
      createdAt: now
    }
  })

  return { code: 0, msg: '出厂确认成功，访客可以离开' }
}

// 辅助：创建通知
async function createNotifications(visitId, type, content, targetRoles) {
  const now = new Date()
  for (const role of targetRoles) {
    // 查询该角色下所有用户
    const usersRes = await db.collection('users').where({ role, status: 'active' }).get()
    for (const user of usersRes.data) {
      await db.collection('notifications').add({
        data: {
          visitId,
          recipientId: user._id,
          recipientRole: role,
          type,
          content,
          isRead: false,
          createdAt: now
        }
      })
    }
  }
}
