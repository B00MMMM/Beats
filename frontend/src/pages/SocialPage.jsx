import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, UserPlus } from 'lucide-react'
import { useAuth, useUser } from '@clerk/clerk-react'
import FriendsList from '../components/FriendsList/FriendsList'
import ChatWindow from '../components/ChatWindow/ChatWindow'
import { initSocket, getSocket, disconnectSocket } from '../lib/socket'
import axios from '../api/axios'
import styles from './SocialPage.module.css'

function SocialPage() {
  const { getToken, userId } = useAuth()
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState('all')
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [messages, setMessages] = useState([])
  const [friends, setFriends] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [socket, setSocket] = useState(null)

  // Initialize socket connection
  useEffect(() => {
    if (userId) {
      const socketInstance = initSocket(userId)
      setSocket(socketInstance)

      // Listen for online users updates
      socketInstance.on('onlineUsers', (users) => {
        setOnlineUsers(users)
      })

      // Listen for new messages
      socketInstance.on('newMessage', (message) => {
        setMessages(prev => [...prev, {
          ...message,
          isOwn: false,
          sender: message.senderInfo?.fullName || 'Unknown',
          timestamp: new Date(message.createdAt).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        }])
      })

      return () => {
        disconnectSocket()
      }
    }
  }, [userId])

  // Fetch users (friends)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = await getToken()
        if (!token) return

        const response = await axios.get('/chat/users', {
          headers: { Authorization: `Bearer ${token}` }
        })

        const usersData = response.data.map(u => ({
          id: u.clerkId,
          name: u.fullName,
          avatar: u.imageUrl,
          status: onlineUsers.includes(u.clerkId) ? 'online' : 'offline'
        }))

        setFriends(usersData)
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [getToken, onlineUsers])

  // Fetch messages when a friend is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedFriend) {
        setMessages([])
        return
      }

      try {
        const token = await getToken()
        if (!token) return

        const response = await axios.get(`/chat/messages/${selectedFriend.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        const messagesData = response.data.map(msg => ({
          id: msg._id,
          sender: msg.senderId === userId ? 'You' : selectedFriend.name,
          content: msg.content,
          isOwn: msg.senderId === userId,
          timestamp: new Date(msg.createdAt).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        }))

        setMessages(messagesData)
      } catch (error) {
        console.error('Error fetching messages:', error)
      }
    }

    fetchMessages()
  }, [selectedFriend, getToken, userId])

  const handleFriendClick = (friend) => {
    setSelectedFriend(friend)
  }

  const handleSendMessage = async (text) => {
    if (!selectedFriend || !text.trim()) return

    try {
      const token = await getToken()
      if (!token) return

      // Save message to database
      const response = await axios.post('/chat/messages', {
        recipientId: selectedFriend.id,
        content: text
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Add message to local state
      const newMessage = {
        id: response.data._id,
        sender: 'You',
        content: text,
        isOwn: true,
        timestamp: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }
      setMessages(prev => [...prev, newMessage])

      // Emit via socket for real-time delivery
      const socketInstance = getSocket()
      if (socketInstance) {
        socketInstance.emit('sendMessage', {
          recipientId: selectedFriend.id,
          content: text,
          senderId: userId,
          senderInfo: {
            fullName: user?.fullName || 'You',
            imageUrl: user?.imageUrl
          }
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleBackToList = () => {
    setSelectedFriend(null)
  }

  return (
    <div className={styles.socialPage}>
      <div className={styles.mainContent}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'friends' ? styles.active : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Friends
            <ChevronDown size={16} />
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'online' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('online')
              setSelectedFriend(null)
            }}
          >
            Online
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('all')
              setSelectedFriend(null)
            }}
          >
            All
          </button>
          <button className={styles.addFriendButton}>
            <UserPlus size={18} />
            <span>Add Friend</span>
          </button>
        </div>

        {selectedFriend ? (
          <div className={styles.chatContainer}>
            <ChatWindow
              friend={selectedFriend}
              messages={messages}
              onSendMessage={handleSendMessage}
              onBack={handleBackToList}
            />
          </div>
        ) : (
          <FriendsList
            friends={friends}
            activeTab={activeTab}
            onFriendClick={handleFriendClick}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}

export default SocialPage
