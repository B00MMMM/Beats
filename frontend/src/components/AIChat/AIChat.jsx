import { Send, Sparkles, Play, Pause, RotateCcw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAIChat } from '../../context/AIChatContext';
import { usePlayer } from '../../context/PlayerContext';
import styles from './AIChat.module.css';

function AIChat() {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const { messages, isLoading, sendMessage, clearChat } = useAIChat();
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputMessage.trim() && !isLoading) {
      sendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePlayRecommendation = (song) => {
    if (!song.deezerId) {
      console.error('Song missing Deezer ID');
      return;
    }

    // Convert to track format compatible with PlayerContext
    const track = {
      _id: song.deezerId,
      deezerId: song.deezerId,
      title: song.title,
      artist: song.artist,
      cover: song.cover,
      imageUrl: song.cover,
      album: {
        cover_medium: song.cover
      }
    };

    playTrack(track);
  };

  const formatMessageContent = (content) => {
    // Remove song tags from display text (they're shown separately as recommendations)
    let cleanContent = content.replace(/<song>\s*Title:\s*.*?\s*Artist:\s*.*?\s*<\/song>/gi, '');
    
    // Clean up extra whitespace and empty lines
    cleanContent = cleanContent
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple empty lines with max 2
      .replace(/^\s+|\s+$/g, '') // Trim start and end
      .replace(/\n\s*$/, ''); // Remove trailing newlines with spaces
    
    // Convert line breaks to JSX  
    return cleanContent.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < cleanContent.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className={styles.aiChat}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.aiAvatar}>
            <Sparkles size={16} />
          </div>
          <div className={styles.headerText}>
            <h3>MIZU</h3>
            <p>Powered by Groq AI</p>
          </div>
        </div>
        <button className={styles.clearButton} onClick={clearChat} title="Clear Chat">
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {messages.map((message, index) => (
          <div
            key={message.id || index}
            className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.aiMessage}`}
          >
            <div className={styles.messageContent}>
              <div className={styles.messageText}>
                {formatMessageContent(message.content)}
              </div>

              {/* Song Recommendations */}
              {message.recommendations && message.recommendations.length > 0 && (
                <div className={styles.recommendations}>
                  <h4>Recommended Songs:</h4>
                  {message.recommendations.map((song, songIndex) => (
                    <div key={songIndex} className={styles.songRecommendation}>
                      <div className={styles.songInfo}>
                        <img
                          src={song.cover || '/default-music.png'}
                          alt={song.title}
                          className={styles.songCover}
                        />
                        <div className={styles.songDetails}>
                          <span className={styles.songTitle}>{song.title}</span>
                          <span className={styles.songArtist}>{song.artist}</span>
                        </div>
                      </div>
                      {song.deezerId && (
                        <button
                          className={styles.playButton}
                          onClick={() => handlePlayRecommendation(song)}
                          title="Play Song"
                        >
                          {currentTrack?.deezerId === song.deezerId && isPlaying ? (
                            <Pause size={16} />
                          ) : (
                            <Play size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.messageTime}>
                {new Date(message.timestamp || Date.now()).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className={styles.message}>
            <div className={styles.messageContent}>
              <div className={styles.loadingDots}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.inputContainer}>
        <div className={styles.inputWrapper}>
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about music, request recommendations, or just chat..."
            className={styles.messageInput}
            rows={1}
            disabled={isLoading}
          />
          <button
            className={styles.sendButton}
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
          >
            <Send size={18} />
          </button>
        </div>
        <p className={styles.inputHint}>
          Try asking: "Recommend me some upbeat pop songs" or "What's good for a chill evening?"
        </p>
      </div>
    </div>
  );
}

export default AIChat;