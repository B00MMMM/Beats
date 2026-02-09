import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../api/axios';
import PlaylistCard from '../components/PlaylistCard/PlaylistCard';
import PlaylistCardSimple from '../components/PlaylistCardSimple/PlaylistCardSimple';
import ScrollableSection from '../components/ScrollableSection/ScrollableSection';
import { usePlayer } from '../context/PlayerContext';
import Loader from '../components/Loader/Loader';
import styles from './SearchPage.module.css';
import centeredLoaderStyles from '../components/Loader/CenteredLoader.module.css';
import { Play, Pause } from 'lucide-react';

function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [songResults, setSongResults] = useState([]);
  const [playlistResults, setPlaylistResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playTrack, currentTrack, isPlaying } = usePlayer();

  useEffect(() => {
    if (query) {
      const fetchSearch = async () => {
        const cacheKey = `search_cache_${query}`;
        const cachedSongs = sessionStorage.getItem(cacheKey);

        setLoading(true);

        try {
          // Fetch songs (with cache)
          if (cachedSongs) {
            setSongResults(JSON.parse(cachedSongs));
          } else {
            const songsResponse = await axios.get(`/songs/search?q=${query}`);
            setSongResults(songsResponse.data);
            sessionStorage.setItem(cacheKey, JSON.stringify(songsResponse.data));
          }

          // Fetch public playlists (no cache for fresh results)
          const playlistResponse = await axios.get(`/playlists/search?q=${query}`);
          setPlaylistResults(playlistResponse.data);
        } catch (error) {
          console.error('Error fetching search results:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchSearch();
    } else {
      setSongResults([]);
      setPlaylistResults([]);
      setLoading(false);
    }
  }, [query]);

  const topResult = songResults[0];
  const otherSongs = songResults.slice(1);
  const isTopResultPlaying = topResult && currentTrack?.deezerId === topResult.deezerId && isPlaying;

  if (loading) {
    return (
      <div className={styles.searchPage}>
        <div className={centeredLoaderStyles.centeredLoaderContainer}>
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.searchPage}>
      <h1 className={styles.pageTitle}>Search Results for "{query}"</h1>

      {songResults.length === 0 && playlistResults.length === 0 ? (
        <p className={styles.noResults}>No results found.</p>
      ) : (
        <>
          {/* Top Result Section */}
          {topResult && (
            <section className={styles.topResultSection}>
              <h2 className={styles.sectionTitle}>Top Result</h2>
              <div className={styles.topResultCard} onClick={() => playTrack(topResult)}>
                <img
                  src={topResult.cover}
                  alt={topResult.title}
                  className={styles.topResultImage}
                />
                <div className={styles.topResultInfo}>
                  <h3 className={styles.topResultTitle}>{topResult.title}</h3>
                  <p className={styles.topResultArtist}>
                    {typeof topResult.artist === 'string' ? topResult.artist : topResult.artist?.name}
                  </p>
                  <span className={styles.topResultTag}>Song</span>
                </div>
                <button className={styles.topResultPlayButton}>
                  {isTopResultPlaying ? (
                    <Pause size={28} fill="black" />
                  ) : (
                    <Play size={28} fill="black" />
                  )}
                </button>
              </div>
            </section>
          )}

          {/* Songs Section (horizontal scroll) */}
          {otherSongs.length > 0 && (
            <ScrollableSection title="Songs">
              {otherSongs.map(song => (
                <PlaylistCard
                  key={song.deezerId}
                  song={song}
                  onClick={() => playTrack(song)}
                />
              ))}
            </ScrollableSection>
          )}

          {/* Playlists Section (horizontal scroll) */}
          {playlistResults.length > 0 && (
            <ScrollableSection title="Playlists">
              {playlistResults.map(playlist => (
                <PlaylistCardSimple
                  key={playlist._id}
                  playlist={playlist}
                />
              ))}
            </ScrollableSection>
          )}
        </>
      )}
    </div>
  );
}

export default SearchPage;
