import { Smile, Share2, Send, Music, ArrowLeft, Play, Pause, X, Settings } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './ChatWindow.module.css'
import MusicPicker from '../MusicPicker/MusicPicker'
import { usePlayer } from '../../context/PlayerContext'

function ChatWindow({ friend, messages = [], onSendMessage, onBack, onOpenSettings, isGroup = false }) {
  const [message, setMessage] = useState('')
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [pinnedAttachment, setPinnedAttachment] = useState(null)
  const messagesEndRef = useRef(null)
  const { playTrack } = usePlayer()
  const navigate = useNavigate()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (message.trim() || pinnedAttachment) {
      onSendMessage?.(message, pinnedAttachment)
      setMessage('')
      setPinnedAttachment(null)
      setShowMusicPicker(false)
    }
  }

  const handleMusicSelect = (item) => {
    setPinnedAttachment(item)
    setShowMusicPicker(false)
  }

  const handlePlayMusic = (attachment) => {
    // If it's a playlist, navigate to the playlist page instead of playing
    if (attachment.type === 'playlist') {
      navigate(`/playlist/${attachment.id}`)
      return
    }

    // For songs, construct a track object compatible with PlayerContext
    const image = attachment.cover || attachment.image || attachment.imageUrl || attachment.album?.cover_medium || "/default-music.png";

    const track = {
      _id: attachment.id || attachment._id,
      deezerId: attachment.id || attachment.deezerId,
      title: attachment.title,
      artist: attachment.artist,
      cover: image,
      imageUrl: image,
      album: {
        cover_medium: image
      }
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
              {friend?.status === 'group'
                ? `${friend.memberCount} members`
                : friend?.status === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        {isGroup && onOpenSettings && (
          <button className={styles.settingsButton} onClick={onOpenSettings}>
            <Settings size={20} />
          </button>
        )}
      </div>

      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            // Render system messages differently
            if (msg.isSystemMessage) {
              return (
                <div key={msg.id || index} className={styles.systemMessage}>
                  <span>{msg.content}</span>
                </div>
              );
            }

            // Regular message rendering
            return (
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
                      <button
                        className={styles.playBtn}
                        onClick={() => handlePlayMusic(msg.attachment)}
                      >
                        <Play size={16} fill="currentColor" />
                      </button>
                      <div className={styles.musicInfo}>
                        <span className={styles.songTitle}>{msg.attachment.title || msg.attachment.name}</span>
                      </div>
                    </div>
                  ) : null}

                  {msg.content && <p className={styles.messageText}>{msg.content}</p>}

                  {msg.timestamp && (
                    <span className={styles.timestamp}>{msg.timestamp}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputContainer}>
        {pinnedAttachment && (
          <div className={styles.pinnedAttachment}>
            <div className={styles.pinnedInfo}>
              <Music size={14} />
              <span>{pinnedAttachment.title || pinnedAttachment.name}</span>
            </div>
            <button
              className={styles.removePinnedBtn}
              onClick={() => setPinnedAttachment(null)}
            >
              <X size={14} />
            </button>
          </div>
        )}
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
          <button className={styles.sendButton} onClick={handleSend}>
            <Send size={20} />
          </button>
        </div>
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
