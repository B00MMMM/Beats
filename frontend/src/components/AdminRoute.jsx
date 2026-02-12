import { useUser, useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axiosInstance from '../api/axios';

const AdminRoute = ({ children }) => {
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                const token = await getToken();
                if (!token) {
                    setIsAdmin(false);
                    setLoading(false);
                    return;
                }
                
                const response = await axiosInstance.get('/admin/verify', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setIsAdmin(response.data.isAdmin);
            } catch (error) {
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        if (isLoaded && user) {
            checkAdminStatus();
        } else if (isLoaded) {
            setLoading(false);
        }
    }, [user, isLoaded]);

    if (!isLoaded || loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />; // Redirect to home if not admin
    }

    return children;
};

export default AdminRoute;
