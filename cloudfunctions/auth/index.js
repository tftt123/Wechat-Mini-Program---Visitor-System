const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 手机号格式校验
function validatePhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

exports.main = async (event, context) => {
  const { action, phone, name, role, department } = event

  try {
    switch (action) {
      case 'register':
        return await register(phone, name, role, department)
      case 'login':
        return await login(phone)
      case 'getUserInfo':
        return await getUserInfo(event.userId)
      default:
        return { code: -1, msg: '未知操作' }
    }
  } catch (err) {
    console.error('auth error:', err)
    return { code: -1, msg: err.message || '操作失败' }
  }
}

// 注册
async function register(phone, name, role, department) {
  if (!validatePhone(phone)) {
    return { code: -1, msg: '手机号格式不正确' }
  }
  if (!name || name.trim() === '') {
    return { code: -1, msg: '姓名不能为空' }
  }
  if (!role || !['employee', 'hr', 'security', 'it'].includes(role)) {
    return { code: -1, msg: '角色类型不正确' }
  }

  // 检查是否已存在
  const existUser = await db.collection('users').where({ phone }).get()
  if (existUser.data.length > 0) {
    return { code: -1, msg: '该手机号已注册' }
  }

  const now = new Date()
  const userData = {
    phone,
    name: name.trim(),
    role,
    department: department || '',
    status: 'active',
    createdAt: now,
    updatedAt: now
  }

  const res = await db.collection('users').add({ data: userData })
  return {
    code: 0,
    msg: '注册成功',
    data: { userId: res._id, ...userData }
  }
}

// 登录（手机号直接登录，实际项目中建议加短信验证码）
async function login(phone) {
  if (!validatePhone(phone)) {
    return { code: -1, msg: '手机号格式不正确' }
  }

  const userRes = await db.collection('users').where({ phone }).get()
  if (userRes.data.length === 0) {
    return { code: -1, msg: '该手机号未注册' }
  }

  const user = userRes.data[0]
  if (user.status !== 'active') {
    return { code: -1, msg: '账号已被禁用' }
  }

  // 更新登录时间
  await db.collection('users').doc(user._id).update({
    data: { lastLoginAt: new Date() }
  })

  return {
    code: 0,
    msg: '登录成功',
    data: {
      userId: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      department: user.department
    }
  }
}

// 获取用户信息
async function getUserInfo(userId) {
  if (!userId) {
    return { code: -1, msg: '用户ID不能为空' }
  }
  const userRes = await db.collection('users').doc(userId).get()
  if (!userRes.data) {
    return { code: -1, msg: '用户不存在' }
  }
  const user = userRes.data
  return {
    code: 0,
    data: {
      userId: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      department: user.department
    }
  }
}
