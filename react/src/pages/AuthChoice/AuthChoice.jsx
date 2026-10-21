import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { FadeInSection, LanguageSwitcher } from '../../components';
import { useAuth } from '../../context';
import styles from './AuthChoice.module.css';
import logo from '../../assets/logotransparan.png';
import { useTranslation } from 'react-i18next';

const AuthChoice = () => {
    const navigate = useNavigate();
    const { t } = useTranslation('auth');
    const { loginWithGoogle, isAuthenticated } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/hub/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleGoogleLogin = async () => {
        try {
            setIsLoading(true);
            await loginWithGoogle();
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#010205] text-white font-sans overflow-hidden relative flex items-center justify-center p-6">
            <div className="absolute top-6 right-6 z-20">
                <LanguageSwitcher />
            </div>

            {/* Global Background Grid */}
            <div className="fixed inset-0 grid-bg-global pointer-events-none z-0"></div>

            {/* Radial Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-2xl">
                <FadeInSection>

                    {/* Header */}
                    <div className="text-center mb-12">
                        <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
                            <div className="w-16 h-16 flex items-center justify-center sharp-corners">
                                <img src={logo} alt="CoinVisio Logo" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-2xl font-light tracking-widest font-sans">COINVISIO</span>
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-semibold mb-4 text-white">
                            {t('choice.title')}<span className="text-blue-500">.</span>
                        </h1>
                        <p className="text-gray-400 font-light text-lg">
                            {t('choice.subtitle')}
                        </p>
                    </div>

                    {/* Cards Container */}
                    <div className="grid md:grid-cols-2 gap-6">

                        {/* Login Option */}
                        <div className={`${styles.choiceCard} p-8 border border-gray-800 sharp-corners hover:border-blue-500/50 transition-colors group relative overflow-hidden`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-12 h-12 bg-[#080b14] border border-gray-800 flex items-center justify-center mb-6 sharp-corners group-hover:border-blue-500/30 transition-colors">
                                    <LogIn className="text-blue-400" size={24} />
                                </div>

                                <h3 className="text-xl font-bold mb-2">{t('choice.welcomeBack')}</h3>
                                <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                                    {t('choice.welcomeBackDesc')}
                                </p>

                                <Link
                                    to="/login"
                                    className={`mt-auto w-full py-4 bg-[#080b14] border border-gray-700 hover:border-blue-500 hover:bg-blue-500/10 text-white font-medium sharp-corners flex items-center justify-center gap-2 transition-all btn-slide-fill group/btn ${styles.optionButton}`}
                                >
                                    <span>{t('choice.signIn')}</span>
                                    <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>

                        {/* Register Option */}
                        <div className={`${styles.choiceCard} p-8 border border-gray-800 sharp-corners hover:border-blue-500/50 transition-colors group relative overflow-hidden`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-12 h-12 bg-[#080b14] border border-gray-800 flex items-center justify-center mb-6 sharp-corners group-hover:border-blue-500/30 transition-colors">
                                    <UserPlus className="text-blue-400" size={24} />
                                </div>

                                <h3 className="text-xl font-bold mb-2">{t('choice.newUser')}</h3>
                                <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                                    {t('choice.newUserDesc')}
                                </p>

                                <Link
                                    to="/register"
                                    className={`mt-auto w-full py-4 bg-blue-600 hover:bg-blue-500 border border-transparent text-white font-medium sharp-corners flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] btn-slide-fill group/btn ${styles.optionButton}`}
                                >
                                    <span>{t('choice.createAccount')}</span>
                                    <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="mt-12 flex justify-between items-center text-[10px] font-mono-custom text-gray-600 border-t border-gray-900 pt-6">
                        <div className="flex items-center gap-2">
                            <Shield size={12} />
                            <span>SECURE_CONNECTION</span>
                        </div>
                        <div>
                            COINVISIO_AUTH_GATEWAY
                        </div>
                    </div>

                </FadeInSection>
            </div>
        </div>
    );
};

export default AuthChoice;
