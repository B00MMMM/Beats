import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../api/axios';
import PlaylistCard from '../components/PlaylistCard/PlaylistCard';
import { usePlayer } from '../context/PlayerContext';
import Loader from '../components/Loader/Loader'; // Import the Loader component
import styles from './SearchPage.module.css';
import centeredLoaderStyles from '../components/Loader/CenteredLoader.module.css';

function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true); // Add loading state
  const { playTrack } = usePlayer();

  useEffect(() => {
    if (query) {
      const fetchSearch = async () => {
        try {
          setLoading(true); // Set loading to true before fetching
          const response = await axios.get(`/songs/search?q=${query}`);
          setResults(response.data);
        } catch (error) {
          console.error('Error fetching search results:', error);
        } finally {
          setLoading(false); // Set loading to false after fetching (or error)
        }
      };
      fetchSearch();
    } else {
      setResults([]); // Clear results if no query
      setLoading(false); // Set loading to false if no query
    }
  }, [query]);

  return (
    <div className={styles.searchPage}>
      <h1>Search Results for "{query}"</h1>
      <div className={styles.grid}>
        {loading ? ( // Conditionally render Loader
          <div className={centeredLoaderStyles.centeredLoaderContainer}>
            <Loader />
          </div>
        ) : results.length > 0 ? (
          results.map((song) => (
            <PlaylistCard
              key={song.deezerId}
              song={song}
              onClick={() => playTrack(song)}
            />
          ))
        ) : (
          <p>No results found.</p>
        )}
      </div>
    </div>
  );
}

export default SearchPage;
