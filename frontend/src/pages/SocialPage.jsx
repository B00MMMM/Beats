import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronDown, UserPlus, Search, UserCheck, X, Users } from 'lucide-react'
import { useAuth } from '@clerk/clerk-react'
import { useLocation } from 'react-router-dom'
import FriendsList from '../components/FriendsList/FriendsList'
import ChatWindow from '../components/ChatWindow/ChatWindow'
import ConfirmPopup from '../components/ConfirmPopup/ConfirmPopup'
import CreateGroupModal from '../components/CreateGroupModal/CreateGroupModal'
import GroupSettingsModal from '../components/GroupSettingsModal/GroupSettingsModal'
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
  const [unreadCounts, setUnreadCounts] = useState({})
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupMessages, setGroupMessages] = useState([])
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  // Popup state
  const [popup, setPopup] = useState({ isOpen: false, title: '', message: '', type: 'default', onConfirm: null })
  const [unfriendTarget, setUnfriendTarget] = useState(null)

  const selectedFriendRef = useRef(selectedFriend) // Ref to track selected friend in closures
  const selectedGroupRef = useRef(selectedGroup) // Ref to track selected group in closures

  // Update ref when selected friend changes
  useEffect(() => {
    selectedFriendRef.current = selectedFriend
  }, [selectedFriend])

  // Update ref when selected group changes
  useEffect(() => {
    selectedGroupRef.current = selectedGroup
  }, [selectedGroup])

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

  // Listen for group events from socket
  useEffect(() => {
    if (!socket) return

    const handleNewGroupMessage = (data) => {
      // Only update if we're viewing this group
      if (selectedGroupRef.current?._id === data.groupId) {
        const newMessage = {
          id: data._id,
          sender: data.senderId === userId ? 'You' : data.senderName,
          avatar: data.senderAvatar,
          content: data.content,
          attachment: data.attachment,
          isOwn: data.senderId === userId,
          isSystemMessage: data.isSystemMessage,
          timestamp: new Date(data.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })
        }
        setGroupMessages(prev => [...prev, newMessage])
      }
    }

    const handleGroupUpdate = (data) => {
      // Update group in groups list
      setGroups(prev => prev.map(g => g._id === data.groupId ? data.group : g))

      // Update selected group if it's the one being updated
      if (selectedGroupRef.current?._id === data.groupId) {
        setSelectedGroup(data.group)

        // Add system message if provided
        if (data.systemMessage) {
          const formattedMessage = formatSystemMessage(data.systemMessage)
          setGroupMessages(prev => [...prev, formattedMessage])
        }
      }
    }

    const handleGroupMemberRemoved = (data) => {
      if (data.group === null) {
        // Current user was removed from the group
        setGroups(prev => prev.filter(g => g._id !== data.groupId))
        if (selectedGroupRef.current?._id === data.groupId) {
          setSelectedGroup(null)
          setGroupMessages([])
          setShowGroupSettings(false)
        }
      } else {
        handleGroupUpdate(data)
      }
    }

    socket.on('newGroupMessage', handleNewGroupMessage)
    socket.on('groupMemberAdded', handleGroupUpdate)
    socket.on('groupMemberRemoved', handleGroupMemberRemoved)
    socket.on('groupMemberLeft', handleGroupUpdate)
    socket.on('groupAdminPromoted', handleGroupUpdate)
    socket.on('groupAdminDemoted', handleGroupUpdate)
    socket.on('groupNameUpdated', handleGroupUpdate)
    socket.on('groupImageUpdated', handleGroupUpdate)

    return () => {
      socket.off('newGroupMessage', handleNewGroupMessage)
      socket.off('groupMemberAdded', handleGroupUpdate)
      socket.off('groupMemberRemoved', handleGroupMemberRemoved)
      socket.off('groupMemberLeft', handleGroupUpdate)
      socket.off('groupAdminPromoted', handleGroupUpdate)
      socket.off('groupAdminDemoted', handleGroupUpdate)
      socket.off('groupNameUpdated', handleGroupUpdate)
      socket.off('groupImageUpdated', handleGroupUpdate)
    }
  }, [socket, userId])

  // Fetch users (friends) and friend requests
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken()
        if (!token) return

        const [usersResponse, requestsResponse, meResponse, groupsResponse] = await Promise.all([
          axios.get('/chat/users', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/chat/friends/requests', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/chat/groups', { headers: { Authorization: `Bearer ${token}` } })
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
        setCurrentUser({
          id: meResponse.data.clerkId,
          dbId: meResponse.data._id,
          name: meResponse.data.fullName,
          avatar: meResponse.data.imageUrl
        })
        setGroups(groupsResponse.data)
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
    setSelectedGroup(null)
    setGroupMessages([])
  }

  // Group chat handlers
  const handleGroupClick = async (group) => {
    setSelectedGroup(group)
    setSelectedFriend(null)

    // Fetch group messages
    try {
      const token = await getToken()
      if (!token) return

      const response = await axios.get(`/chat/groups/${group._id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const messagesData = response.data.map(msg => {
        // Handle system messages
        if (msg.isSystemMessage) {
          return formatSystemMessage(msg)
        }

        // Handle regular messages
        return {
          id: msg._id,
          sender: msg.senderId === userId ? 'You' : msg.senderName,
          avatar: msg.senderAvatar,
          content: msg.content,
          attachment: msg.attachment,
          isOwn: msg.senderId === userId,
          timestamp: new Date(msg.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      })

      setGroupMessages(messagesData)
    } catch (error) {
      console.error('Error fetching group messages:', error)
    }
  }

  const handleSendGroupMessage = async (text, attachment = null) => {
    if (!selectedGroup || (!text.trim() && !attachment)) return

    try {
      const token = await getToken()
      if (!token) return

      const payload = {
        groupId: selectedGroup._id,
        content: text
      }
      if (attachment) {
        payload.attachment = {
          type: attachment.type || 'song',
          id: attachment.deezerId || attachment._id || attachment.id,
          title: attachment.title || attachment.name,
          artist: attachment.artist || '',
          image: attachment.imageUrl || attachment.cover || attachment.albumImage || attachment.image,
          audioUrl: attachment.audioUrl || ''
        }
      }

      const response = await axios.post('/chat/groups/messages', payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

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

      setGroupMessages(prev => [...prev, newMessage])
    } catch (error) {
      console.error('Error sending group message:', error)
    }
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

  // Create group handler
  const handleCreateGroup = async ({ name, memberIds, imageFile }) => {
    try {
      const token = await getToken()
      if (!token) return

      const formData = new FormData()
      formData.append('name', name)
      if (memberIds && memberIds.length > 0) {
        memberIds.forEach(id => formData.append('memberIds', id))
      }
      if (imageFile) {
        formData.append('image', imageFile)
      }

      const response = await axios.post('/chat/groups', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      // Add the new group to the list
      setGroups(prev => [response.data, ...prev])

      setPopup({
        isOpen: true,
        title: 'Group Created',
        message: `Group "${name}" has been created successfully!`,
        type: 'success',
        onConfirm: null
      })
    } catch (error) {
      console.error('Error creating group:', error)
      setPopup({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create group. Please try again.',
        type: 'danger',
        onConfirm: null
      })
      throw error // Re-throw to handle in modal
    }
  }

  // Helper function to format system messages
  const formatSystemMessage = (systemMessage) => {
    let content = ''
    const data = systemMessage.systemMessageData

    switch (systemMessage.systemMessageType) {
      case 'member_added':
        content = `${data.adminName} added ${data.memberName}`
        break
      case 'member_removed':
        content = `${data.adminName} removed ${data.memberName}`
        break
      case 'member_left':
        content = `${data.memberName} left the group`
        break
      case 'admin_promoted':
        content = `${data.memberName} is now an admin`
        break
      case 'admin_demoted':
        content = `${data.memberName} is no longer an admin`
        break
      case 'group_name_changed':
        content = `${data.adminName} changed the group name to "${data.newName}"`
        break
      case 'group_image_changed':
        content = `${data.adminName} changed the group photo`
        break
      default:
        content = 'Group updated'
    }

    return {
      id: systemMessage._id,
      content,
      isSystemMessage: true,
      timestamp: new Date(systemMessage.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  // Group management handlers
  const handleOpenGroupSettings = () => {
    setShowGroupSettings(true)
  }

  const handleAddMember = async (memberId) => {
    try {
      const token = await getToken()
      if (!token) return

      await axios.post(`/chat/groups/${selectedGroup._id}/members`, { memberId }, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (error) {
      console.error('Error adding member:', error)
      setPopup({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to add member',
        type: 'danger',
        onConfirm: null
      })
    }
  }

  const handleRemoveMember = async (memberId) => {
    try {
      const token = await getToken()
      if (!token) return

      await axios.delete(`/chat/groups/${selectedGroup._id}/members/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (error) {
      console.error('Error removing member:', error)
      setPopup({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to remove member',
        type: 'danger',
        onConfirm: null
      })
    }
  }

  const handlePromoteAdmin = async (memberId) => {
    try {
      const token = await getToken()
      if (!token) return

      await axios.post(`/chat/groups/${selectedGroup._id}/admins/${memberId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (error) {
      console.error('Error promoting admin:', error)
      setPopup({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to promote admin',
        type: 'danger',
        onConfirm: null
      })
    }
  }

  const handleDemoteAdmin = async (memberId) => {
    try {
      const token = await getToken()
      if (!token) return

      await axios.delete(`/chat/groups/${selectedGroup._id}/admins/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (error) {
      console.error('Error demoting admin:', error)
      setPopup({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to demote admin',
        type: 'danger',
        onConfirm: null
      })
    }
  }

  const handleUpdateGroupName = async (newName) => {
    try {
      const token = await getToken()
      if (!token) return

      await axios.put(`/chat/groups/${selectedGroup._id}/name`, { name: newName }, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (error) {
      console.error('Error updating group name:', error)
      setPopup({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update group name',
        type: 'danger',
        onConfirm: null
      })
    }
  }

  const handleUpdateGroupImage = async (imageFile) => {
    try {
      const token = await getToken()
      if (!token) return

      const formData = new FormData()
      formData.append('image', imageFile)

      await axios.put(`/chat/groups/${selectedGroup._id}/image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
    } catch (error) {
      console.error('Error updating group image:', error)
      setPopup({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update group image',
        type: 'danger',
        onConfirm: null
      })
    }
  }

  const handleLeaveGroup = async () => {
    try {
      const token = await getToken()
      if (!token) return

      await axios.post(`/chat/groups/${selectedGroup._id}/leave`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Remove group from local state
      setGroups(prev => prev.filter(g => g._id !== selectedGroup._id))
      setSelectedGroup(null)
      setGroupMessages([])
      setShowGroupSettings(false)

      setPopup({
        isOpen: true,
        title: 'Left Group',
        message: 'You have left the group successfully',
        type: 'success',
        onConfirm: null
      })
    } catch (error) {
      console.error('Error leaving group:', error)
      setPopup({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.message || 'Failed to leave group',
        type: 'danger',
        onConfirm: null
      })
    }
  }

  return (
    <div className={styles.socialPage}>
      <div className={styles.mainContent}>
        <div className={styles.tabs}>
          {/* ID Circle Button */}
          <div className={styles.idCircle}>
            <span>ID</span>
            <div className={styles.idTooltip}>
              <span className={styles.idTooltipLabel}>My ID:</span>
              <span className={styles.idTooltipValue}>{currentUserUniqueId}</span>
            </div>
          </div>
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
            className={`${styles.tab} ${activeTab === 'groups' ? styles.active : ''}`}
            onClick={() => {
              setActiveTab('groups')
              setSelectedFriend(null)
              setShowAddFriend(false)
            }}
          >
            Groups {groups.length > 0 && <span className={styles.notificationBadge}>{groups.length}</span>}
          </button>
          <div className={styles.actionButtonsContainer}>
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
            <button
              className={styles.iconButton}
              onClick={() => setShowCreateGroup(true)}
              title="Create Group"
            >
              <Users size={18} />
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
        ) : selectedGroup ? (
          <div className={styles.chatContainer}>
            <ChatWindow
              friend={{
                name: selectedGroup.name,
                avatar: selectedGroup.imageUrl,
                status: 'group',
                memberCount: selectedGroup.members?.length || 0
              }}
              messages={groupMessages}
              onSendMessage={handleSendGroupMessage}
              onBack={handleBackToList}
              isGroup={true}
              onOpenSettings={handleOpenGroupSettings}
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
            ) : activeTab === 'groups' ? (
              <div className={styles.requestsList}>
                <h3>My Groups - {groups.length}</h3>
                {groups.length === 0 && <div className={styles.emptyState}>No groups yet. Create one!</div>}
                {groups.map(group => (
                  <div
                    key={group._id}
                    className={`${styles.requestItem} ${styles.clickable}`}
                    onClick={() => handleGroupClick(group)}
                  >
                    <div className={styles.userInfo}>
                      {group.imageUrl ? (
                        <img src={group.imageUrl} alt={group.name} className={styles.avatar} />
                      ) : (
                        <div className={styles.avatarPlaceholder}>
                          <Users size={20} />
                        </div>
                      )}
                      <div>
                        <div className={styles.userName}>{group.name}</div>
                        <div className={styles.userUniqueId}>{group.members?.length || 0} members</div>
                      </div>
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

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        friends={friendsWithStatus}
        onCreateGroup={handleCreateGroup}
      />

      {selectedGroup && currentUser && (
        <GroupSettingsModal
          isOpen={showGroupSettings}
          onClose={() => setShowGroupSettings(false)}
          group={selectedGroup}
          currentUser={currentUser}
          friends={friendsWithStatus}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onPromoteAdmin={handlePromoteAdmin}
          onDemoteAdmin={handleDemoteAdmin}
          onUpdateName={handleUpdateGroupName}
          onUpdateImage={handleUpdateGroupImage}
          onLeaveGroup={handleLeaveGroup}
        />
      )}
    </div>
  )
}

export default SocialPage
