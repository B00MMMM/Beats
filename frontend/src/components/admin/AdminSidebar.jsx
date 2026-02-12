import { Link, useLocation } from 'react-router-dom';
import { FiUsers, FiBarChart2, FiLogOut, FiStar, FiMusic } from 'react-icons/fi';

const AdminSidebar = () => {
    const location = useLocation();

    const menuItems = [
        { path: '/admin', icon: FiBarChart2, label: 'Dashboard' },
        { path: '/admin/users', icon: FiUsers, label: 'Users' },
        { path: '/admin/plans', icon: FiStar, label: 'Premium Plans' },
        { path: '/admin/songs', icon: FiMusic, label: 'Song Requests' }
    ];

    const handleLogout = () => {
        window.location.href = '/';
    };

    return (
        <aside className="admin-sidebar">
            <div className="sidebar-header">
                <h2 className="sidebar-title">
                    Admin Panel
                </h2>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <Icon className="sidebar-icon" />
                            <span className="sidebar-label">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <button
                    onClick={handleLogout}
                    className="logout-button"
                >
                    <FiLogOut className="sidebar-icon" />
                    <span className="sidebar-label">Exit Admin</span>
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
