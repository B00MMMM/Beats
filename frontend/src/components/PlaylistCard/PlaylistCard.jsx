import { Play, Pause } from 'lucide-react'
import styles from './PlaylistCard.module.css'
import { usePlayer } from '../../context/PlayerContext'

function PlaylistCard({ song, onClick }) {
  const { currentTrack, isPlaying } = usePlayer();
  const isCurrentTrack = currentTrack?.deezerId === song.deezerId;

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.imageContainer}>
        <img src={song.cover} alt={song.title} className={styles.image} />
        <div className={styles.playOverlay}>
          <button className={styles.playButton}>
            {isCurrentTrack && isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
        </div>
      </div>
      <div className={styles.info}>
        <h3 className={styles.title}>{song.title}</h3>
        {song.artist && <p className={styles.artist}>{typeof song.artist === 'string' ? song.artist : song.artist.name}</p>}
      </div>
    </div>
  )
}

export default PlaylistCard
