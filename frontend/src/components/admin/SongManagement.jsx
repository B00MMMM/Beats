import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';
import { FiCheck, FiX, FiFilter, FiMusic, FiZap, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '@clerk/clerk-react';

const SongManagement = () => {
    const { getToken } = useAuth();
    const [songRequests, setSongRequests] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        minPlayCount: 1,
        sortBy: 'playCount',
        order: 'desc',
        page: 1
    });
    const [totalPages, setTotalPages] = useState(1);
    const [duplicates, setDuplicates] = useState([]);
    const [showDuplicates, setShowDuplicates] = useState(false);

    useEffect(() => {
        fetchSongRequests();
        fetchStats();
    }, [filters]);

    const fetchSongRequests = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            const response = await axiosInstance.get('/admin/song-requests', {
                params: { ...filters, limit: 20 },
                headers: { Authorization: `Bearer ${token}` }
            });
            setSongRequests(response.data.requests);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error('Failed to fetch song requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = await getToken();
            const response = await axiosInstance.get('/admin/song-stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch song stats:', error);
        }
    };

    const fetchDuplicates = async () => {
        try {
            const token = await getToken();
            const response = await axiosInstance.get('/admin/song-duplicates', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDuplicates(response.data.duplicates);
        } catch (error) {
            console.error('Failed to fetch duplicates:', error);
        }
    };

    const handleSongAction = async (songId, isChecked, priority = 'medium') => {
        try {
            const token = await getToken();
            await axiosInstance.put(`/admin/song-requests/${songId}`, {
                isChecked,
                priority
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchSongRequests();
            fetchStats();
        } catch (error) {
            console.error('Failed to update song:', error);
        }
    };

    const handleMergeDuplicates = async (keepId, mergeIds) => {
        try {
            const token = await getToken();
            await axiosInstance.post('/admin/song-duplicates/merge', {
                keepId,
                mergeIds
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchDuplicates();
            fetchSongRequests();
            fetchStats();
        } catch (error) {
            console.error('Failed to merge duplicates:', error);
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getPriorityColor = (priority) => {
        const colors = {
            low: 'text-zinc-400',
            medium: 'text-blue-400',
            high: 'text-orange-400',
            urgent: 'text-red-400'
        };
        return colors[priority] || 'text-zinc-400';
    };

    if (loading && !songRequests.length) return <div className="p-8 text-zinc-400">Loading songs...</div>;

    return (
        <div className="management-container">
            <div className="management-header">
                <h1 className="management-title">Song Requests</h1>
                <button
                    onClick={() => {
                        setShowDuplicates(!showDuplicates);
                        if (!showDuplicates) fetchDuplicates();
                    }}
                    className={`btn ${showDuplicates
                        ? 'btn-danger'
                        : 'btn-secondary'
                        }`}
                >
                    {showDuplicates ? 'Back to Requests' : 'Check Duplicates'}
                </button>
            </div>

            {/* Stats Overview */}
            {stats && !showDuplicates && (
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="stats-card">
                        <h3 className="stats-label">Total</h3>
                        <p className="stats-value">{stats.totalRequests}</p>
                    </div>
                    <div className="stats-card">
                        <h3 className="stats-label">Pending</h3>
                        <p className="stats-value text-orange-400">{stats.pendingRequests}</p>
                    </div>
                    <div className="stats-card">
                        <h3 className="stats-label">Checked</h3>
                        <p className="stats-value text-emerald-400">{stats.checkedRequests}</p>
                    </div>
                    <div className="stats-card">
                        <h3 className="stats-label">High Prio</h3>
                        <p className="stats-value text-red-400">{stats.highPriorityRequests}</p>
                    </div>
                    <div className="stats-card">
                        <h3 className="stats-label">Pop. Songs</h3>
                        <p className="stats-value text-blue-400">{stats.popularSongs}</p>
                    </div>
                </div>
            )}

            {showDuplicates ? (
                // Duplicates View
                <div className="recent-activity-section">
                    <h2 className="section-title">Potential Duplicates</h2>
                    {duplicates.length === 0 ? (
                        <p className="text-zinc-400">No duplicates found.</p>
                    ) : (
                        <div className="activity-list">
                            {duplicates.map((group, idx) => (
                                <div key={idx} className="activity-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                    <h3 className="font-bold text-zinc-200 mb-2">"{group._id.title}" by {group._id.artist}</h3>
                                    <div className="space-y-2">
                                        {group.songs.map(song => (
                                            <div key={song._id} className="flex justify-between items-center bg-zinc-800 p-2 rounded">
                                                <div className="text-sm">
                                                    <span className="text-zinc-300">{song.title}</span>
                                                    <span className="text-zinc-500 ml-2">({song.playCount} plays)</span>
                                                </div>
                                                <button
                                                    onClick={() => handleMergeDuplicates(song._id, group.songs.filter(s => s._id !== song._id).map(s => s._id))}
                                                    className="btn btn-secondary text-xs"
                                                >
                                                    Keep & Merge Others
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Filters */}
                    <div className="filters-container">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                            className="filter-select"
                        >
                            <option value="all">All Songs</option>
                            <option value="pending">Pending Review</option>
                            <option value="checked">Checked</option>
                        </select>
                        <select
                            value={filters.sortBy}
                            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value, page: 1 })}
                            className="filter-select"
                        >
                            <option value="playCount">Play Count</option>
                            <option value="lastPlayed">Last Played</option>
                            <option value="createdAt">Date Added</option>
                        </select>
                        <select
                            value={filters.order}
                            onChange={(e) => setFilters({ ...filters, order: e.target.value, page: 1 })}
                            className="filter-select"
                        >
                            <option value="desc">Desc</option>
                            <option value="asc">Asc</option>
                        </select>
                        <input
                            type="number"
                            min="1"
                            value={filters.minPlayCount}
                            onChange={(e) => setFilters({ ...filters, minPlayCount: e.target.value, page: 1 })}
                            className="filter-input"
                            placeholder="Min Plays"
                        />
                    </div>

                    {/* Table */}
                    <div className="table-container">
                        <div className="table-responsive">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Song</th>
                                        <th>Stats</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {songRequests.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="no-data-cell">
                                                No songs found matching filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        songRequests.map((song) => (
                                            <tr key={song._id}>
                                                <td>
                                                    <div className="song-info">
                                                        <img
                                                            src={song.imageUrl || 'https://via.placeholder.com/40'}
                                                            alt={song.title}
                                                            className="song-image"
                                                        />
                                                        <div className="song-details">
                                                            <div className="song-title" title={song.title}>
                                                                {song.title}
                                                            </div>
                                                            <div className="song-artist" title={song.artist}>
                                                                {song.artist}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="stat-value">
                                                        <span className="stat-highlight">{song.playCount}</span> plays
                                                    </div>
                                                    <div className="stat-sub">
                                                        {formatDuration(song.duration)}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${song.isChecked
                                                        ? 'bg-emerald-900/30 text-emerald-400 ring-1 ring-emerald-500/50'
                                                        : 'bg-orange-900/30 text-orange-400 ring-1 ring-orange-500/50'
                                                        }`}>
                                                        {song.isChecked ? 'Checked' : 'Pending'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <select
                                                        value={song.priority}
                                                        onChange={(e) => handleSongAction(song._id, song.isChecked, e.target.value)}
                                                        className={`bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer ${getPriorityColor(song.priority)}`}
                                                        style={{ background: 'transparent', border: 'none' }}
                                                    >
                                                        <option value="low" className="bg-zinc-800 text-zinc-400">Low</option>
                                                        <option value="medium" className="bg-zinc-800 text-blue-400">Medium</option>
                                                        <option value="high" className="bg-zinc-800 text-orange-400">High</option>
                                                        <option value="urgent" className="bg-zinc-800 text-red-400">Urgent</option>
                                                    </select>
                                                </td>
                                                <td className="text-right">
                                                    <button
                                                        onClick={() => handleSongAction(song._id, !song.isChecked, song.priority)}
                                                        className={`action-btn ${song.isChecked ? 'checked' : 'pending'}`}
                                                        title={song.isChecked ? "Mark as Pending" : "Mark as Checked"}
                                                    >
                                                        {song.isChecked ? <FiRefreshCw className="w-4 h-4" /> : <FiCheck className="w-4 h-4" />}
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
                                    onClick={() => setFilters({ ...filters, page: Math.max(filters.page - 1, 1) })}
                                    disabled={filters.page === 1}
                                    className="btn-pagination"
                                >
                                    Previous
                                </button>
                                <span className="pagination-text">
                                    Page {filters.page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setFilters({ ...filters, page: Math.min(filters.page + 1, totalPages) })}
                                    disabled={filters.page === totalPages}
                                    className="btn-pagination"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default SongManagement;
