import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Map,
    Heart,
    Settings,
    Navigation,
    Sparkles,
    User,
    ArrowRight
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    return (
        <aside className={`w-64 bg-white border-r border-[#E2E8F0] h-screen fixed left-0 top-0 flex flex-col z-50 no-print transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-6">
                <div
                    className="flex items-center gap-3 mb-10 cursor-pointer"
                    onClick={() => navigate('/')}
                >
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Navigation className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-tight">Smart Yatra</h1>
                        <p className="text-[10px] font-medium text-gray-400 tracking-wider uppercase">AI Tourism India</p>
                    </div>
                </div>

                <nav className="space-y-1">
                    <SidebarItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={onClose} />
                    <SidebarItem to="/my-trips" icon={<Map size={20} />} label="My Trips" onClick={onClose} />
                    <SidebarItem to="/plan" icon={<Sparkles size={20} />} label="Plan New Trip" onClick={onClose} />
                    <SidebarItem to="/favorites" icon={<Heart size={20} />} label="Favorites" onClick={onClose} />
                    <SidebarItem to="/settings" icon={<Settings size={20} />} label="Settings" onClick={onClose} />
                </nav>
            </div>

            <div className="mt-auto p-6">
                <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-2">Pro Member</p>
                        <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                            Unlimited AI trip generations & offline maps.
                        </p>
                        <button className="w-full bg-[#0F172A] text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 group-hover:bg-black transition-all">
                            Upgrade Now <ArrowRight size={14} />
                        </button>
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 blur-2xl" />
                </div>
            </div>
        </aside>
    );
};

const SidebarItem = ({ to, icon, label, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
            `sidebar-link ${isActive ? 'active' : ''}`
        }
    >
        {icon}
        <span className="text-sm">{label}</span>
    </NavLink>
);

export default Sidebar;
