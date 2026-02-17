import { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';
import { FiCheck, FiX, FiFilter } from 'react-icons/fi';
import { useAuth } from '@clerk/clerk-react';

const PlanManagement = () => {
    const { getToken } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [durationMap, setDurationMap] = useState({}); // { requestId: months }

    useEffect(() => {
        fetchPlanRequests();
    }, [page, statusFilter]);

    const fetchPlanRequests = async () => {
        try {
            setLoading(true);
            const token = await getToken();
            const response = await axiosInstance.get('/admin/plan-requests', {
                params: { page, status: statusFilter, limit: 10 },
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(response.data.requests);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error('Failed to fetch plan requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestAction = async (requestId, status, adminNotes = '') => {
        try {
            const token = await getToken();
            const payload = { status, adminNotes };

            // Add duration when approving
            if (status === 'approved') {
                payload.durationMonths = durationMap[requestId] || 1;
            }

            await axiosInstance.put(`/admin/plan-requests/${requestId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchPlanRequests(); // Refresh the list
        } catch (error) {
            console.error('Failed to update request:', error);
        }
    };

    const getPlanBadgeColor = (plan) => {
        return plan || 'iron';
    };

    const getStatusBadgeColor = (status) => {
        return status || 'pending';
    };

    return (
        <div className="management-container">
            <div className="management-header">
                <h1 className="management-title">Premium Plan Management</h1>
            </div>

            {/* Filters */}
            <div className="filters-container" style={{ display: 'flex', alignItems: 'center', gridTemplateColumns: 'none' }}>
                <FiFilter className="text-zinc-400" />
                <span className="text-zinc-300 text-sm font-medium">Filter Status:</span>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">All Requests</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            {/* Plan Requests Table */}
            <div className="table-container">
                <div className="table-responsive">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Plan</th>
                                <th>Message</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="no-data-cell">
                                        No plan requests found.
                                    </td>
                                </tr>
                            ) : (
                                requests.map((request) => (
                                    <tr key={request._id}>
                                        <td>
                                            <div className="song-info">
                                                <img
                                                    src={request.userId?.imageUrl || 'https://via.placeholder.com/40'}
                                                    alt={request.userId?.fullName}
                                                    className="song-image"
                                                    style={{ borderRadius: '50%' }}
                                                />
                                                <div className="song-details" style={{ marginLeft: '1rem' }}>
                                                    <div className="song-title">
                                                        {request.userId?.fullName || 'Deleted User'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${getPlanBadgeColor(request.requestedPlan)}`}>
                                                {request.requestedPlan.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <p className="truncate" style={{ maxWidth: '20rem', fontSize: '0.875rem', color: 'var(--color-zinc-300)' }} title={request.explanation}>
                                                {request.explanation}
                                            </p>
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeColor(request.status)}`}>
                                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--color-zinc-400)', fontSize: '0.875rem' }}>
                                            {new Date(request.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="text-right">
                                            {request.status === 'pending' && (
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                                                    {/* Duration selector */}
                                                    <select
                                                        value={durationMap[request._id] || 1}
                                                        onChange={(e) => setDurationMap(prev => ({
                                                            ...prev,
                                                            [request._id]: parseInt(e.target.value)
                                                        }))}
                                                        className="filter-select"
                                                        style={{ width: 'auto', minWidth: '80px', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                        title="Plan duration"
                                                    >
                                                        <option value={1}>1 Month</option>
                                                        <option value={2}>2 Months</option>
                                                        <option value={3}>3 Months</option>
                                                    </select>
                                                    <button
                                                        onClick={() => handleRequestAction(request._id, 'approved')}
                                                        className="action-btn pending"
                                                        title="Approve"
                                                    >
                                                        <FiCheck className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const notes = prompt('Rejection reason (optional):');
                                                            if (notes !== null) {
                                                                handleRequestAction(request._id, 'rejected', notes);
                                                            }
                                                        }}
                                                        className="action-btn"
                                                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-red-500)' }}
                                                        title="Reject"
                                                    >
                                                        <FiX className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
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
        </div>
    );
};

export default PlanManagement;
