import { UserPlus, Share2 } from 'lucide-react'
import styles from './ArtistInfoPanel.module.css'

function ArtistInfoPanel({ 
  artistName, 
  monthlyListeners, 
  bio, 
  albumArt,
  isFollowing = false,
  onFollow,
  onAddToPlaylist
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.albumArtContainer}>
        <img src={albumArt} alt={artistName} className={styles.albumArt} />
      </div>
      
      <div className={styles.info}>
        <h2 className={styles.songTitle}>{artistName}</h2>
        <p className={styles.artistName}>{artistName}</p>
        
        <div className={styles.listeners}>
          <span className={styles.listenerCount}>{monthlyListeners.toLocaleString()} Monthly listeners</span>
          <button 
            className={`${styles.followButton} ${isFollowing ? styles.following : ''}`}
            onClick={onFollow}
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </button>
        </div>
      </div>

      <div className={styles.bio}>
        <h3 className={styles.bioTitle}>About the Artist</h3>
        <p className={styles.bioText}>{bio}</p>
      </div>

      <div className={styles.actions}>
        <button className={styles.addButton} onClick={onAddToPlaylist}>
          <Share2 size={18} />
          <span>Add to Playlist</span>
        </button>
      </div>
    </div>
  )
}

export default ArtistInfoPanel
