import { X, UserPlus, Settings, LogOut, Crown, UserMinus, Shield, ShieldOff, Edit2, Upload } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './GroupSettingsModal.module.css';

function GroupSettingsModal({ isOpen, onClose, group, currentUser, friends, onAddMember, onRemoveMember, onPromoteAdmin, onDemoteAdmin, onUpdateName, onUpdateImage, onLeaveGroup }) {
    const [activeTab, setActiveTab] = useState('members');
    const [showAddMember, setShowAddMember] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [newGroupName, setNewGroupName] = useState(group?.name || '');
    const [selectedImage, setSelectedImage] = useState(null);

    if (!isOpen || !group) return null;

    // Check if current user is admin
    const isAdmin = group.admins?.some(admin =>
        (admin._id || admin) === currentUser.dbId ||
        (admin.clerkId || admin) === currentUser.id
    );

    const isCreator = group.creatorId === currentUser.id;

    // Get friends who are not in the group
    const availableFriends = friends.filter(friend =>
        !group.members.some(member => member.clerkId === friend.id || member._id === friend.dbId)
    );

    const handleAddMember = (friend) => {
        onAddMember(friend.dbId);
        setShowAddMember(false);
    };

    const handleRemoveMember = (member) => {
        if (window.confirm(`Remove ${member.fullName} from the group?`)) {
            onRemoveMember(member._id);
        }
    };

    const handlePromoteAdmin = (member) => {
        onPromoteAdmin(member._id);
    };

    const handleDemoteAdmin = (member) => {
        if (window.confirm(`Remove ${member.fullName} as admin?`)) {
            onDemoteAdmin(member._id);
        }
    };

    const handleSaveName = () => {
        if (newGroupName.trim() && newGroupName !== group.name) {
            onUpdateName(newGroupName.trim());
        }
        setEditingName(false);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            onUpdateImage(file);
        }
    };

    const handleLeaveGroup = () => {
        if (window.confirm('Are you sure you want to leave this group?')) {
            onLeaveGroup();
            onClose();
        }
    };

    const isMemberAdmin = (member) => {
        return group.admins?.some(admin =>
            (admin._id || admin) === member._id ||
            (admin.clerkId || admin) === member.clerkId
        );
    };

    return createPortal(
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Group Settings</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'members' ? styles.active : ''}`}
                        onClick={() => setActiveTab('members')}
                    >
                        Members ({group.members?.length || 0})
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        Settings
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {activeTab === 'members' ? (
                        <div className={styles.membersTab}>
                            {isAdmin && (
                                <button
                                    className={styles.addMemberBtn}
                                    onClick={() => setShowAddMember(!showAddMember)}
                                >
                                    <UserPlus size={18} />
                                    Add Member
                                </button>
                            )}

                            {showAddMember && (
                                <div className={styles.addMemberSection}>
                                    <h4>Select Friend to Add</h4>
                                    {availableFriends.length === 0 ? (
                                        <p className={styles.emptyText}>All your friends are already in this group</p>
                                    ) : (
                                        <div className={styles.friendsList}>
                                            {availableFriends.map(friend => (
                                                <div key={friend.id} className={styles.friendItem}>
                                                    <img src={friend.avatar} alt={friend.name} className={styles.avatar} />
                                                    <span>{friend.name}</span>
                                                    <button
                                                        className={styles.addBtn}
                                                        onClick={() => handleAddMember(friend)}
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={styles.membersList}>
                                {group.members?.map(member => {
                                    const memberIsAdmin = isMemberAdmin(member);
                                    const memberIsCreator = member.clerkId === group.creatorId;
                                    const isCurrentUser = member.clerkId === currentUser.id;

                                    return (
                                        <div key={member._id} className={styles.memberItem}>
                                            <div className={styles.memberInfo}>
                                                <img src={member.imageUrl} alt={member.fullName} className={styles.avatar} />
                                                <div>
                                                    <div className={styles.memberName}>
                                                        {member.fullName}
                                                        {isCurrentUser && <span className={styles.youBadge}> (You)</span>}
                                                    </div>
                                                    {memberIsAdmin && (
                                                        <div className={styles.adminBadge}>
                                                            <Crown size={14} />
                                                            {memberIsCreator ? 'Creator' : 'Admin'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {isAdmin && !isCurrentUser && !memberIsCreator && (
                                                <div className={styles.memberActions}>
                                                    {memberIsAdmin ? (
                                                        <button
                                                            className={styles.actionBtn}
                                                            onClick={() => handleDemoteAdmin(member)}
                                                            title="Remove as admin"
                                                        >
                                                            <ShieldOff size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className={styles.actionBtn}
                                                            onClick={() => handlePromoteAdmin(member)}
                                                            title="Make admin"
                                                        >
                                                            <Shield size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.removeBtn}`}
                                                        onClick={() => handleRemoveMember(member)}
                                                        title="Remove from group"
                                                    >
                                                        <UserMinus size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className={styles.settingsTab}>
                            <div className={styles.settingItem}>
                                <label>Group Name</label>
                                {isAdmin ? (
                                    editingName ? (
                                        <div className={styles.editNameContainer}>
                                            <input
                                                type="text"
                                                value={newGroupName}
                                                onChange={(e) => setNewGroupName(e.target.value)}
                                                className={styles.nameInput}
                                                autoFocus
                                            />
                                            <button className={styles.saveBtn} onClick={handleSaveName}>
                                                Save
                                            </button>
                                            <button className={styles.cancelBtn} onClick={() => {
                                                setEditingName(false);
                                                setNewGroupName(group.name);
                                            }}>
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={styles.nameDisplay}>
                                            <span>{group.name}</span>
                                            <button
                                                className={styles.editBtn}
                                                onClick={() => setEditingName(true)}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    <span className={styles.nameDisplay}>{group.name}</span>
                                )}
                            </div>

                            <div className={styles.settingItem}>
                                <label>Group Image</label>
                                {isAdmin ? (
                                    <div className={styles.imageUpload}>
                                        <div className={styles.currentImage}>
                                            {group.imageUrl ? (
                                                <img src={group.imageUrl} alt={group.name} />
                                            ) : (
                                                <div className={styles.imagePlaceholder}>No Image</div>
                                            )}
                                        </div>
                                        <label className={styles.uploadBtn}>
                                            <Upload size={16} />
                                            Change Image
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                    </div>
                                ) : (
                                    <div className={styles.currentImage}>
                                        {group.imageUrl ? (
                                            <img src={group.imageUrl} alt={group.name} />
                                        ) : (
                                            <div className={styles.imagePlaceholder}>No Image</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className={styles.dangerZone}>
                                <button className={styles.leaveBtn} onClick={handleLeaveGroup}>
                                    <LogOut size={18} />
                                    Leave Group
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

export default GroupSettingsModal;
