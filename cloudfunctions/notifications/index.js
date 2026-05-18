const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { action, userId, notificationId } = event

  try {
    switch (action) {
      case 'list':
        return await listNotifications(userId)
      case 'markRead':
        return await markRead(notificationId)
      case 'markAllRead':
        return await markAllRead(userId)
      default:
        return { code: -1, msg: '未知操作' }
    }
  } catch (err) {
    console.error('notifications error:', err)
    return { code: -1, msg: err.message || '操作失败' }
  }
}

// 获取通知列表
async function listNotifications(userId) {
  if (!userId) return { code: -1, msg: '用户ID不能为空' }

  const res = await db.collection('notifications')
    .where({ recipientId: userId })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()

  return {
    code: 0,
    data: res.data.map(n => ({
      notificationId: n._id,
      visitId: n.visitId,
      type: n.type,
      content: n.content,
      isRead: n.isRead,
      createdAt: n.createdAt
    })),
    unreadCount: res.data.filter(n => !n.isRead).length
  }
}

// 标记已读
async function markRead(notificationId) {
  if (!notificationId) return { code: -1, msg: '通知ID不能为空' }

  await db.collection('notifications').doc(notificationId).update({
    data: { isRead: true, updatedAt: new Date() }
  })

  return { code: 0, msg: '已标记为已读' }
}

// 标记全部已读
async function markAllRead(userId) {
  if (!userId) return { code: -1, msg: '用户ID不能为空' }

  const res = await db.collection('notifications')
    .where({ recipientId: userId, isRead: false })
    .get()

  for (const n of res.data) {
    await db.collection('notifications').doc(n._id).update({
      data: { isRead: true, updatedAt: new Date() }
    })
  }

  return { code: 0, msg: '全部标记为已读' }
}
