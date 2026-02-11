import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Pause, Play, Heart, MoreVertical, Edit2, Camera, Search, Plus, X, Trash2, Globe, Lock, Share2 } from 'lucide-react'
import SongRow from '../components/SongRow/SongRow'
import SharePlaylistModal from '../components/SharePlaylistModal/SharePlaylistModal'
import styles from './PlaylistPage.module.css'
import { useAuth } from '@clerk/clerk-react'
import axios from '../api/axios'
import { usePlayer } from '../context/PlayerContext'
import Loader from '../components/Loader/Loader'
import centeredLoaderStyles from '../components/Loader/CenteredLoader.module.css'

function PlaylistPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getToken, userId } = useAuth()
  const { playTrack, playPlaylist, currentTrack, isPlaying, togglePlayPause, likedSongs, toggleLike, fetchPlaylists } = usePlayer()

  const [playlist, setPlaylist] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // Dropdown and modal state
  const [showDropdown, setShowDropdown] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  const fileInputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetchPlaylist()
  }, [id])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchPlaylist = async () => {
    try {
      setIsLoading(true)
      const token = await getToken()
      const response = await axios.get(`/playlists/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPlaylist(response.data)
      setEditTitle(response.data.title)
      setEditDesc(response.data.description)
    } catch (error) {
      console.error("Error fetching playlist:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePlaylist = async () => {
    try {
      const token = await getToken()
      await axios.put(`/playlists/${id}`,
        { title: editTitle, description: editDesc },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPlaylist(prev => ({ ...prev, title: editTitle, description: editDesc }))
      setIsEditing(false)
      fetchPlaylists(); // Refresh Sidebar
    } catch (error) {
      console.error("Error updating playlist:", error)
    }
  }

  const handleToggleAvailability = async () => {
    const newAvailability = playlist.availability === 'public' ? 'private' : 'public'
    try {
      const token = await getToken()
      await axios.put(`/playlists/${id}`,
        { availability: newAvailability },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setPlaylist(prev => ({ ...prev, availability: newAvailability }))
    } catch (error) {
      console.error("Error updating availability:", error)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('image', file)

      const token = await getToken()
      const response = await axios.put(`/playlists/${id}/image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      setPlaylist(prev => ({ ...prev, imageUrl: response.data.imageUrl }))
      fetchPlaylists(); // Refresh Sidebar
    } catch (error) {
      console.error("Error uploading image:", error)
    }
  }

  const handleSearch = async (e) => {
    const query = e.target.value
    setSearchQuery(query)

    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      setIsSearching(true)
      const response = await axios.get(`/songs/search?q=${encodeURIComponent(query)}`)
      setSearchResults(response.data)
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddSong = async (song) => {
    try {
      const token = await getToken()
      const response = await axios.post(`/playlists/${id}/songs`,
        { songData: song },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      // Refresh playlist or append locally
      // Ensure we format the song correctly for the list
      const newSong = { ...response.data.song, addedAt: new Date().toISOString() }
      setPlaylist(prev => ({
        ...prev,
        songs: [...prev.songs, newSong]
      }))
    } catch (error) {
      console.error("Error adding song:", error)
    }
  }

  const handleRemoveSong = async (songId) => {
    try {
      const token = await getToken();
      await axios.delete(`/playlists/${id}/songs/${songId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlaylist(prev => ({
        ...prev,
        songs: prev.songs.filter(s => s._id !== songId)
      }));
    } catch (error) {
      console.error("Error removing song:", error);
    }
  }

  const handleDeletePlaylist = async () => {
    try {
      setDeleting(true)
      const token = await getToken()
      await axios.delete(`/playlists/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchPlaylists() // Refresh sidebar
      navigate('/') // Navigate to home
    } catch (error) {
      console.error("Error deleting playlist:", error)
      alert('Failed to delete playlist')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (isLoading) return <div className={styles.loading}>Loading...</div>
  if (!playlist) return <div className={styles.error}>Playlist not found</div>

  const isOwner = userId === playlist.userId;

  return (
    <div className={styles.playlistPage}>
      <div className={styles.mainContent}>
        <div className={styles.playlistHeader}>
          <div
            className={`${styles.coverContainer} ${isOwner ? styles.editable : ''}`}
            onClick={() => isOwner && fileInputRef.current?.click()}
          >
            {playlist.imageUrl ? (
              <img src={playlist.imageUrl} alt={playlist.title} className={styles.cover} />
            ) : (
              <div className={styles.placeholderCover}>
                <Camera size={48} />
              </div>
            )}
            {isOwner && (
              <div className={styles.coverOverlay}>
                <Edit2 size={24} />
                <span>Choose photo</span>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              hidden
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>

          <div className={styles.playlistInfo}>
            <div className={styles.typeRow}>
              <span className={styles.type}>
                {playlist.availability === 'public' ? <Globe size={14} /> : <Lock size={14} />}
                {playlist.availability === 'public' ? 'Public Playlist' : 'Private Playlist'}
              </span>
              {userId === playlist.userId && (
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={playlist.availability === 'public'}
                    onChange={handleToggleAvailability}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              )}
            </div>
            {isEditing && isOwner ? (
              <div className={styles.editForm}>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={styles.titleInput}
                  autoFocus
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className={styles.descInput}
                  placeholder="Add an optional description"
                />
                <div className={styles.editActions}>
                  <button onClick={handleUpdatePlaylist}>Save</button>
                  <button onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h1
                  className={`${styles.playlistName} ${isOwner ? styles.editable : ''}`}
                  onClick={() => isOwner && setIsEditing(true)}
                >
                  {playlist.title}
                </h1>
                <p
                  className={`${styles.description} ${isOwner ? styles.editable : ''}`}
                  onClick={() => isOwner && setIsEditing(true)}
                >
                  {playlist.description || (isOwner ? "Add a description" : "No description")}
                </p>
              </>
            )}

            <div className={styles.meta}>
              <div className={styles.userIcon}>
                <User size={16} /> {/* Placeholder for user avatar */}
              </div>
              <span className={styles.username}>User</span> {/* We could fetch creator name if needed */}
              <span className={styles.stats}>• {playlist.songs?.length || 0} songs</span>
            </div>
          </div>
        </div>

        <div className={styles.actionsBar}>
          <button className={styles.playButtonMain} onClick={() => playlist.songs?.[0] && playPlaylist(playlist.songs, 0)}>
            {isPlaying && currentTrack?.deezerId === playlist.songs?.[0]?.deezerId ? (
              <Pause size={28} fill="black" />
            ) : (
              <Play size={28} fill="black" />
            )}
          </button>
          {isOwner && (
            <div className={styles.dropdownContainer} ref={dropdownRef}>
              <button
                className={styles.iconButton}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <MoreVertical size={32} />
              </button>
              {showDropdown && (
                <div className={styles.dropdown}>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      setShowShareModal(true)
                      setShowDropdown(false)
                    }}
                  >
                    <Share2 size={18} />
                    Share Playlist
                  </button>
                  <button
                    className={`${styles.dropdownItem} ${styles.danger}`}
                    onClick={() => {
                      setShowDeleteConfirm(true)
                      setShowDropdown(false)
                    }}
                  >
                    <Trash2 size={18} />
                    Delete Playlist
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.songsTable}>
          <div className={styles.tableHeader}>
            <div className={styles.headerNumber}>#</div>
            <div className={styles.headerTitle}>Title</div>
            <div className={styles.headerAlbum}>Artist</div>
            <div className={styles.headerDate}>Date Added</div>
            <div className={styles.headerDuration}>
              <ClockIcon />
            </div>
          </div>
          <div className={styles.tableBody}>
            {playlist.songs?.map((song, index) => (
              <div key={song._id || index} className={styles.songRowWrapper}>
                <SongRow
                  number={index + 1}
                  cover={song.cover || song.album?.cover_medium}
                  title={song.title}
                  artist={song.artist?.name}
                  dateAdded={song.addedAt ? new Date(song.addedAt).toLocaleDateString() : 'Just now'}
                  duration={formatDuration(song.duration)}
                  isPlaying={currentTrack?.deezerId === song.deezerId}
                  onPlay={() => playPlaylist(playlist.songs, index)}
                  isLiked={likedSongs.has(String(song.deezerId || song._id))}
                  onLike={() => toggleLike(song)}
                  onDelete={isOwner ? () => handleRemoveSong(song._id) : undefined}
                />
              </div>
            ))}
          </div>
        </div>

        {isOwner && (
          <div className={styles.searchSection}>
            <div className={styles.searchHeader}>
              <h2>Let's find something for your playlist</h2>
              <div className={styles.searchBar}>
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Search for songs"
                  value={searchQuery}
                  onChange={handleSearch}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}>
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>

            <div className={styles.searchResults}>
              {isSearching ? (
                <div className={centeredLoaderStyles.centeredLoaderContainer}>
                  <Loader />
                </div>
              ) : (
                searchResults.map(song => (
                  <div key={song.deezerId} className={styles.searchResultItem}>
                    <div className={styles.resultImageContainer} onClick={() => playTrack(song)}>
                      <img src={song.cover} alt={song.title} />
                      <div className={styles.resultPlayOverlay}>
                        <Play size={20} fill="white" />
                      </div>
                    </div>
                    <div className={styles.resultInfo}>
                      <span className={styles.resultTitle}>{song.title}</span>
                      <span className={styles.resultArtist}>{song.artist.name}</span>
                    </div>
                    <button className={styles.addButton} onClick={() => handleAddSong(song)}>
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className={styles.confirmOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <h3>Delete Playlist?</h3>
            <p>Are you sure you want to delete "{playlist.title}"? This action cannot be undone.</p>
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className={styles.deleteButton}
                onClick={handleDeletePlaylist}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <SharePlaylistModal
          playlist={playlist}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}

// Helpers
const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z" />
    <path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z" />
  </svg>
);

const User = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

export default PlaylistPage
