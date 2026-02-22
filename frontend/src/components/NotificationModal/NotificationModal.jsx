import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, UserPlus, UserCheck, UserX, UserMinus, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useSocket } from '../../context/SocketContext'
import axios from '../../api/axios'
import styles from './NotificationModal.module.css'

function NotificationModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const { socket } = useSocket()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch notifications from database
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isOpen) return

      try {
        setLoading(true)
        const token = await getToken()
        if (!token) return

        const response = await axios.get('/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        })

        // Format notifications
        const formattedNotifications = response.data.map(n => ({
          _id: n._id,
          type: n.type,
          from: {
            id: n.from.clerkId,
            dbId: n.from._id,
            name: n.from.fullName,
            avatar: n.from.imageUrl,
            uniqueId: n.from.uniqueId
          },
          message: n.message,
          read: n.read,
          createdAt: n.createdAt
        }))

        setNotifications(formattedNotifications)

        // Mark all as read when modal opens
        if (formattedNotifications.some(n => !n.read)) {
          await axios.post('/notifications/mark-read', {}, {
            headers: { Authorization: `Bearer ${token}` }
          })
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [isOpen, getToken])

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return

    const handleNotification = (notification) => {
      setNotifications(prev => {
        // Avoid duplicates by _id or by type+user combination
        const exists = prev.some(n =>
          n._id === notification._id ||
          (n.type === notification.type && n.from?.id === notification.from?.id)
        )
        if (exists) return prev
        return [notification, ...prev]
      })
    }

    socket.on('notification', handleNotification)

    return () => {
      socket.off('notification', handleNotification)
    }
  }, [socket])

  const handleNotificationClick = (notification) => {
    onClose()
    // Navigate to appropriate tab based on notification type
    if (notification.type === 'friend-request') {
      navigate('/friends?tab=requests')
    } else if (notification.type === 'friend-accepted') {
      navigate('/friends?tab=friends')
    } else {
      navigate('/friends')
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'friend-request':
        return <UserPlus size={18} />
      case 'friend-accepted':
        return <UserCheck size={18} />
      case 'friend-declined':
        return <UserX size={18} />
      case 'friend-removed':
        return <UserMinus size={18} />
      case 'group-dismissed':
        return <Users size={18} /> // Or a trash/ban icon
      case 'group-removed':
        return <UserMinus size={18} />
      case 'group-added':
        return <Users size={18} />
      default:
        return <Users size={18} />
    }
  }

  const getIconClass = (type) => {
    switch (type) {
      case 'friend-request':
        return styles.iconRequest
      case 'friend-accepted':
        return styles.iconAccepted
      case 'friend-declined':
        return styles.iconDeclined
      case 'friend-removed':
        return styles.iconRemoved
      case 'group-dismissed':
        return styles.iconRemoved // Use red color
      case 'group-removed':
        return styles.iconRemoved // Use red color
      case 'group-added':
        return styles.iconAccepted // Use green color
      default:
        return ''
    }
  }

  const formatTime = (date) => {
    const now = new Date()
    const notifDate = new Date(date)
    const diffMs = now - notifDate
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (!isOpen) return null

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Notifications</h3>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : notifications.length === 0 ? (
            <div className={styles.empty}>
              <Users size={32} />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className={styles.list}>
              {notifications.map((notification, index) => (
                <div
                  key={notification._id || index}
                  className={styles.notificationCard}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={styles.avatar}>
                    {notification.from?.avatar ? (
                      <img src={notification.from.avatar} alt={notification.from.name} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {notification.from?.name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  <div className={styles.notificationInfo}>
                    <p className={styles.notificationMessage}>{notification.message}</p>
                    <span className={styles.notificationTime}>
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>
                  <div className={`${styles.icon} ${getIconClass(notification.type)}`}>
                    {getIcon(notification.type)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className={styles.footer}>
            <button
              className={styles.viewAllButton}
              onClick={() => {
                onClose()
                navigate('/friends')
              }}
            >
              View All in Social
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default NotificationModal
