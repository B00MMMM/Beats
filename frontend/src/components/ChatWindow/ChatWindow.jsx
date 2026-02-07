import { Smile, Share2, Send, Music, ArrowLeft, Play, Pause } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import styles from './ChatWindow.module.css'
import MusicPicker from '../MusicPicker/MusicPicker'
import { usePlayer } from '../../context/PlayerContext'

function ChatWindow({ friend, messages = [], onSendMessage, onBack }) {
  const [message, setMessage] = useState('')
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const messagesEndRef = useRef(null)
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (attachment = null) => {
    if (message.trim() || attachment) {
      onSendMessage?.(message, attachment)
      setMessage('')
      setShowMusicPicker(false)
    }
  }

  const handleMusicSelect = (item) => {
    handleSend(item)
  }

  const handlePlayMusic = (attachment) => {
    // Construct a track object compat with PlayerContext
    const track = {
      _id: attachment.id,
      title: attachment.title,
      artist: attachment.artist,
      imageUrl: attachment.image,
      audioUrl: attachment.audioUrl // Assuming this is available or handled by Player
    }
    playTrack(track)
  }

  return (
    <div className={styles.chatWindow}>
      <div className={styles.chatHeader}>
        <button className={styles.backButton} onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
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
            <span className={styles.status}>
              {friend?.status === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={msg.id || index} className={`${styles.message} ${msg.isOwn ? styles.own : ''}`}>
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

                {msg.attachment ? (
                  <div className={styles.musicAttachment}>
                    <div className={styles.musicInfo}>
                      <img src={msg.attachment.image} alt={msg.attachment.title} className={styles.albumArt} />
                      <div className={styles.songDetails}>
                        <div className={styles.songTitle}>{msg.attachment.title}</div>
                        <div className={styles.songArtist}>{msg.attachment.artist}</div>
                      </div>
                    </div>
                    <button
                      className={styles.playBtn}
                      onClick={() => handlePlayMusic(msg.attachment)}
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                  </div>
                ) : null}

                {msg.content && <p className={styles.messageText}>{msg.content}</p>}

                {msg.timestamp && (
                  <span className={styles.timestamp}>{msg.timestamp}</span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
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
        <button
          className={styles.iconButton}
          onClick={() => setShowMusicPicker(true)}
        >
          <Music size={20} />
        </button>
        <button className={styles.sendButton} onClick={() => handleSend()}>
          <Send size={20} />
        </button>
      </div>

      {showMusicPicker && (
        <MusicPicker
          onSelect={handleMusicSelect}
          onClose={() => setShowMusicPicker(false)}
        />
      )}
    </div>
  )
}

export default ChatWindow
