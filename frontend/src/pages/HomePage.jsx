import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react';
import PlaylistCard from '../components/PlaylistCard/PlaylistCard'
import styles from './HomePage.module.css'
import axios from '../api/axios';
import { usePlayer } from '../context/PlayerContext';
import Loader from '../components/Loader/Loader';
import centeredLoaderStyles from '../components/Loader/CenteredLoader.module.css';

function HomePage() {
  const navigate = useNavigate()
  const { playTrack } = usePlayer();
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const cachedTrending = sessionStorage.getItem('trendingSongs');
        if (cachedTrending) {
          setTrending(JSON.parse(cachedTrending));
          setLoading(false);
        } else {
          const response = await axios.get('/songs/trending');
          setTrending(response.data);
          sessionStorage.setItem('trendingSongs', JSON.stringify(response.data));
        }
      } catch (error) {
        console.error('Error fetching trending songs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  return (
    <div className={styles.homePage}>
      <div className={styles.mainContent}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Trending Now</h2>
            <button className={styles.showAll}>Show all</button>
          </div>
          <div className={styles.grid}>
            {loading ? (
              <div className={centeredLoaderStyles.centeredLoaderContainer}>
                <Loader />
              </div>
            ) : (
              trending.map((song) => (
                <PlaylistCard
                  key={song.deezerId}
                  song={song}
                  onClick={() => playTrack(song)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default HomePage
