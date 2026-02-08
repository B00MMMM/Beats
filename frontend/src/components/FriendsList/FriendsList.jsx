import { Search, MessageCircle, UserMinus } from 'lucide-react'
import { useState } from 'react'
import styles from './FriendsList.module.css'

/* Added inline style or ensure module css has this class. 
   Ideally, user asked for "indicator". I will add the CSS to the module file next. 
*/

function FriendsList({ friends, onFriendClick, onUnfriend, activeTab = 'all', loading = false, unreadCounts = {} }) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFriends = friends.filter(friend => {
    const matchesSearch = friend.name.toLowerCase().includes(searchQuery.toLowerCase())
    if (activeTab === 'online') return matchesSearch && friend.status === 'online'
    if (activeTab === 'all') return matchesSearch
    return matchesSearch
  })

  if (loading) {
    return (
      <div className={styles.friendsList}>
        <div className={styles.loading}>Loading friends...</div>
      </div>
    )
  }

  return (
    <div className={styles.friendsList}>
      <div className={styles.searchBox}>
        <Search size={16} />
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.header}>
        <h3>
          {activeTab === 'online' ? 'Online' : 'All'} friends - {filteredFriends.length}
        </h3>
      </div>

      <div className={styles.list}>
        {filteredFriends.length === 0 ? (
          <div className={styles.emptyState}>
            {activeTab === 'online' ? 'No friends online' : 'No friends found'}
          </div>
        ) : (
          filteredFriends.map((friend) => (
            <div key={friend.id} className={styles.friendItem}>
              <div className={styles.friendInfo} onClick={() => onFriendClick?.(friend)}>
                <div className={styles.avatar}>
                  {friend.avatar ? (
                    <img src={friend.avatar} alt={friend.name} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {friend.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {friend.status === 'online' && <div className={styles.onlineIndicator} />}
                </div>
                <div className={styles.friendDetails}>
                  <span className={styles.friendName}>{friend.name}</span>
                  <span className={styles.friendStatus}>
                    {friend.status === 'online' ? 'Online' : 'Offline'}
                  </span>

                </div>
              </div>
              <div className={styles.friendActions}>
                {unreadCounts[friend.id] > 0 && (
                  <span className={styles.unreadBadge}>{unreadCounts[friend.id]}</span>
                )}
                <button className={styles.actionButton} onClick={() => onFriendClick?.(friend)}>
                  <MessageCircle size={18} />
                </button>
                <button
                  className={`${styles.actionButton} ${styles.unfriendButton}`}
                  onClick={() => onUnfriend?.(friend)}
                  title="Unfriend"
                >
                  <UserMinus size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default FriendsList
