import { useNavigate } from 'react-router-dom'
import styles from './PlaylistCardSimple.module.css'

function PlaylistCardSimple({ playlist, onClick }) {
    const navigate = useNavigate()

    const handleClick = () => {
        if (onClick) {
            onClick()
        } else {
            navigate(`/playlist/${playlist._id}`)
        }
    }

    return (
        <div className={styles.card} onClick={handleClick}>
            <div className={styles.imageContainer}>
                {playlist.imageUrl ? (
                    <img src={playlist.imageUrl} alt={playlist.title} className={styles.image} />
                ) : (
                    <div className={styles.placeholder}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                        </svg>
                    </div>
                )}
            </div>
            <div className={styles.info}>
                <h3 className={styles.title}>{playlist.title}</h3>
                <p className={styles.meta}>
                    Playlist • {playlist.songCount || 0} songs
                </p>
            </div>
        </div>
    )
}

export default PlaylistCardSimple
