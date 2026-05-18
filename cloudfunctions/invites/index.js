const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 生成6位数字邀请码
function generateInviteCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

exports.main = async (event, context) => {
  const { action, inviteCode, visitorInfo, employeeId } = event

  try {
    switch (action) {
      case 'create':
        return await createInvite(employeeId, event)
      case 'getByCode':
        return await getByCode(inviteCode)
      case 'fillVisitorInfo':
        return await fillVisitorInfo(inviteCode, visitorInfo)
      default:
        return { code: -1, msg: '未知操作' }
    }
  } catch (err) {
    console.error('invites error:', err)
    return { code: -1, msg: err.message || '操作失败' }
  }
}

// 创建邀请码（员工操作）
async function createInvite(employeeId, eventData) {
  const { visitDate, visitTime, purpose, employeeName, department } = eventData

  if (!employeeId) {
    return { code: -1, msg: '员工信息缺失' }
  }

  // 查询员工信息
  const empRes = await db.collection('users').doc(employeeId).get()
  if (!empRes.data) {
    return { code: -1, msg: '员工不存在' }
  }
  const emp = empRes.data

  // 生成唯一邀请码（重试3次）
  let code, existRes
  for (let i = 0; i < 3; i++) {
    code = generateInviteCode()
    existRes = await db.collection('visits').where({ inviteCode: code }).get()
    if (existRes.data.length === 0) break
  }
  if (existRes.data.length > 0) {
    return { code: -1, msg: '邀请码生成失败，请重试' }
  }

  const now = new Date()
  const visitData = {
    inviteCode: code,
    visitorName: '',
    visitorPhone: '',
    visitorCompany: '',
    visitDate: visitDate || '',
    visitTime: visitTime || '',
    purpose: purpose || '',
    employeeId: employeeId,
    employeeName: emp.name || employeeName || '',
    department: emp.department || department || '',
    status: 'pending',
    itemsCarried: null,
    itemDescription: '',
    checkedInAt: null,
    checkedOutAt: null,
    createdAt: now,
    updatedAt: now
  }

  const res = await db.collection('visits').add({ data: visitData })

  // 记录日志
  await db.collection('visit_logs').add({
    data: {
      visitId: res._id,
      action: 'create',
      operatorRole: 'employee',
      operatorName: emp.name,
      createdAt: now
    }
  })

  return {
    code: 0,
    msg: '邀请码生成成功',
    data: { inviteCode: code, visitId: res._id }
  }
}

// 通过邀请码获取拜访信息（访客操作）
async function getByCode(inviteCode) {
  if (!inviteCode || !/^\d{6}$/.test(inviteCode)) {
    return { code: -1, msg: '邀请码格式不正确' }
  }

  const visitRes = await db.collection('visits').where({ inviteCode }).get()
  if (visitRes.data.length === 0) {
    return { code: -1, msg: '邀请码不存在' }
  }

  const visit = visitRes.data[0]

  // 检查是否已过期（超过7天）
  const createdAt = new Date(visit.createdAt)
  const now = new Date()
  const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24)
  if (diffDays > 7) {
    return { code: -1, msg: '邀请码已过期' }
  }

  return {
    code: 0,
    data: {
      visitId: visit._id,
      inviteCode: visit.inviteCode,
      visitorName: visit.visitorName,
      visitorPhone: visit.visitorPhone,
      visitorCompany: visit.visitorCompany,
      visitDate: visit.visitDate,
      visitTime: visit.visitTime,
      purpose: visit.purpose,
      employeeName: visit.employeeName,
      department: visit.department,
      status: visit.status
    }
  }
}

// 访客填写信息
async function fillVisitorInfo(inviteCode, visitorInfo) {
  if (!inviteCode || !visitorInfo) {
    return { code: -1, msg: '参数不完整' }
  }

  const { visitorName, visitorPhone, visitorCompany, visitDate, visitTime, purpose } = visitorInfo
  if (!visitorName || !visitorPhone) {
    return { code: -1, msg: '访客姓名和手机号不能为空' }
  }

  const visitRes = await db.collection('visits').where({ inviteCode }).get()
  if (visitRes.data.length === 0) {
    return { code: -1, msg: '邀请码不存在' }
  }

  const visit = visitRes.data[0]
  if (visit.status !== 'pending' || visit.visitorName !== '') {
    return { code: -1, msg: '该邀请码已被使用' }
  }

  const now = new Date()
  await db.collection('visits').doc(visit._id).update({
    data: {
      visitorName: visitorName.trim(),
      visitorPhone: visitorPhone.trim(),
      visitorCompany: (visitorCompany || '').trim(),
      visitDate: visitDate || visit.visitDate,
      visitTime: visitTime || visit.visitTime,
      purpose: (purpose || '').trim(),
      status: 'pending',
      updatedAt: now
    }
  })

  // 记录日志
  await db.collection('visit_logs').add({
    data: {
      visitId: visit._id,
      action: 'visitor_submit',
      operatorRole: 'visitor',
      operatorName: visitorName.trim(),
      createdAt: now
    }
  })

  return {
    code: 0,
    msg: '信息提交成功，等待被访人确认',
    data: { visitId: visit._id }
  }
}
