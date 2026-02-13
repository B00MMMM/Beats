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
        <aside className="w-64 bg-zinc-900 text-white flex flex-col h-full border-r border-zinc-800">
            <div className="p-6">
                <h2 className="font-bold text-xl tracking-tight bg-gradient-to-r from-emerald-500 to-emerald-700 bg-clip-text text-transparent">
                    Admin Panel
                </h2>
            </div>

            <nav className="flex-1 mt-4">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center px-6 py-3 transition-all duration-200 ${isActive
                                    ? 'bg-zinc-800 border-l-4 border-emerald-500 text-emerald-400'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="ml-3 font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-zinc-800">
                <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
                >
                    <FiLogOut className="w-5 h-5" />
                    <span className="ml-3 font-medium">Exit Admin</span>
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
