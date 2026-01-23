import { Smile, Share2, Send, Music } from 'lucide-react'
import { useState } from 'react'
import styles from './ChatWindow.module.css'

function ChatWindow({ friend, messages = [], onSendMessage }) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage?.(message)
      setMessage('')
    }
  }

  return (
    <div className={styles.chatWindow}>
      <div className={styles.chatHeader}>
        <div className={styles.friendInfo}>
          <div className={styles.avatar}>
            {friend?.avatar ? (
              <img src={friend.avatar} alt={friend.name} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {friend?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            {friend?.status === 'online' && <div className={styles.onlineIndicator} />}
          </div>
          <div>
            <h3 className={styles.friendName}>{friend?.name || 'Friend'}</h3>
            <span className={styles.status}>Now At 08.00</span>
          </div>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <div key={index} className={`${styles.message} ${msg.isOwn ? styles.own : ''}`}>
            {!msg.isOwn && (
              <div className={styles.messageAvatar}>
                {msg.avatar ? (
                  <img src={msg.avatar} alt={msg.sender} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {msg.sender?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}
            <div className={styles.messageContent}>
              {!msg.isOwn && <span className={styles.senderName}>{msg.sender}</span>}
              {msg.type === 'music' ? (
                <div className={styles.musicMessage}>
                  <Music size={16} />
                  <span>{msg.content}</span>
                </div>
              ) : (
                <p className={styles.messageText}>{msg.content}</p>
              )}
              {msg.timestamp && (
                <span className={styles.timestamp}>{msg.timestamp}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.inputArea}>
        <button className={styles.iconButton}>
          <Smile size={20} />
        </button>
        <input
          type="text"
          placeholder="Type Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          className={styles.input}
        />
        <button className={styles.iconButton}>
          <Share2 size={20} />
        </button>
        <button className={styles.sendButton} onClick={handleSend}>
          <Send size={20} />
        </button>
      </div>
    </div>
  )
}

export default ChatWindow
