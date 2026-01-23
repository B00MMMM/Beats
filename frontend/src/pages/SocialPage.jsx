import { useState } from 'react'
import { ChevronDown, UserPlus } from 'lucide-react'
import FriendsList from '../components/FriendsList/FriendsList'
import ChatWindow from '../components/ChatWindow/ChatWindow'
import styles from './SocialPage.module.css'

function SocialPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'Meysia',
      content: 'Good Morning #Dion',
      isOwn: false,
      timestamp: '08:00'
    },
    {
      id: 2,
      sender: 'Broddy',
      content: 'Hello Guys, I Have The Latest Music Recommendation',
      isOwn: false,
      timestamp: '08:00'
    },
    {
      id: 3,
      sender: 'Broddy',
      content: 'Taylor Swift - Anti Hero',
      type: 'music',
      isOwn: false,
      timestamp: '08:00'
    },
    {
      id: 4,
      sender: 'Wanda',
      content: 'Oh Yeahh....I Like This Song #Brody',
      isOwn: false,
      timestamp: '08:00'
    },
    {
      id: 5,
      sender: 'Chellina',
      content: 'Nice Song #Brody',
      isOwn: false,
      timestamp: '08:00'
    }
  ])

  const friends = [
    { id: 1, name: '-neurolancer', status: 'offline' },
    { id: 2, name: 'Amal Sumesh Gama', status: 'offline' },
    { id: 3, name: 'Anumolpp', status: 'offline' },
    { id: 4, name: 'AuRa', status: 'offline' },
    { id: 5, name: 'Dex', status: 'offline' },
    { id: 6, name: 'Dinraj', status: 'offline' },
    { id: 7, name: 'Eldrich Ahlers', status: 'offline' },
    { id: 8, name: 'GHOST', status: 'offline' },
    { id: 9, name: 'Guts', status: 'offline' },
    { id: 10, name: 'Meysia', status: 'online' },
    { id: 11, name: 'Broddy', status: 'online' },
    { id: 12, name: 'Wanda', status: 'online' },
    { id: 13, name: 'Chellina', status: 'online' }
  ]

  const handleFriendClick = (friend) => {
    setSelectedFriend(friend)
  }

  const handleSendMessage = (text) => {
    const newMessage = {
      id: messages.length + 1,
      sender: 'You',
      content: text,
      isOwn: true,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    setMessages([...messages, newMessage])
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
            />
          </div>
        ) : (
          <FriendsList
            friends={friends}
            activeTab={activeTab}
            onFriendClick={handleFriendClick}
          />
        )}
      </div>
    </div>
  )
}

export default SocialPage
