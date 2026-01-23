import { useParams, useNavigate } from 'react-router-dom'
import { Pause, Heart, MoreVertical } from 'lucide-react'
import SongRow from '../components/SongRow/SongRow'
import styles from './PlaylistPage.module.css'

function PlaylistPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const playlist = {
    id: id,
    name: 'Maharani',
    cover: 'https://via.placeholder.com/300x300/6B46C1/FFFFFF?text=Maharani',
    songs: [
      { id: 1, number: 1, title: 'Savior', artist: '', duration: '1:50', isPlaying: false },
      { id: 2, number: 2, title: 'Savior', artist: '', duration: '1:50', isPlaying: false },
      { id: 3, number: 3, title: 'Savior', artist: '', duration: '1:50', isPlaying: false },
      { id: 4, number: 4, title: 'Savior', artist: '', duration: '1:50', isPlaying: false },
      { id: 5, number: 5, title: 'Savior', artist: '', duration: '1:50', isPlaying: true }
    ]
  }

  return (
    <div className={styles.playlistPage}>
      <div className={styles.mainContent}>
        <div className={styles.playlistHeader}>
          <div className={styles.coverContainer}>
            <img src={playlist.cover} alt={playlist.name} className={styles.cover} />
          </div>
          <div className={styles.playlistInfo}>
            <h1 className={styles.playlistName}>{playlist.name}</h1>
            <div className={styles.playlistActions}>
              <button className={styles.playButton}>
                <Pause size={24} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.songsTable}>
          <div className={styles.tableHeader}>
            <div className={styles.headerNumber}>#</div>
            <div className={styles.headerTitle}>title</div>
            <div className={styles.headerArtist}>Artist</div>
            <div className={styles.headerDuration}>
              <span>Duration</span>
            </div>
          </div>
          <div className={styles.tableBody}>
            {playlist.songs.map((song) => (
              <SongRow
                key={song.id}
                number={song.number}
                title={song.title}
                artist={song.artist}
                duration={song.duration}
                isPlaying={song.isPlaying}
                isLiked={false}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlaylistPage
