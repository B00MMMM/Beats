import { Heart, MoreVertical, Music } from 'lucide-react'
import { useState } from 'react'
import styles from './SongRow.module.css'

function SongRow({ 
  number, 
  title, 
  artist, 
  duration, 
  isPlaying = false,
  isLiked = false,
  onPlay,
  onLike,
  onMore
}) {
  return (
    <div 
      className={`${styles.row} ${isPlaying ? styles.playing : ''}`}
      onClick={onPlay}
    >
      <div className={styles.number}>
        {isPlaying ? (
          <Music size={16} className={styles.waveform} />
        ) : (
          <span>{number}</span>
        )}
      </div>
      <div className={styles.title}>{title}</div>
      <div className={styles.artist}>{artist || ''}</div>
      <div className={styles.duration}>{duration}</div>
      <div className={styles.actions}>
        <button 
          className={styles.actionButton}
          onClick={(e) => {
            e.stopPropagation()
            onLike?.()
          }}
        >
          <Heart 
            size={16} 
            fill={isLiked ? 'currentColor' : 'none'}
            className={isLiked ? styles.liked : ''}
          />
        </button>
        <button 
          className={styles.actionButton}
          onClick={(e) => {
            e.stopPropagation()
            onMore?.()
          }}
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  )
}

export default SongRow
