import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context';
import { userService } from '../../services/user.service';
import { FadeInSection, PageHeader } from '../../components';
import { User, Mail, Lock, Shield, Save, CheckCircle, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeLanguageAndPersist } from '../../i18n/language';

const Profile = () => {
    const { t, i18n } = useTranslation('profile');
    const { user, updateUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [isBetaLoading, setIsBetaLoading] = useState(false);
    const [betaSuccessMsg, setBetaSuccessMsg] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState(i18n.language === 'tr' ? 'tr' : 'en');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        riskProfile: 'Medium'
    });

    const isPremium = user?.user_metadata?.subscription_tier?.toLowerCase() === 'premium';
    console.log('Profile User Data:', user); // Debug log
    console.log('Subscription Tier:', user?.user_metadata?.subscription_tier); // Debug log

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                email: user.email || '',
                riskProfile: user.user_metadata?.risk_tolerance === 1 ? 'Conservative' :
                    user.user_metadata?.risk_tolerance === 3 ? 'Aggressive' : 'Moderate'
            }));
        }
    }, [user]);

    useEffect(() => {
        setSelectedLanguage(i18n.language === 'tr' ? 'tr' : 'en');
    }, [i18n.language]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRiskProfileChange = (level) => {
        if (!isPremium) return; // Prevent change if not premium
        setFormData({ ...formData, riskProfile: level });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setSuccessMsg('');

        try {
            // Simulate API call
            await userService.updateProfile(formData);

            // Update local context
            updateUser({
                email: formData.email,
                user_metadata: {
                    ...user.user_metadata,
                    risk_tolerance: formData.riskProfile === 'Conservative' ? 1 :
                        formData.riskProfile === 'Aggressive' ? 3 : 2
                }
            });

            setSuccessMsg(t('messages.updated'));
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLanguageChange = async (e) => {
        const lang = e.target.value;
        setSelectedLanguage(lang);
        await changeLanguageAndPersist(lang, { persistServer: true });
    };

    const handleBetaApply = async () => {
        setIsBetaLoading(true);
        setBetaSuccessMsg('');
        try {
            await userService.applyForBeta(user?.email || formData.email);
            setBetaSuccessMsg(t('beta.successMessage', 'Beta application submitted successfully!'));
            setTimeout(() => setBetaSuccessMsg(''), 5000);
        } catch (error) {
            console.error('Failed to apply for beta:', error);
        } finally {
            setIsBetaLoading(false);
        }
    };

    return (
        <div className="pb-20 pt-4 sm:pt-6 px-4 md:px-8 max-w-[800px] mx-auto">
            <FadeInSection>
                {/* Header */}
                <div>
                    <PageHeader
                        icon={User}
                        subtitle={t('header.subtitle')}
                        title={t('header.title')}
                        highlight={t('header.highlight')}
                    />
                    <div className="mb-8 border-b border-gray-800 pb-6">
                        <p className="text-gray-400 text-sm">
                            {t('description')}
                        </p>
                    </div>
                </div>

                <div className="bg-[#03050a] border border-gray-800 p-8 sharp-corners relative overflow-hidden">
                    {/* Background Decorative */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-3xl rounded-full pointer-events-none -mr-16 -mt-16"></div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6 relative z-10">

                        {/* Profile Picture (Read Only) */}
                        <div className="flex items-center gap-6 mb-4">
                            <div className="w-20 h-20 bg-gray-900 border border-gray-700 flex items-center justify-center rounded-full text-blue-500">
                                <User size={32} />
                            </div>
                            <div>
                                <div className="text-white font-bold text-lg">{user?.user_metadata?.full_name || t('defaultName')}</div>
                                <div className={`text-xs uppercase tracking-wider font-bold mb-1 ${isPremium ? 'text-yellow-500' : 'text-gray-500'}`}>
                                    {user?.user_metadata?.subscription_tier || t('plan.free')}
                                </div>
                                {!isPremium && (
                                    <div className="text-[10px] text-gray-500">{t('plan.upgradeHint')}</div>
                                )}
                            </div>
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs uppercase text-gray-500 font-bold tracking-wider flex items-center gap-2">
                                <Mail size={12} /> {t('fields.email')}
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="bg-[#0a0f1e] border border-gray-700 text-white text-sm p-3 sharp-corners focus:border-blue-500 outline-none transition-colors"
                            />
                        </div>

                        {/* Password Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs uppercase text-gray-500 font-bold tracking-wider flex items-center gap-2">
                                    <Lock size={12} /> {t('fields.newPassword')}
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    placeholder={t('fields.newPasswordPlaceholder')}
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="bg-[#0a0f1e] border border-gray-700 text-white text-sm p-3 sharp-corners focus:border-blue-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs uppercase text-gray-500 font-bold tracking-wider flex items-center gap-2">
                                    <CheckCircle size={12} /> {t('fields.confirmPassword')}
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    placeholder={t('fields.confirmPasswordPlaceholder')}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="bg-[#0a0f1e] border border-gray-700 text-white text-sm p-3 sharp-corners focus:border-blue-500 outline-none transition-colors"
                                />
                            </div>
                        </div>

                        {/* Risk Profile */}
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs uppercase text-gray-500 font-bold tracking-wider flex items-center gap-2">
                                    <Shield size={12} /> {t('risk.title')}
                                </label>
                                {!isPremium && (
                                    <span className="text-[10px] text-orange-400 flex items-center gap-1 font-bold">
                                        <Lock size={10} /> {t('premium.badge')}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4 relative">
                                {!isPremium && (
                                    // Lock Overlay for Risk Profile
                                    <div className="absolute inset-0 z-20 cursor-not-allowed" title="Upgrade to Premium to change risk profile"></div>
                                )}

                                {['Conservative', 'Moderate', 'Aggressive'].map((level) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => handleRiskProfileChange(level)}
                                        disabled={!isPremium}
                                        className={`p-4 border sharp-corners text-center transition-all relative ${formData.riskProfile === level
                                            ? 'bg-blue-900/20 border-blue-500 text-blue-400 scale-[1.02]'
                                            : 'bg-[#0a0f1e] border-gray-800 text-gray-500 hover:bg-[#0f1426] hover:text-gray-300'
                                            } ${!isPremium ? 'opacity-70' : ''}`}
                                    >
                                        <div className="font-bold text-sm mb-1">{level}</div>
                                        <div className="text-[10px] opacity-70">
                                            {level === 'Conservative' ? t('risk.conservativeDesc') :
                                                level === 'Aggressive' ? t('risk.aggressiveDesc') : t('risk.moderateDesc')}
                                        </div>

                                        {!isPremium && formData.riskProfile !== level && (
                                            <div className="absolute top-2 right-2 text-gray-600">
                                                <Lock size={12} />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            {!isPremium && (
                                <p className="text-[10px] text-gray-500 mt-1">
                                    {t('risk.freeAssignedPrefix')} <strong>{formData.riskProfile}</strong> {t('risk.freeAssignedSuffix')}
                                </p>
                            )}
                        </div>

                        {/* Language Preference */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs uppercase text-gray-500 font-bold tracking-wider">
                                {t('language.title')}
                            </label>
                            <select
                                value={selectedLanguage}
                                onChange={handleLanguageChange}
                                className="bg-[#0a0f1e] border border-gray-700 text-white text-sm p-3 sharp-corners focus:border-blue-500 outline-none transition-colors"
                            >
                                <option value="en">{t('language.en')}</option>
                                <option value="tr">{t('language.tr')}</option>
                            </select>
                        </div>

                        {/* Beta Tester Section */}
                        <div className="bg-blue-900/10 border border-blue-500/20 p-4 sharp-corners">
                            <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                                <HelpCircle size={16} className="text-blue-400" />
                                {t('beta.title')}
                            </h3>
                            <p className="text-gray-400 text-xs mb-4 leading-relaxed">
                                {t('beta.description')}
                            </p>
                            <button
                                type="button"
                                disabled={isBetaLoading}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold uppercase tracking-wider sharp-corners transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleBetaApply}
                            >
                                {isBetaLoading ? t('actions.saving', 'Saving...') : t('beta.apply')}
                            </button>
                            {betaSuccessMsg && (
                                <p className="text-green-500 text-xs mt-2 font-bold animate-pulse">
                                    <CheckCircle size={12} className="inline mr-1" /> {betaSuccessMsg}
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="mt-4 flex items-center justify-between">
                            {successMsg ? (
                                <div className="text-green-500 flex items-center gap-2 text-sm font-bold animate-pulse">
                                    <CheckCircle size={16} /> {successMsg}
                                </div>
                            ) : <div></div>}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest text-xs sharp-corners transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? t('actions.saving') : (
                                    <>
                                        <Save size={16} /> {t('actions.saveChanges')}
                                    </>
                                )}
                            </button>
                        </div>

                    </form>
                </div>
            </FadeInSection>
        </div>
    );
};

export default Profile;
