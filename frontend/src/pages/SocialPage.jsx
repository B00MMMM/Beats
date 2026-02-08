import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, UserPlus, Search, UserCheck, X, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@clerk/clerk-react'
import { useLocation } from 'react-router-dom'
import FriendsList from '../components/FriendsList/FriendsList'
import ChatWindow from '../components/ChatWindow/ChatWindow'
import ConfirmPopup from '../components/ConfirmPopup/ConfirmPopup'
import { useSocket } from '../context/SocketContext'
import axios from '../api/axios'
import styles from './SocialPage.module.css'

function SocialPage() {
  const { getToken, userId } = useAuth()
  const { socket, onlineUsers } = useSocket()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(() => {
    // Check for tab param in URL or location state
    const params = new URLSearchParams(location.search)
    return params.get('tab') || location.state?.tab || 'all'
  })
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [messages, setMessages] = useState([])
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  const [searchLoading, setSearchLoading] = useState(false)
  const [currentUserUniqueId, setCurrentUserUniqueId] = useState(null)
  const [showUniqueId, setShowUniqueId] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState({})
  
  // Popup state
  const [popup, setPopup] = useState({ isOpen: false, title: '', message: '', type: 'default', onConfirm: null })
  const [unfriendTarget, setUnfriendTarget] = useState(null)

  const selectedFriendRef = useRef(selectedFriend) // Ref to track selected friend in closures

  // Update ref when selected friend changes
  useEffect(() => {
    selectedFriendRef.current = selectedFriend
  }, [selectedFriend])

  // Update active tab when URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tabParam = params.get('tab')
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [location.search])

  // Listen for new messages from socket
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (message) => {
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
      // Use ref to get current selectedFriend value (avoid stale closure)
      if (selectedFriendRef.current?.id !== message.senderId) {
        setUnreadCounts(prev => ({
          ...prev,
          [message.senderId]: (prev[message.senderId] || 0) + 1
        }))
      }
    }

    const handleNotification = (notification) => {
      if (notification.type === 'friend-request') {
        // Add new friend request dynamically
        setFriendRequests(prev => {
          // Avoid duplicates
          if (prev.some(r => r.id === notification.from.id)) return prev
          return [...prev, {
            id: notification.from.id,
            dbId: notification.from.dbId,
            name: notification.from.name,
            avatar: notification.from.avatar,
            uniqueId: notification.from.uniqueId || ''
          }]
        })
        // Also update search results if the sender is there
        setSearchResults(prev => prev.map(r =>
          r.id === notification.from.id ? { ...r, requestReceived: true } : r
        ))
      } else if (notification.type === 'friend-accepted') {
        // Add new friend to friends list
        setFriends(prev => {
          if (prev.some(f => f.id === notification.from.id)) return prev
          return [...prev, {
            id: notification.from.id,
            dbId: notification.from.dbId,
            name: notification.from.name,
            avatar: notification.from.avatar,
            uniqueId: notification.from.uniqueId || '',
            status: 'offline' // Will be updated by getOnlineUsers
          }]
        })
        // Remove from search results since they're now friends
        setSearchResults(prev => prev.filter(r => r.id !== notification.from.id))
        // Refresh online users to get accurate status
        socket?.emit('getOnlineUsers')
      } else if (notification.type === 'friend-declined') {
        // Update search results to show Add button again instead of Requested
        setSearchResults(prev => prev.map(r =>
          r.id === notification.from.id ? { ...r, requestSent: false } : r
        ))
      } else if (notification.type === 'friend-removed') {
        // Remove from friends list
        setFriends(prev => prev.filter(f => f.id !== notification.from.id))
        // If currently chatting with this person, go back to list
        if (selectedFriendRef.current?.id === notification.from.id) {
          setSelectedFriend(null)
          setMessages([])
        }
      }
    }

    socket.on('newMessage', handleNewMessage)
    socket.on('notification', handleNotification)

    return () => {
      socket.off('newMessage', handleNewMessage)
      socket.off('notification', handleNotification)
    }
  }, [socket])

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
          uniqueId: u.uniqueId,
          requestSent: u.requestSent,
          requestReceived: u.requestReceived
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

      setPopup({
        isOpen: true,
        title: 'Request Sent',
        message: `Friend request sent to ${user.name}!`,
        type: 'success',
        onConfirm: null
      })
      setSearchQuery('')
      setShowAddFriend(false)
    } catch (error) {
      console.error('Error sending request:', error)
      setPopup({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Error sending request',
        type: 'danger',
        onConfirm: null
      })
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
      setSearchResults(prev => prev.filter(r => r.id !== requester.id))
      setFriends(prev => [...prev, { ...requester, status: 'offline' }]) // Add new friend locally
      
      // Refresh online users to check if the new friend is online
      socket?.emit('getOnlineUsers')
    } catch (error) {
      console.error('Error accepting request:', error)
      setPopup({
        isOpen: true,
        title: 'Error',
        message: 'Error accepting request',
        type: 'danger',
        onConfirm: null
      })
    }
  }

  const handleDeclineRequest = async (requester) => {
    try {
      const token = await getToken()
      if (!token) return

      await axios.post('/chat/friends/decline', { requesterId: requester.dbId }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Remove from friend requests and search results
      setFriendRequests(prev => prev.filter(r => r.id !== requester.id))
      setSearchResults(prev => prev.map(r => 
        r.id === requester.id ? { ...r, requestReceived: false } : r
      ))
    } catch (error) {
      console.error('Error declining request:', error)
      setPopup({
        isOpen: true,
        title: 'Error',
        message: 'Error declining request',
        type: 'danger',
        onConfirm: null
      })
    }
  }

  // Unfriend handlers
  const handleUnfriendClick = (friend) => {
    setUnfriendTarget(friend)
    setPopup({
      isOpen: true,
      title: 'Remove Friend',
      message: `Are you sure you want to remove ${friend.name} from your friends list?`,
      type: 'danger',
      onConfirm: () => confirmUnfriend(friend)
    })
  }

  const confirmUnfriend = async (friend) => {
    try {
      const token = await getToken()
      if (!token) return

      await axios.post('/chat/friends/remove', { friendId: friend.id }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Remove from local state
      setFriends(prev => prev.filter(f => f.id !== friend.id))
      
      // If currently chatting with this friend, close the chat
      if (selectedFriend?.id === friend.id) {
        setSelectedFriend(null)
        setMessages([])
      }

      setPopup({
        isOpen: true,
        title: 'Friend Removed',
        message: `${friend.name} has been removed from your friends list.`,
        type: 'success',
        onConfirm: null
      })
    } catch (error) {
      console.error('Error removing friend:', error)
      setPopup({
        isOpen: true,
        title: 'Error',
        message: 'Failed to remove friend. Please try again.',
        type: 'danger',
        onConfirm: null
      })
    }
    setUnfriendTarget(null)
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
                  {user.requestReceived ? (
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.acceptBtn}
                        onClick={() => handleAcceptRequest(user)}
                      >
                        <UserCheck size={16} /> Accept
                      </button>
                      <button
                        className={styles.declineBtn}
                        onClick={() => handleDeclineRequest(user)}
                      >
                        <X size={16} /> Decline
                      </button>
                    </div>
                  ) : user.requestSent ? (
                    <button className={`${styles.addBtn} ${styles.requested}`} disabled>
                      <UserCheck size={16} /> Requested
                    </button>
                  ) : (
                    <button
                      className={styles.addBtn}
                      onClick={() => handleSendRequest(user)}
                    >
                      <UserPlus size={16} /> Add
                    </button>
                  )}
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
                    <div className={styles.actionButtons}>
                      <button
                        className={styles.acceptBtn}
                        onClick={() => handleAcceptRequest(req)}
                      >
                        <UserCheck size={16} /> Accept
                      </button>
                      <button
                        className={styles.declineBtn}
                        onClick={() => handleDeclineRequest(req)}
                      >
                        <X size={16} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <FriendsList
                friends={friendsWithStatus}
                activeTab={activeTab}
                onFriendClick={handleFriendClick}
                onUnfriend={handleUnfriendClick}
                loading={loading}
                unreadCounts={unreadCounts}
              />
            )}
          </>
        )}
      </div>

      <ConfirmPopup
        isOpen={popup.isOpen}
        onClose={() => setPopup(prev => ({ ...prev, isOpen: false }))}
        onConfirm={popup.onConfirm}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        confirmText={popup.onConfirm ? 'Confirm' : 'OK'}
        cancelText={popup.onConfirm ? 'Cancel' : ''}
      />
    </div>
  )
}

export default SocialPage
