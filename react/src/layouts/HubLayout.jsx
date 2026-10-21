import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context';
import { LogOut, User, Lock, Shield, Menu, X } from 'lucide-react';
import logo from '../assets/logotransparan.png';
import IrisChatWidget from '../components/Dashboard/IrisChatWidget';
import { LegalModal, NotificationBell, LanguageSwitcher } from '../components';
import { useTranslation } from 'react-i18next';

const HubLayout = () => {
    const { user, logout } = useAuth();
    const { t } = useTranslation('common');
    const navigate = useNavigate();
    const location = useLocation();
    const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const displayName = user?.user_metadata?.full_name || user?.email || t('user.defaultName');

    // Helper to check active path
    const isActive = (path) => location.pathname === path;

    const navItems = [
        { name: t('nav.dashboard'), path: '/hub/dashboard' },
        { name: t('nav.coins'), path: '/hub/coins' },
        { name: t('nav.marketAnalysis'), path: '/hub/market-analysis' },
        { name: t('nav.aiInsights'), path: '/hub/ai-insights' },
        { name: t('nav.anomalies'), path: '/hub/anomalies' }
    ];

    return (
        <div className="min-h-screen bg-[#010205] text-white font-sans selection:bg-blue-600 selection:text-white overflow-hidden relative flex flex-col">
            {/* Force dark background on body */}
            <style>{`body { background-color: #010205; }`}</style>

            {/* Global Background Grid */}
            <div className="fixed inset-0 grid-bg-global pointer-events-none z-0"></div>

            {/* Radial Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] hero-glow rounded-full blur-3xl pointer-events-none opacity-20 z-0"></div>

            {/* Navigation */}
            <nav className="relative z-20 flex flex-col md:flex-row md:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800/50 bg-[#010205]/80 backdrop-blur-md sticky top-0">
                <div className="flex items-center justify-between w-full md:w-auto md:gap-12">
                    <Link to="/" className="flex items-center gap-3 group" onClick={() => setIsMobileMenuOpen(false)}>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center sharp-corners transition-colors overflow-hidden">
                            <img src={logo} alt="CoinVisio Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-base sm:text-lg font-light tracking-widest font-sans">COINVISIO</span>
                    </Link>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden text-gray-400 hover:text-white transition-colors p-1"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                <div className={`${isMobileMenuOpen ? 'flex flex-col w-full mt-4 gap-2' : 'hidden'} md:flex md:flex-row md:w-auto md:mt-0 md:items-center gap-1 bg-transparent md:bg-[#080b14] border-none md:border md:border-gray-800 p-0 md:p-1 sharp-corners`}>
                    {navItems.map((item) => {
                        const isRestricted = item.path === '/hub/anomalies' && user?.user_metadata?.subscription_tier !== 'Premium';

                        if (isRestricted) {
                            return (
                                <div
                                    key={item.path}
                                    className="px-4 py-3 md:py-1.5 text-sm md:text-xs font-mono-custom sharp-corners text-gray-600 cursor-not-allowed flex items-center justify-center md:justify-start gap-1.5 w-full md:w-auto border border-gray-800/30 md:border-none"
                                    title={t('premium.feature')}
                                >
                                    <Lock size={10} />
                                    {item.name}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`px-4 py-3 md:py-1.5 text-sm md:text-xs font-mono-custom sharp-corners transition-colors w-full md:w-auto text-center border border-gray-800/50 md:border-none ${isActive(item.path)
                                    ? 'bg-blue-900/20 text-blue-400 border-blue-500/30'
                                    : 'text-gray-400 md:text-gray-500 hover:text-white hover:bg-white/5 md:hover:bg-transparent md:hover:text-white'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                </div>

                <div className={`${isMobileMenuOpen ? 'flex flex-row flex-wrap justify-between items-center w-full mt-4 pt-4 border-t border-gray-800/50 gap-4' : 'hidden'} md:flex md:flex-row items-center gap-4 sm:gap-6 md:w-auto md:border-none md:mt-0 md:pt-0`}>
                    {/* Legal Info Button */}
                    <button
                        onClick={() => setIsLegalModalOpen(true)}
                        className="text-gray-500 hover:text-blue-400 transition-colors flex items-center gap-1 text-[10px] sm:text-[10px] font-bold uppercase order-3 md:order-1 ml-auto md:ml-0"
                        title={t('legal.title')}
                    >
                        <Shield size={14} />
                        <span className="hidden sm:inline">{t('legal.short')}</span>
                    </button>

                    <div className="order-4 md:order-2">
                        <LanguageSwitcher />
                    </div>

                    {/* User Profile Link */}
                    <Link to="/hub/profile" className="flex items-center gap-3 border-r border-gray-800 pr-4 sm:pr-6 md:pr-6 hover:opacity-80 transition-opacity order-1 md:order-3" onClick={() => setIsMobileMenuOpen(false)}>
                        <div className="text-right hidden sm:block">
                            <div className="text-xs font-bold text-white max-w-[100px] truncate">{displayName}</div>
                            <div className="text-[10px] text-gray-500 font-mono-custom uppercase">{user?.user_metadata?.subscription_tier || t('plan.free')}</div>
                        </div>
                        <div className="w-8 h-8 bg-blue-900/20 border border-blue-500/30 flex items-center justify-center sharp-corners shrink-0">
                            <User size={14} className="text-blue-400" />
                        </div>
                    </Link>

                    <div className="flex items-center gap-4 sm:gap-6 order-2 md:order-4">
                        {/* Notifications */}
                        <NotificationBell />

                        <button
                            onClick={handleLogout}
                            className="text-gray-400 hover:text-white transition-colors p-2 md:p-0"
                            title={t('auth.logout')}
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="relative z-10 flex-1 overflow-y-auto w-full max-w-[1600px] mx-auto">
                <Outlet />
            </main>

            {/* Iris Widget (Global for Hub) */}
            <IrisChatWidget />

            {/* Legal Modal */}
            <LegalModal isOpen={isLegalModalOpen} onClose={() => setIsLegalModalOpen(false)} />
        </div>
    );
};

export default HubLayout;
