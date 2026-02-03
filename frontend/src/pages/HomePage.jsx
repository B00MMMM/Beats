import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import PlaylistCard from '../components/PlaylistCard/PlaylistCard'
import ScrollableSection from '../components/ScrollableSection/ScrollableSection'; // Import new component
import styles from './HomePage.module.css'
import axios from '../api/axios';
import { usePlayer } from '../context/PlayerContext';
import Loader from '../components/Loader/Loader';
import centeredLoaderStyles from '../components/Loader/CenteredLoader.module.css';

function HomePage() {
  const navigate = useNavigate()
  const { getToken, userId } = useAuth(); // Need auth for history
  const { playTrack } = usePlayer();
  const [trending, setTrending] = useState([]);
  const [recentPlays, setRecentPlays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Trending (Cached)
        const cachedTrending = sessionStorage.getItem('trendingSongs');
        if (cachedTrending) {
          setTrending(JSON.parse(cachedTrending));
        } else {
          const trendRes = await axios.get('/songs/trending');
          setTrending(trendRes.data);
          sessionStorage.setItem('trendingSongs', JSON.stringify(trendRes.data));
        }

        // Fetch Recent Plays (Authenticated)
        if (userId) {
          const token = await getToken();
          const historyRes = await axios.get('/users/history', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setRecentPlays(historyRes.data);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]); // Re-fetch if user changes, though mainly on mount

  return (
    <div className={styles.homePage}>
      <div className={styles.mainContent}>

        {/* Trending Section (Top) */}
        {loading && trending.length === 0 ? (
          <div className={centeredLoaderStyles.centeredLoaderContainer}>
            <Loader />
          </div>
        ) : (
          <div className={styles.sectionGroup}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Trending Now</h2>
            </div>
            {/* Row 1 */}
            <ScrollableSection>
              {trending.slice(0, 10).map(song => (
                <PlaylistCard
                  key={song.deezerId}
                  song={song}
                  onClick={() => playTrack(song)}
                />
              ))}
            </ScrollableSection>
            {/* Row 2 */}
            {trending.length > 10 && (
              <ScrollableSection>
                {trending.slice(10, 20).map(song => (
                  <PlaylistCard
                    key={song.deezerId}
                    song={song}
                    onClick={() => playTrack(song)}
                  />
                ))}
              </ScrollableSection>
            )}
          </div>
        )}

        {/* Recently Played Section (Bottom) */}
        {recentPlays.length > 0 && (
          <ScrollableSection title="Recently Played">
            {recentPlays.map(song => (
              <PlaylistCard
                key={song._id || song.deezerId}
                song={song}
                onClick={() => playTrack(song)}
              />
            ))}
          </ScrollableSection>
        )}
      </div>
    </div>
  )
}

export default HomePage
