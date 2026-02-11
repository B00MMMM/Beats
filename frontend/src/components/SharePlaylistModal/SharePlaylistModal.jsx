import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Users, User, Check, Send, Loader } from 'lucide-react'
import styles from './SharePlaylistModal.module.css'
import { useAuth } from '@clerk/clerk-react'
import axios from '../../api/axios'

function SharePlaylistModal({ playlist, onClose }) {
    const { getToken } = useAuth()
    const [mode, setMode] = useState('groups') // 'groups' or 'individuals'
    const [groups, setGroups] = useState([])
    const [friends, setFriends] = useState([])
    const [selectedGroups, setSelectedGroups] = useState([])
    const [selectedIndividuals, setSelectedIndividuals] = useState([])
    const [loading, setLoading] = useState(true)
    const [sharing, setSharing] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchData()
    }, [mode])

    const fetchData = async () => {
        try {
            setLoading(true)
            const token = await getToken()

            if (mode === 'groups') {
                const response = await axios.get('/chat/groups', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setGroups(response.data || [])
            } else {
                const response = await axios.get('/chat/users', {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setFriends(response.data || [])
            }
        } catch (err) {
            console.error('Error fetching data:', err)
            setError('Failed to load ' + (mode === 'groups' ? 'groups' : 'friends'))
        } finally {
            setLoading(false)
        }
    }

    const toggleGroup = (groupId) => {
        setSelectedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        )
    }

    const toggleIndividual = (friendId) => {
        setSelectedIndividuals(prev =>
            prev.includes(friendId)
                ? prev.filter(id => id !== friendId)
                : [...prev, friendId]
        )
    }

    const handleShare = async () => {
        const selectedIds = mode === 'groups' ? selectedGroups : selectedIndividuals
        if (selectedIds.length === 0) return

        try {
            setSharing(true)
            setError('')
            const token = await getToken()

            await axios.post(`/playlists/${playlist._id}/share`, {
                type: mode,
                recipientIds: selectedIds
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })

            setSuccess(true)
            setTimeout(() => {
                onClose()
            }, 1500)
        } catch (err) {
            console.error('Error sharing playlist:', err)
            setError(err.response?.data?.message || 'Failed to share playlist')
        } finally {
            setSharing(false)
        }
    }

    if (success) {
        return createPortal(
            <div className={styles.modalOverlay} onClick={onClose}>
                <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.successContent}>
                        <Check size={64} className={styles.successIcon} />
                        <h2>Playlist Shared!</h2>
                        <p>Your playlist has been shared successfully</p>
                    </div>
                </div>
            </div>,
            document.body
        )
    }

    return createPortal(
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <X size={24} />
                </button>

                <div className={styles.modalHeader}>
                    <h2>Share Playlist</h2>
                    <p>{playlist.title} • {playlist.songs?.length || 0} songs</p>
                </div>

                <div className={styles.modeSwitcher}>
                    <button
                        className={`${styles.modeButton} ${mode === 'groups' ? styles.active : ''}`}
                        onClick={() => setMode('groups')}
                    >
                        <Users size={18} />
                        Groups
                    </button>
                    <button
                        className={`${styles.modeButton} ${mode === 'individuals' ? styles.active : ''}`}
                        onClick={() => setMode('individuals')}
                    >
                        <User size={18} />
                        Individuals
                    </button>
                </div>

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                <div className={styles.listContainer}>
                    {loading ? (
                        <div className={styles.loadingState}>
                            <Loader size={32} className={styles.spinner} />
                            <p>Loading...</p>
                        </div>
                    ) : mode === 'groups' ? (
                        groups.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Users size={48} />
                                <p>No groups found</p>
                            </div>
                        ) : (
                            groups.map(group => (
                                <div
                                    key={group._id}
                                    className={`${styles.listItem} ${selectedGroups.includes(group._id) ? styles.selected : ''}`}
                                    onClick={() => toggleGroup(group._id)}
                                >
                                    <div className={styles.itemInfo}>
                                        {group.imageUrl ? (
                                            <img src={group.imageUrl} alt={group.name} className={styles.avatar} />
                                        ) : (
                                            <div className={styles.avatarPlaceholder}>
                                                <Users size={20} />
                                            </div>
                                        )}
                                        <div className={styles.itemText}>
                                            <span className={styles.itemName}>{group.name}</span>
                                            <span className={styles.itemMeta}>{group.members?.length || 0} members</span>
                                        </div>
                                    </div>
                                    <div className={`${styles.checkbox} ${selectedGroups.includes(group._id) ? styles.checked : ''}`}>
                                        {selectedGroups.includes(group._id) && <Check size={16} />}
                                    </div>
                                </div>
                            ))
                        )
                    ) : (
                        friends.length === 0 ? (
                            <div className={styles.emptyState}>
                                <User size={48} />
                                <p>No friends found</p>
                            </div>
                        ) : (
                            friends.map(friend => (
                                <div
                                    key={friend._id}
                                    className={`${styles.listItem} ${selectedIndividuals.includes(friend._id) ? styles.selected : ''}`}
                                    onClick={() => toggleIndividual(friend._id)}
                                >
                                    <div className={styles.itemInfo}>
                                        {friend.imageUrl ? (
                                            <img src={friend.imageUrl} alt={friend.fullName} className={styles.avatar} />
                                        ) : (
                                            <div className={styles.avatarPlaceholder}>
                                                {friend.fullName?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className={styles.itemText}>
                                            <span className={styles.itemName}>{friend.fullName}</span>
                                            <span className={styles.itemMeta}>@{friend.clerkId}</span>
                                        </div>
                                    </div>
                                    <div className={`${styles.checkbox} ${selectedIndividuals.includes(friend._id) ? styles.checked : ''}`}>
                                        {selectedIndividuals.includes(friend._id) && <Check size={16} />}
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>

                <div className={styles.footer}>
                    <div className={styles.selectionCount}>
                        {mode === 'groups'
                            ? `${selectedGroups.length} group${selectedGroups.length !== 1 ? 's' : ''} selected`
                            : `${selectedIndividuals.length} friend${selectedIndividuals.length !== 1 ? 's' : ''} selected`
                        }
                    </div>
                    <button
                        className={styles.shareButton}
                        onClick={handleShare}
                        disabled={sharing || (mode === 'groups' ? selectedGroups.length === 0 : selectedIndividuals.length === 0)}
                    >
                        {sharing ? (
                            <>
                                <Loader size={18} className={styles.spinner} />
                                Sharing...
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                Share Playlist
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default SharePlaylistModal
