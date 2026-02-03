import { Heart, MoreVertical, Music, Trash2 } from 'lucide-react'
import { useState } from 'react'
import styles from './SongRow.module.css'

function SongRow({
  number,
  cover,
  title,
  artist,
  dateAdded,
  duration,
  isPlaying = false,
  isLiked = false,
  onPlay,
  onLike,
  onDelete
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

      <div className={styles.titleColumn}>
        {cover && <img src={cover} alt={title} className={styles.rowCover} />}
        <div className={styles.titleInfo}>
          <div className={styles.title}>{title}</div>
          <div className={styles.mobileArtist}>{artist}</div>
        </div>
      </div>

      <div className={styles.artist}>{artist || ''}</div>
      <div className={styles.dateAdded}>{dateAdded || ''}</div>
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
            fill={isLiked ? '#00FFD9' : 'none'}
            className={isLiked ? styles.liked : ''}
          />
        </button>
        {onDelete && (
          <button
            className={`${styles.actionButton} ${styles.deleteButton}`}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

export default SongRow
