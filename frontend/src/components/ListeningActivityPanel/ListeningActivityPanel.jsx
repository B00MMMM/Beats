import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { MoreVertical, Play, Pause, User } from 'lucide-react'; // Added icons
import axios from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { usePlayer } from '../../context/PlayerContext';
import styles from './ListeningActivityPanel.module.css';

function ListeningActivityPanel() {
  const { getToken, userId } = useAuth();
  const { socket } = useSocket();
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = usePlayer();

  const [friendsActivity, setFriendsActivity] = useState([]);
  const [isShared, setIsShared] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Fetch initial state
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      try {
        const token = await getToken();

        // Fetch privacy setting (we might need a specific endpoint or just infer from toggle)
        // For now, let's assume default true or fetch user profile if needed. 
        // Actually, let's allow the user to toggle, defaulting to true locally if unknown, 
        // or better, fetch 'me' to get the setting.
        // Assuming we rely on local toggle for now or add 'me' endpoint later. 
        // Let's just fetch friends activity.

        const res = await axios.get('/users/activity/friends', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFriendsActivity(res.data);

      } catch (error) {
        console.error("Error fetching activity:", error);
      }
    };

    fetchData();
  }, [userId]);

  // Socket Listener
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      // data = { userId, name, avatar, activity }
      setFriendsActivity(prev => {
        const idx = prev.findIndex(f => f.userId === data.userId);
        if (data.activity && data.activity.songId && data.activity.title) {
          // Update or Add only if activity has valid data
          if (idx !== -1) {
            const newArr = [...prev];
            newArr[idx] = { ...newArr[idx], activity: data.activity };
            return newArr;
          } else {
            // Friend is now playing - add them back to the list
            return [...prev, {
              userId: data.userId,
              name: data.name,
              avatar: data.avatar,
              activity: data.activity
            }];
          }
        } else {
          // Remove activity (user paused or stopped)
          return prev.filter(f => f.userId !== data.userId);
        }
      });
    };

    socket.on('friend-activity-updated', handleUpdate);

    return () => {
      socket.off('friend-activity-updated', handleUpdate);
    };
  }, [socket]);

  const handleToggle = async () => {
    try {
      const token = await getToken();
      const res = await axios.post('/users/activity/toggle', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsShared(res.data.isActivityShared);
    } catch (error) {
      console.error("Error toggling:", error);
    }
  };

  const handlePlayFriendSong = (e, activity) => {
    e.stopPropagation();
    if (!activity || !activity.songId) return;

    // Construct track object
    const track = {
      deezerId: activity.songId,
      title: activity.title,
      artist: activity.artist,
      cover: activity.cover,
      // ... other fields potentially missing but enriched by player
    };
    playTrack(track);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Friend Activity</span>
        <div className={styles.toggleContainer} onClick={handleToggle} title="Share my activity">
          <div className={`${styles.toggle} ${isShared ? styles.active : ''}`}>
            <div className={styles.thumb} />
          </div>
        </div>
      </div>

      <div className={styles.list}>
        {friendsActivity.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>It's too quiet...</p>
            <p className={styles.emptyText}>
              When friends listen to music, their activity will show up here.
            </p>
          </div>
        ) : (
          friendsActivity.map(friend => (
            <div
              key={friend.userId}
              className={`${styles.activityCard} ${expandedId === friend.userId ? styles.expanded : ''}`}
              onClick={() => toggleExpand(friend.userId)}
            >
              <div className={styles.cardHeader}>
                <div className={styles.avatar}>
                  {friend.avatar ? (
                    <img src={friend.avatar} alt={friend.name} />
                  ) : (
                    <div className={styles.avatarPlaceholder}>{friend.name[0]}</div>
                  )}
                </div>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{friend.name}</div>
                  <div className={styles.songInfo}>
                    <span className={styles.listeningTo}>Listening to</span>
                    <span className={styles.songTitle}>{friend.activity.title}</span>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedId === friend.userId && (
                <div className={styles.expandedContent}>
                  <div className={styles.coverArt}>
                    <img src={friend.activity.cover || "/default-music.png"} alt="Cover" />
                    <button
                      className={styles.playButton}
                      onClick={(e) => handlePlayFriendSong(e, friend.activity)}
                    >
                      <Play size={20} fill="currentColor" />
                    </button>
                  </div>
                  <div className={styles.expandedDetails}>
                    <span className={styles.expandedArtist}>{friend.activity.artist}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ListeningActivityPanel
