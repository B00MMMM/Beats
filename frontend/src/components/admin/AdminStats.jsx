import { useEffect, useState } from 'react';
import axiosInstance from '../../api/axios';

const AdminStats = ({ stats: initialStats }) => {
    const [stats, setStats] = useState(initialStats);
    const [recentActivity, setRecentActivity] = useState([]);
    const [planStats, setPlanStats] = useState(null);
    const [loading, setLoading] = useState(!initialStats);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [activityRes, planRes] = await Promise.all([
                    axiosInstance.get('/api/admin/activity'),
                    axiosInstance.get('/api/admin/plan-stats')
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
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 shadow-lg">
                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Total Users</h3>
                        <p className="text-3xl font-bold text-white mt-2">{stats.totalUsers}</p>
                    </div>

                    <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 shadow-lg">
                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Total Songs</h3>
                        <p className="text-3xl font-bold text-white mt-2">{stats.totalSongs}</p>
                    </div>

                    <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 shadow-lg">
                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Total Playlists</h3>
                        <p className="text-3xl font-bold text-white mt-2">{stats.totalPlaylists}</p>
                    </div>

                    <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 shadow-lg">
                        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">New Users (24h)</h3>
                        <p className="text-3xl font-bold text-emerald-400 mt-2">{stats.newUsersToday}</p>
                    </div>
                </div>
            )}

            {/* Premium Plan Overview */}
            {planStats && (
                <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 shadow-lg">
                    <h2 className="text-xl font-bold text-white mb-6">Premium Plans</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-orange-900/20 border border-orange-900/50 rounded-lg">
                            <h3 className="text-sm font-medium text-orange-400">Pending Requests</h3>
                            <p className="text-2xl font-bold text-orange-500 mt-1">{planStats.pendingRequests}</p>
                        </div>
                        <div className="text-center p-4 bg-zinc-700/30 rounded-lg">
                            <h3 className="text-sm font-medium text-zinc-400">Iron Users</h3>
                            <p className="text-2xl font-bold text-zinc-200 mt-1">{planStats.usersByPlan.iron}</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-900/20 border border-yellow-900/50 rounded-lg">
                            <h3 className="text-sm font-medium text-yellow-400">Gold Users</h3>
                            <p className="text-2xl font-bold text-yellow-500 mt-1">{planStats.usersByPlan.gold}</p>
                        </div>
                        <div className="text-center p-4 bg-blue-900/20 border border-blue-900/50 rounded-lg">
                            <h3 className="text-sm font-medium text-blue-400">Diamond Users</h3>
                            <p className="text-2xl font-bold text-blue-500 mt-1">{planStats.usersByPlan.diamond}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-6">Recent User Activity</h2>
                <div className="space-y-4">
                    {recentActivity.length === 0 ? (
                        <p className="text-zinc-500">No recent activity found.</p>
                    ) : (
                        recentActivity.map((user, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg hover:bg-zinc-900 transition-colors">
                                <div>
                                    <p className="font-medium text-zinc-200">{user.fullName}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        Joined {new Date(user.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                {user.currentActivity?.title ? (
                                    <div className="text-right">
                                        <p className="text-sm text-emerald-400 font-medium truncate max-w-[200px]">
                                            Listening to: {user.currentActivity.title}
                                        </p>
                                    </div>
                                ) : (
                                    <span className="text-xs text-zinc-600 italic">Offline</span>
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
