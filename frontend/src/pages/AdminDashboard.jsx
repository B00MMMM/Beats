import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminStats from '../components/admin/AdminStats';
import UserManagement from '../components/admin/UserManagement';
import PlanManagement from '../components/admin/PlanManagement';
import SongManagement from '../components/admin/SongManagement';
import AdminRoute from '../components/AdminRoute';
import axiosInstance from '../api/axios';

const AdminDashboard = () => {
    const { getToken } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = await getToken();
                if (!token) return;
                
                const response = await axiosInstance.get('/admin/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <AdminRoute>
            <div className="flex h-screen bg-black overflow-hidden">
                <AdminSidebar />

                <main className="flex-1 overflow-y-auto p-8 relative">
                    {/* Background gradient effect */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-900/10 via-black to-black pointer-events-none -z-10" />

                    <Routes>
                        <Route path="/" element={<AdminStats stats={stats} />} />
                        <Route path="/users" element={<UserManagement />} />
                        <Route path="/plans" element={<PlanManagement />} />
                        <Route path="/songs" element={<SongManagement />} />
                    </Routes>
                </main>
            </div>
        </AdminRoute>
    );
};

export default AdminDashboard;
