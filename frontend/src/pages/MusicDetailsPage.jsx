import { useParams } from 'react-router-dom'
import { Pause } from 'lucide-react'
import SongRow from '../components/SongRow/SongRow'
import styles from './MusicDetailsPage.module.css'

function MusicDetailsPage() {
  const { id } = useParams()

  const album = {
    id: id,
    name: 'Maharani',
    artist: 'Rupesh',
    cover: 'https://via.placeholder.com/300x300/6B46C1/FFFFFF?text=Rupesh',
    songs: [
      { id: 1, number: 1, title: 'Savior', artist: '', duration: '1:50', isPlaying: false },
      { id: 2, number: 2, title: 'Savior', artist: '', duration: '1:50', isPlaying: false },
      { id: 3, number: 3, title: 'Savior', artist: '', duration: '1:50', isPlaying: false },
      { id: 4, number: 4, title: 'Savior', artist: '', duration: '1:50', isPlaying: false },
      { id: 5, number: 5, title: 'Savior', artist: '', duration: '1:50', isPlaying: true }
    ]
  }

  return (
    <div className={styles.musicDetailsPage}>
      <div className={styles.mainContent}>
        <div className={styles.albumHeader}>
          <div className={styles.coverContainer}>
            <img src={album.cover} alt={album.name} className={styles.cover} />
          </div>
          <div className={styles.albumInfo}>
            <h1 className={styles.albumName}>{album.name}</h1>
            <div className={styles.albumActions}>
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
              <Pause size={16} />
            </div>
          </div>
          <div className={styles.tableBody}>
            {album.songs.map((song) => (
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

export default MusicDetailsPage
