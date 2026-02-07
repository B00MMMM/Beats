import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, UserPlus, Search, UserCheck, X, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@clerk/clerk-react'
import FriendsList from '../components/FriendsList/FriendsList'
import ChatWindow from '../components/ChatWindow/ChatWindow'
import { initSocket, disconnectSocket } from '../lib/socket'
import axios from '../api/axios'
import styles from './SocialPage.module.css'

function SocialPage() {
  const { getToken, userId } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [messages, setMessages] = useState([])
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [socket, setSocket] = useState(null)
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  const [searchLoading, setSearchLoading] = useState(false)
  const [currentUserUniqueId, setCurrentUserUniqueId] = useState(null)
  const [showUniqueId, setShowUniqueId] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState({})

  const selectedFriendRef = useRef(selectedFriend) // Ref to track selected friend in closures

  // Update ref when selected friend changes
  useEffect(() => {
    selectedFriendRef.current = selectedFriend
  }, [selectedFriend])

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
        setMessages(prev => {
          // Prevent duplicates by checking both _id and a generated temporary id
          const isDuplicate = prev.some(m => m.id === message._id || (message._id && m.id === message._id));
          if (isDuplicate) return prev

          return [...prev, {
            id: message._id,
            content: message.content,
            attachment: message.attachment,
            isOwn: false,
            sender: message.senderInfo?.fullName || 'Unknown',
            timestamp: new Date(message.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })
          }]
        })

        // Update unread count if not in chat with this user
        if (selectedFriend?.id !== message.senderId) {
          setUnreadCounts(prev => ({
            ...prev,
            [message.senderId]: (prev[message.senderId] || 0) + 1
          }))
        }
      })

      return () => {
        disconnectSocket()
      }
    }
  }, [userId])

  // Fetch users (friends) and friend requests
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken()
        if (!token) return

        const [usersResponse, requestsResponse, meResponse] = await Promise.all([
          axios.get('/chat/users', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/chat/friends/requests', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        ])

        const usersData = usersResponse.data.map(u => ({
          id: u.clerkId,
          dbId: u._id,
          name: u.fullName,
          avatar: u.imageUrl,
          uniqueId: u.uniqueId
          // status is calculated dynamically now
        }))

        const requestsData = requestsResponse.data.map(u => ({
          id: u.clerkId,
          dbId: u._id,
          name: u.fullName,
          avatar: u.imageUrl,
          uniqueId: u.uniqueId
        }))

        setFriends(usersData)
        setFriendRequests(requestsData)
        setCurrentUserUniqueId(meResponse.data.uniqueId)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [getToken]) // Removed onlineUsers from dependency array

  // Calculate friends with dynamic online status
  const friendsWithStatus = friends.map(friend => ({
    ...friend,
    status: onlineUsers.includes(friend.id) ? 'online' : 'offline'
  }))

  // Dynamic Search for Users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }

      setSearchLoading(true)
      try {
        const token = await getToken()
        if (!token) return

        const response = await axios.get(`/chat/users/search?query=${searchQuery}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        setSearchResults(response.data.map(u => ({
          id: u.clerkId,
          dbId: u._id,
          name: u.fullName,
          avatar: u.imageUrl,
          uniqueId: u.uniqueId
        })))
      } catch (error) {
        console.error('Error searching users:', error)
      } finally {
        setSearchLoading(false)
      }
    }

    const timeoutId = setTimeout(() => {
      searchUsers()
    }, 500) // Debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, getToken])


  // Clear unread count when opening chat
  useEffect(() => {
    if (selectedFriend) {
      setUnreadCounts(prev => {
        const newCounts = { ...prev }
        delete newCounts[selectedFriend.id]
        return newCounts
      })
    }
  }, [selectedFriend])

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
          attachment: msg.attachment,
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

  const handleSendMessage = async (text, attachment = null) => {
    if (!selectedFriend || (!text.trim() && !attachment)) return

    try {
      const token = await getToken()
      if (!token) return

      // Save message to database
      const payload = {
        recipientId: selectedFriend.id,
        content: text
      }
      if (attachment) {
        // Format attachment to match the expected schema
        // For songs from favorites, use deezerId; for other items use _id or id
        payload.attachment = {
          type: attachment.type || 'song',
          id: attachment.deezerId || attachment._id || attachment.id,
          title: attachment.title || attachment.name,
          artist: attachment.artist || '',
          image: attachment.imageUrl || attachment.cover || attachment.albumImage || attachment.image,
          audioUrl: attachment.audioUrl || ''
        }
      }

      const response = await axios.post('/chat/messages', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Add message to local state (use the formatted attachment from response)
      const newMessage = {
        id: response.data._id,
        sender: 'You',
        content: text,
        attachment: response.data.attachment,
        isOwn: true,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }

      setMessages(prev => [...prev, newMessage])

      // Real-time delivery is handled by the REST API via socket emit in chat.controller.js
      // No need to emit via socket here as it would cause duplicate messages
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleBackToList = () => {
    setSelectedFriend(null)
  }

  const handleSendRequest = async (user) => {
    try {
      const token = await getToken()
      if (!token) return

      await axios.post('/chat/friends/request', { recipientId: user.dbId }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      alert('Friend request sent!')
      setSearchQuery('')
      setShowAddFriend(false)
    } catch (error) {
      console.error('Error sending request:', error)
      alert(error.response?.data?.message || 'Error sending request')
    }
  }

  const handleAcceptRequest = async (requester) => {
    try {
      const token = await getToken()
      if (!token) return

      await axios.post('/chat/friends/accept', { requesterId: requester.dbId }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Update state loosely (optimistic or refresh)
      setFriendRequests(prev => prev.filter(r => r.id !== requester.id))
      setFriends(prev => [...prev, { ...requester, status: 'offline' }]) // Add new friend locally
    } catch (error) {
      console.error('Error accepting request:', error)
      alert('Error accepting request')
    }
  }


  return (
    <div className={styles.socialPage}>
      <div className={styles.mainContent}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'friends' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('friends');
              setShowAddFriend(false);
              setSelectedFriend(null);
            }}
          >
            Friends
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'requests' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('requests');
              setShowAddFriend(false);
              setSelectedFriend(null);
            }}
          >
            Requests {friendRequests.length > 0 && <span className={styles.notificationBadge}>{friendRequests.length}</span>}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'online' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('online')
              setSelectedFriend(null)
              setShowAddFriend(false)
            }}
          >
            Online
          </button>
          <button
            className={styles.addFriendButton}
            onClick={() => {
              setShowAddFriend(true);
              setActiveTab('');
              setSelectedFriend(null);
            }}
          >
            <UserPlus size={18} />
            <span>Add Friend</span>
          </button>

        </div>

        {/* Unique ID Display */}
        <div className={styles.uniqueIdContainer}>
          <span className={styles.uniqueIdLabel}>My ID: </span>
          <div className={styles.uniqueIdValue}>
            {showUniqueId ? currentUserUniqueId : '••••••'}
            <button
              onClick={() => setShowUniqueId(!showUniqueId)}
              className={styles.toggleIdBtn}
              title={showUniqueId ? "Hide ID" : "Show ID"}
            >
              {showUniqueId ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {showAddFriend ? (
          <div className={styles.addFriendSection}>
            <div className={styles.addFriendHeader}>
              <h3>Add Friend</h3>
              <button onClick={() => setShowAddFriend(false)} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.searchBox}>
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by Unique ID (e.g., #1LG24) or Name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className={styles.searchResults}>
              {searchLoading && <div className={styles.loading}>Searching...</div>}
              {!searchLoading && searchResults.length === 0 && searchQuery && (
                <div className={styles.emptyState}>No users found</div>
              )}
              {searchResults.map(user => (
                <div key={user.id} className={styles.searchResultItem}>
                  <div className={styles.userInfo}>
                    <img src={user.avatar} alt={user.name} className={styles.avatar} />
                    <div>
                      <div className={styles.userName}>{user.name}</div>
                      <div className={styles.userUniqueId}>{user.uniqueId}</div>
                    </div>
                  </div>
                  <button
                    className={styles.addBtn}
                    onClick={() => handleSendRequest(user)}
                  >
                    <UserPlus size={16} /> Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : selectedFriend ? (
          <div className={styles.chatContainer}>
            <ChatWindow
              friend={selectedFriend}
              messages={messages}
              onSendMessage={handleSendMessage}
              onBack={handleBackToList}
            />
          </div>
        ) : (
          <>
            {activeTab === 'requests' ? (
              <div className={styles.requestsList}>
                <h3>Friend Requests - {friendRequests.length}</h3>
                {friendRequests.length === 0 && <div className={styles.emptyState}>No pending requests</div>}
                {friendRequests.map(req => (
                  <div key={req.id} className={styles.requestItem}>
                    <div className={styles.userInfo}>
                      <img src={req.avatar} alt={req.name} className={styles.avatar} />
                      <div>
                        <div className={styles.userName}>{req.name}</div>
                        <div className={styles.userUniqueId}>{req.uniqueId}</div>
                      </div>
                    </div>
                    <button
                      className={styles.acceptBtn}
                      onClick={() => handleAcceptRequest(req)}
                    >
                      <UserCheck size={16} /> Accept
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <FriendsList
                friends={friendsWithStatus}
                activeTab={activeTab}
                onFriendClick={handleFriendClick}
                loading={loading}
                unreadCounts={unreadCounts}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default SocialPage
