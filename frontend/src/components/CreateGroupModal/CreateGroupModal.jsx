import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Camera, Check, Users } from 'lucide-react'
import styles from './CreateGroupModal.module.css'

function CreateGroupModal({ isOpen, onClose, friends, onCreateGroup }) {
    const [groupName, setGroupName] = useState('')
    const [selectedMembers, setSelectedMembers] = useState([])
    const [imagePreview, setImagePreview] = useState(null)
    const [imageFile, setImageFile] = useState(null)
    const [isCreating, setIsCreating] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const fileInputRef = useRef(null)

    if (!isOpen) return null

    const filteredFriends = friends.filter(friend =>
        friend.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const toggleMember = (friend) => {
        setSelectedMembers(prev => {
            if (prev.some(m => m.id === friend.id)) {
                return prev.filter(m => m.id !== friend.id)
            }
            return [...prev, friend]
        })
    }

    const handleSubmit = async () => {
        if (!groupName.trim()) return

        setIsCreating(true)
        try {
            await onCreateGroup({
                name: groupName.trim(),
                memberIds: selectedMembers.map(m => m.dbId),
                imageFile,
            })
            // Reset state before closing
            setGroupName('')
            setSelectedMembers([])
            setImagePreview(null)
            setImageFile(null)
            setSearchQuery('')
            onClose()
        } catch (error) {
            console.error('Error creating group:', error)
        } finally {
            setIsCreating(false)
        }
    }

    const handleClose = () => {
        setGroupName('')
        setSelectedMembers([])
        setImagePreview(null)
        setImageFile(null)
        setSearchQuery('')
        onClose()
    }

    return createPortal(
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2><Users size={24} /> Create Group</h2>
                    <button className={styles.closeBtn} onClick={handleClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.content}>
                    {/* Group Image */}
                    <div
                        className={styles.imageUpload}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {imagePreview ? (
                            <img src={imagePreview} alt="Group" className={styles.previewImage} />
                        ) : (
                            <div className={styles.imagePlaceholder}>
                                <Camera size={32} />
                                <span>Add Photo</span>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            hidden
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                    </div>

                    {/* Group Name */}
                    <div className={styles.inputGroup}>
                        <label>Group Name</label>
                        <input
                            type="text"
                            placeholder="Enter group name"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            maxLength={50}
                        />
                    </div>

                    {/* Member Selection */}
                    <div className={styles.memberSection}>
                        <label>Add Members ({selectedMembers.length} selected)</label>
                        <input
                            type="text"
                            placeholder="Search friends..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                        <div className={styles.friendsList}>
                            {filteredFriends.length === 0 ? (
                                <div className={styles.emptyState}>
                                    {searchQuery ? 'No friends found' : 'No friends to add'}
                                </div>
                            ) : (
                                filteredFriends.map(friend => {
                                    const isSelected = selectedMembers.some(m => m.id === friend.id)
                                    return (
                                        <div
                                            key={friend.id}
                                            className={`${styles.friendItem} ${isSelected ? styles.selected : ''}`}
                                            onClick={() => toggleMember(friend)}
                                        >
                                            <div className={styles.friendInfo}>
                                                {friend.avatar ? (
                                                    <img src={friend.avatar} alt={friend.name} className={styles.avatar} />
                                                ) : (
                                                    <div className={styles.avatarPlaceholder}>
                                                        {friend.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className={styles.friendName}>{friend.name}</span>
                                            </div>
                                            <div className={`${styles.checkbox} ${isSelected ? styles.checked : ''}`}>
                                                {isSelected && <Check size={14} />}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={handleClose}>
                        Cancel
                    </button>
                    <button
                        className={styles.createBtn}
                        onClick={handleSubmit}
                        disabled={!groupName.trim() || isCreating}
                    >
                        {isCreating ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default CreateGroupModal
