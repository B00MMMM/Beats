import { Smile, Send, Music, ArrowLeft, Play, Pause, X, Settings, Bot, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import axios from '../../api/axios'
import styles from './ChatWindow.module.css'
import MusicPicker from '../MusicPicker/MusicPicker'
import { usePlayer } from '../../context/PlayerContext'

function ChatWindow({ friend, messages = [], onSendMessage, onBack, onOpenSettings, isGroup = false }) {
  const [message, setMessage] = useState('')
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [pinnedAttachment, setPinnedAttachment] = useState(null)
  const [allMessages, setAllMessages] = useState(messages)
  const messagesEndRef = useRef(null)
  const { playTrack, currentTrack, isPlaying, setCurrentTrack, setIsPlaying, isLoadingTrack, setIsLoadingTrack } = usePlayer()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [loadingSongKey, setLoadingSongKey] = useState(null)

  // Sync local state with props
  useEffect(() => {
    setAllMessages(messages);
  }, [messages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages])

  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    if ((message.trim() || pinnedAttachment) && !isSending) {
      try {
        setIsSending(true)
        await onSendMessage?.(message, pinnedAttachment)
        setMessage('')
        setPinnedAttachment(null)
        setShowMusicPicker(false)
      } catch (error) {
        console.error('Failed to send message:', error)
      } finally {
        setIsSending(false)
      }
    }
  }

  const handlePlayRecommendation = async (song) => {
    // Prevent multiple concurrent clicks
    if (loadingSongKey) return

    try {
      // If the song already has a deezerId (enriched via socket), play directly
      if (song.deezerId) {
        const playerTrack = {
          _id: song.deezerId,
          deezerId: song.deezerId,
          title: song.title,
          artist: song.artist,
          cover: song.cover || '/default-music.png',
          imageUrl: song.cover || '/default-music.png',
          album: song.album || { cover_medium: song.cover || '/default-music.png' }
        }
        playTrack(playerTrack)
        return
      }

      // Fallback: search Deezer for older messages without deezerId
      const songKey = `${song.title}-${song.artist}`
      setLoadingSongKey(songKey)
      setIsLoadingTrack(true)

      // Optimistically update the bottom player with song info and "B" placeholder
      setCurrentTrack({
        title: song.title,
        artist: song.artist,
        cover: null,
        imageUrl: null,
        album: { cover_medium: null }
      })
      setIsPlaying(false)

      const token = await getToken()
      const response = await axios.get(
        `/songs/search?q=${encodeURIComponent(`${song.title} ${song.artist}`)}&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data && response.data.length > 0) {
        const track = response.data[0]

        const playerTrack = {
          _id: track.deezerId,
          deezerId: track.deezerId,
          title: track.title,
          artist: track.artist?.name || song.artist,
          cover: track.cover || track.album?.cover_medium || '/default-music.png',
          imageUrl: track.cover || track.album?.cover_medium || '/default-music.png',
          album: track.album,
          duration: track.duration,
          preview: track.previewUrl
        }

        playTrack(playerTrack)
      } else {
        console.warn('Song not found on Deezer:', song.title)
        setIsPlaying(false)
      }
    } catch (error) {
      console.error('Error playing recommended song:', error)
      setIsPlaying(false)
    } finally {
      setLoadingSongKey(null)
      setIsLoadingTrack(false)
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
        {allMessages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <p>No messages yet. Start a conversation!</p>
            <p className={styles.aiHint}>💡 Tip: Mention <span className={styles.mizuTag}>@mizu</span> to get AI music recommendations!</p>
          </div>
        ) : (
          allMessages.map((msg, index) => {
            // Render system messages differently
            if (msg.isSystemMessage) {
              return (
                <div key={msg.id || index} className={styles.systemMessage}>
                  <span>{msg.content}</span>
                </div>
              );
            }

            // Check if this is an AI message
            const isAIMessage = msg.isAI ||
              msg.senderId === 'MIZU_AI' ||
              msg.senderName === 'MIZU';

            // Regular message rendering
            return (
              <div key={msg.id || index} className={`${styles.message} ${msg.isOwn && !isAIMessage ? styles.own : ''} ${isAIMessage ? styles.aiMessage : ''}`}>
                {!msg.isOwn && (
                  <div className={`${styles.messageAvatar} ${isAIMessage ? styles.aiAvatar : ''}`}>
                    {isAIMessage ? (
                      <div className={styles.aiAvatarIcon}>
                        <Bot size={16} color="#1DB954" />
                      </div>
                    ) : msg.avatar ? (
                      <img src={msg.avatar} alt={msg.sender} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {msg.sender?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
                <div className={`${styles.messageContent} ${isAIMessage ? styles.aiMessageContent : ''}`}>
                  {!msg.isOwn && (
                    <span className={`${styles.senderName} ${isAIMessage ? styles.aiSenderName : ''}`}>
                      {isAIMessage ? 'MIZU' : msg.sender}
                    </span>
                  )}

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

                  {msg.content && (
                    <p className={`${styles.messageText} ${isAIMessage ? styles.aiMessageText : ''}`}>
                      {msg.content}
                    </p>
                  )}

                  {/* Render AI song recommendations */}
                  {isAIMessage && msg.songRecommendations && msg.songRecommendations.length > 0 && (
                    <div className={styles.aiRecommendations}>
                      {msg.songRecommendations.map((song, idx) => {
                        const isSongPlaying = currentTrack?.deezerId === song.deezerId && isPlaying
                        const songKey = `${song.title}-${song.artist}`
                        const isLoading = loadingSongKey === songKey
                        return (
                          <div key={idx} className={styles.songRecommendation}>
                            <div className={styles.songInfo}>
                              <span className={styles.songTitle}>{song.title}</span>
                              <span className={styles.songArtist}>{song.artist}</span>
                            </div>
                            <button
                              className={`${styles.playRecommendationBtn} ${isLoading ? styles.loadingBtn : ''}`}
                              onClick={() => handlePlayRecommendation(song)}
                              disabled={!!loadingSongKey}
                              title={isLoading ? 'Loading...' : isSongPlaying ? 'Pause' : 'Play'}
                            >
                              {isLoading
                                ? <Loader2 size={12} className={styles.spinnerIcon} />
                                : isSongPlaying
                                  ? <Pause size={12} fill="currentColor" />
                                  : <Play size={12} fill="currentColor" />
                              }
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

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
            placeholder="Type Message (mention @mizu for AI help)"
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
