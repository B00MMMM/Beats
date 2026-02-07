import React, { useState, useEffect } from 'react';
import { Search, Music, Disc, PlayCircle, Plus } from 'lucide-react';
import axios from '../../api/axios';
import { useAuth } from '@clerk/clerk-react';
import styles from './MusicPicker.module.css';

const MusicPicker = ({ onSelect, onClose }) => {
    const { getToken } = useAuth();
    const [activeTab, setActiveTab] = useState('favorites'); // 'favorites' or 'playlists'
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            try {
                const token = await getToken();
                let data = [];

                if (activeTab === 'favorites') {
                    const response = await axios.get('/users/favorites', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    data = response.data.map(song => ({ ...song, type: 'song' }));
                } else {
                    const response = await axios.get('/playlists/my', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    data = response.data.map(playlist => ({ ...playlist, type: 'playlist' }));
                }

                setItems(data);
            } catch (error) {
                console.error("Error fetching music items:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchItems();
    }, [activeTab, getToken]);

    const filteredItems = items.filter(item =>
        (item.title || item.name).toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3>Share Music</h3>
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'favorites' ? styles.active : ''}`}
                            onClick={() => setActiveTab('favorites')}
                        >
                            Favorites
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'playlists' ? styles.active : ''}`}
                            onClick={() => setActiveTab('playlists')}
                        >
                            Playlists
                        </button>
                    </div>
                </div>

                <div className={styles.searchBox}>
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className={styles.list}>
                    {loading ? (
                        <div className={styles.loading}>Loading...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className={styles.empty}>No items found</div>
                    ) : (
                        filteredItems.map(item => (
                            <div key={item._id} className={styles.item}>
                                <img
                                    src={item.imageUrl || item.albumImage || "/default-music.png"}
                                    alt={item.title || item.name}
                                    className={styles.itemImage}
                                />
                                <div className={styles.itemInfo}>
                                    <div className={styles.itemTitle}>{item.title || item.name}</div>
                                    <div className={styles.itemSub}>{item.artist || "Playlist"}</div>
                                </div>
                                <button
                                    className={styles.sendBtn}
                                    onClick={() => onSelect(item)}
                                >
                                    <Plus size={16} /> Send
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default MusicPicker;
