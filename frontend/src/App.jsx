import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import FormPage from './pages/FormPage';
import DashboardPage from './pages/DashboardPage';
import MyTripsPage from './pages/MyTripsPage';
import FavoritesPage from './pages/FavoritesPage';
import SettingsPage from './pages/SettingsPage';
import Sidebar from './components/Sidebar';
import { Menu, X } from 'lucide-react';

function App() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <Router>
            <div className="flex min-h-screen bg-[#F8FAFC] relative">
                {/* Mobile Menu Toggle */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden fixed top-4 left-4 z-[60] p-2.5 bg-white border border-[#E2E8F0] rounded-xl shadow-lg text-[#0F172A] active:scale-95 transition-all no-print"
                >
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                {/* Overlay for mobile sidebar */}
                {sidebarOpen && (
                    <div
                        className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity no-print"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                <main className={`flex-1 min-h-screen relative print:m-0 print:p-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-64'} max-lg:w-full`}>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/plan" element={<FormPage />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/my-trips" element={<MyTripsPage />} />
                        <Route path="/favorites" element={<FavoritesPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
