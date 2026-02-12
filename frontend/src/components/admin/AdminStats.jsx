import { useEffect, useState } from 'react';
import axiosInstance from '../../api/axios';
import { useAuth } from '@clerk/clerk-react';

const AdminStats = ({ stats: initialStats }) => {
    const { getToken } = useAuth();
    const [stats, setStats] = useState(initialStats);
    const [recentActivity, setRecentActivity] = useState([]);
    const [planStats, setPlanStats] = useState(null);
    const [loading, setLoading] = useState(!initialStats);

    useEffect(() => {
        const loadData = async () => {
            try {
                const token = await getToken();
                const [activityRes, planRes] = await Promise.all([
                    axiosInstance.get('/admin/activity', { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get('/admin/plan-stats', { headers: { Authorization: `Bearer ${token}` } })
                ]);

                setRecentActivity(activityRes.data);
                setPlanStats(planRes.data);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading && !stats) return <div className="p-8 text-zinc-400">Loading dashboard data...</div>;

    return (
        <div className="dashboard-container">
            <h1 className="dashboard-title">Dashboard Overview</h1>

            {/* Stats Cards */}
            {stats && (
                <div className="stats-grid">
                    <div className="stats-card">
                        <h3 className="stats-label">Total Users</h3>
                        <p className="stats-value">{stats.totalUsers}</p>
                    </div>

                    <div className="stats-card">
                        <h3 className="stats-label">Total Songs</h3>
                        <p className="stats-value">{stats.totalSongs}</p>
                    </div>

                    <div className="stats-card">
                        <h3 className="stats-label">Total Playlists</h3>
                        <p className="stats-value">{stats.totalPlaylists}</p>
                    </div>

                    <div className="stats-card">
                        <h3 className="stats-label">New Users (24h)</h3>
                        <p className="stats-value highlight">{stats.newUsersToday}</p>
                    </div>
                </div>
            )}

            {/* Premium Plan Overview */}
            {planStats && (
                <div className="premium-plans-section">
                    <h2 className="section-title">Premium Plans</h2>
                    <div className="plans-grid">
                        <div className="plan-stat-card pending">
                            <h3 className="plan-stat-label text-orange-400">Pending Requests</h3>
                            <p className="plan-stat-value text-orange-500">{planStats.pendingRequests}</p>
                        </div>
                        <div className="plan-stat-card">
                            <h3 className="plan-stat-label text-zinc-400">Iron Users</h3>
                            <p className="plan-stat-value text-zinc-200">{planStats.usersByPlan.iron}</p>
                        </div>
                        <div className="plan-stat-card gold">
                            <h3 className="plan-stat-label text-yellow-400">Gold Users</h3>
                            <p className="plan-stat-value text-yellow-500">{planStats.usersByPlan.gold}</p>
                        </div>
                        <div className="plan-stat-card diamond">
                            <h3 className="plan-stat-label text-blue-400">Diamond Users</h3>
                            <p className="plan-stat-value text-blue-500">{planStats.usersByPlan.diamond}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            <div className="recent-activity-section">
                <h2 className="section-title">Recent User Activity</h2>
                <div className="activity-list">
                    {recentActivity.length === 0 ? (
                        <p className="text-zinc-500">No recent activity found.</p>
                    ) : (
                        recentActivity.map((user, index) => (
                            <div key={index} className="activity-item">
                                <div className="user-info">
                                    <p className="user-name">{user.fullName}</p>
                                    <p className="user-joined">
                                        Joined {new Date(user.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                {user.currentActivity?.title ? (
                                    <div className="activity-status">
                                        <p className="listening-to">
                                            Listening to: {user.currentActivity.title}
                                        </p>
                                    </div>
                                ) : (
                                    <span className="offline">Offline</span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminStats;
