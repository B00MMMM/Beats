import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';
import { FiTrash2, FiSearch } from 'react-icons/fi';
import { useAuth } from '@clerk/clerk-react';
import ConfirmPopup from '../ConfirmPopup/ConfirmPopup';

const UserManagement = () => {
    const { getToken } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Confirm Popup State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'default',
        confirmText: 'Confirm'
    });

    useEffect(() => {
        fetchUsers();
    }, [page, search]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search) setPage(1);
            fetchUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            const response = await axiosInstance.get('/admin/users', {
                params: { page, search, limit: 10 },
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data.users);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            const token = await getToken();
            await axiosInstance.put(`/admin/users/${userId}/role`, {
                role: newRole
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchUsers(); // Refresh the list
        } catch (error) {
            console.error('Failed to update role:', error);
        }
    };

    const handlePlanChange = async (userId, newPlan) => {
        try {
            const token = await getToken();
            await axiosInstance.put(`/admin/users/${userId}/plan`, {
                plan: newPlan
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchUsers(); // Refresh the list
        } catch (error) {
            console.error('Failed to update plan:', error);
        }
    };

    const handleDeleteUser = async (userId) => {
        setConfirmConfig({
            title: 'Delete User',
            message: 'Are you sure you want to delete this user? This action cannot be undone.',
            confirmText: 'Delete',
            type: 'danger',
            onConfirm: async () => {
                try {
                    const token = await getToken();
                    await axiosInstance.delete(`/admin/users/${userId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    fetchUsers(); // Refresh the list
                } catch (error) {
                    console.error('Failed to delete user:', error);
                }
            }
        });
        setConfirmOpen(true);
    };

    return (
        <div className="management-container">
            <div className="management-header">
                <h1 className="management-title">User Management</h1>
            </div>

            {/* Search */}
            <div className="filters-container" style={{ display: 'block' }}>
                <div style={{ position: 'relative' }}>
                    <FiSearch className="sidebar-icon" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-zinc-400)' }} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="filter-input"
                        style={{ width: '100%', paddingLeft: '2.5rem' }}
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="table-container">
                <div className="table-responsive">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Plan</th>
                                <th>Joined</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="no-data-cell">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user._id}>
                                        <td>
                                            <div className="song-info">
                                                <img
                                                    src={user.imageUrl}
                                                    alt={user.fullName}
                                                    className="song-image"
                                                    style={{ borderRadius: '50%' }}
                                                />
                                                <div className="song-details" style={{ marginLeft: '1rem' }}>
                                                    <div className="song-title">
                                                        {user.fullName}
                                                    </div>
                                                    <div className="song-artist">
                                                        {user.uniqueId || user.clerkId}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                className="filter-select"
                                                style={{ width: '100%' }}
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                value={user.plan}
                                                onChange={(e) => handlePlanChange(user._id, e.target.value)}
                                                className="filter-select"
                                                style={{ width: '100%' }}
                                            >
                                                <option value="iron">Iron</option>
                                                <option value="gold">Gold</option>
                                                <option value="diamond">Diamond</option>
                                            </select>
                                        </td>
                                        <td style={{ color: 'var(--color-zinc-400)', fontSize: '0.875rem' }}>
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="text-right">
                                            <button
                                                onClick={() => handleDeleteUser(user._id)}
                                                className="action-btn"
                                                style={{ color: 'var(--color-red-400)', backgroundColor: 'transparent' }}
                                                title="Delete User"
                                            >
                                                <FiTrash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination-container">
                        <button
                            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                            disabled={page === 1}
                            className="btn-pagination"
                        >
                            Previous
                        </button>
                        <span className="pagination-text">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={page === totalPages}
                            className="btn-pagination"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            <ConfirmPopup
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                {...confirmConfig}
            />
        </div>
    );
};

export default UserManagement;
