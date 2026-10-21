import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context';
import {
    User,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    ArrowLeft,
    AlertCircle,
    Shield,
    TrendingUp,
    TrendingDown,
    Activity,
    Check,
    CheckCircle2
} from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { FadeInSection, LanguageSwitcher } from '../../components';
import {
    validateEmail,
    validatePassword,
    validateFullName,
    validatePasswordMatch,
    getPasswordStrength,
} from './RegisterUtils';
import styles from './Register.module.css';
import logo from '../../assets/logotransparan.png';
import LegalModal from '../../components/LegalModal';
import { useTranslation } from 'react-i18next';

const Register = () => {
    const navigate = useNavigate();
    const { register, loginWithGoogle } = useAuth();
    const { t } = useTranslation('auth');

    // Steps: 1=Identity, 2=Security, 3=Preferences (Risk)
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        riskTolerance: null,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [registerError, setRegisterError] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [captchaToken, setCaptchaToken] = useState(null);

    // Legal Modal State
    const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
    const [activeLegalTab, setActiveLegalTab] = useState('terms');

    const openLegalModal = (tab) => {
        setActiveLegalTab(tab);
        setIsLegalModalOpen(true);
    };

    const passwordStrength = getPasswordStrength(formData.password);
    const riskToleranceOptions = [
        { value: 0, label: t('register.risk.low'), description: t('register.risk.lowDesc') },
        { value: 1, label: t('register.risk.medium'), description: t('register.risk.mediumDesc') },
        { value: 2, label: t('register.risk.high'), description: t('register.risk.highDesc') },
    ];

    const getStrengthLabel = (label) => {
        if (label === 'Weak') return t('register.strength.weak');
        if (label === 'Fair') return t('register.strength.fair');
        if (label === 'Good') return t('register.strength.good');
        if (label === 'Strong') return t('register.strength.strong');
        if (label === 'Very Strong') return t('register.strength.veryStrong');
        return label;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        if (registerError) setRegisterError('');
    };

    const handleRiskSelect = (value) => {
        setFormData(prev => ({ ...prev, riskTolerance: value }));
        if (errors.riskTolerance) setErrors(prev => ({ ...prev, riskTolerance: '' }));
    };

    const getRiskIcon = (value) => {
        switch (value) {
            case 0: return <TrendingDown size={20} />;
            case 1: return <Activity size={20} />;
            case 2: return <TrendingUp size={20} />;
            default: return null;
        }
    };

    const getRiskColorClasses = (value, isSelected) => {
        const colors = {
            0: {
                border: isSelected ? 'border-green-500' : 'border-green-500/30',
                bg: isSelected ? 'bg-green-500/10' : 'bg-transparent',
                text: 'text-green-400',
                glow: isSelected ? 'shadow-[0_0_20px_rgba(34,197,94,0.2)]' : '',
            },
            1: {
                border: isSelected ? 'border-yellow-500' : 'border-yellow-500/30',
                bg: isSelected ? 'bg-yellow-500/10' : 'bg-transparent',
                text: 'text-yellow-400',
                glow: isSelected ? 'shadow-[0_0_20px_rgba(234,179,8,0.2)]' : '',
            },
            2: {
                border: isSelected ? 'border-red-500' : 'border-red-500/30',
                bg: isSelected ? 'bg-red-500/10' : 'bg-transparent',
                text: 'text-red-400',
                glow: isSelected ? 'shadow-[0_0_20px_rgba(239,68,68,0.2)]' : '',
            },
        };
        return colors[value] || colors[0];
    };

    const handleNextStep = (e) => {
        e.preventDefault();
        const newErrors = {};

        if (step === 1) {
            if (!formData.fullName) newErrors.fullName = t('errors.fullNameRequired');
            else if (!validateFullName(formData.fullName)) newErrors.fullName = t('errors.fullNameTooShort');

            if (!formData.email) newErrors.email = t('errors.emailRequired');
            else if (!validateEmail(formData.email)) newErrors.email = t('errors.emailInvalid');
        } else if (step === 2) {
            if (!formData.password) newErrors.password = t('errors.passwordRequired');
            else if (!validatePassword(formData.password)) newErrors.password = t('errors.passwordTooShort');

            if (!formData.confirmPassword) newErrors.confirmPassword = t('errors.confirmPasswordRequired');
            else if (!validatePasswordMatch(formData.password, formData.confirmPassword)) newErrors.confirmPassword = t('errors.passwordsDoNotMatch');
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
        setRegisterError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = {};
        if (formData.riskTolerance === null) {
            newErrors.riskTolerance = t('errors.riskToleranceRequired');
        }
        if (!agreedToTerms) {
            newErrors.terms = t('register.errors.termsRequired');
        }
        if (!captchaToken && window.location.hostname !== 'localhost') {
            newErrors.captcha = t('errors.captchaRequired', { defaultValue: 'Please complete the CAPTCHA.' });
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);
        setRegisterError('');

        try {
            const response = await register({ ...formData, captchaToken: captchaToken || 'localhost-dummy-token' });
            console.log('Registration successful:', response);
            const pendingEmail = (response?.user?.email || formData.email || '').toLowerCase();
            if (pendingEmail) {
                localStorage.setItem('cv_intro_pending', pendingEmail);
            }
            navigate('/intro', { replace: true });
        } catch (error) {
            console.error('Registration error:', error);
            setRegisterError(error.message || t('errors.registrationFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#010205] text-white font-sans selection:bg-blue-600 selection:text-white overflow-hidden relative flex items-center justify-center py-12">
            <div className="absolute top-6 right-6 z-20">
                <LanguageSwitcher />
            </div>

            {/* Global Background Grid */}
            <div className="fixed inset-0 grid-bg-global pointer-events-none z-0"></div>

            {/* Floating Orbs */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className={styles.floatingOrb}></div>
                ))}
            </div>

            {/* Radial Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] hero-glow rounded-full blur-3xl pointer-events-none opacity-40"></div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-lg px-6">
                <FadeInSection>

                    {/* Logo & Title */}
                    <div className="text-center mb-8">
                        <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
                            <div className="w-20 h-20 flex items-center justify-center sharp-corners transition-colors overflow-hidden">
                                <img src={logo} alt="CoinVisio Logo" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-2xl font-light tracking-widest font-sans">COINVISIO</span>
                        </Link>
                        <h1 className="text-3xl font-semibold mb-3 text-white">
                            {t('register.title')}<span className="text-blue-500">.</span>
                        </h1>
                        <p className="text-gray-400 font-light">
                            {t('register.subtitle')}
                        </p>
                    </div>

                    {/* Stepper Progress */}
                    <div className="flex justify-between mb-8 relative">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-800 -translate-y-1/2 z-0"></div>
                        <div className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-500"
                            style={{ width: `${((step - 1) / 2) * 100}%` }}></div>

                        {[1, 2, 3].map((s) => (
                            <div key={s} className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono-custom border-2 transition-all duration-300
                                    ${step >= s ? 'bg-[#010205] border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-[#03050a] border-gray-700 text-gray-500'}`}>
                                    {step > s ? <Check size={14} /> : `0${s}`}
                                </div>
                                <span className={`text-[10px] uppercase font-mono-custom tracking-wider transition-colors ${step >= s ? 'text-blue-400' : 'text-gray-600'}`}>
                                    {s === 1 ? t('register.steps.identity') : s === 2 ? t('register.steps.security') : t('register.steps.profile')}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Register Card */}
                    <div className={`relative bg-[#03050a] border border-gray-800 p-8 sharp-corners ${styles.registerCard}`}>

                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-blue-500"></div>
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-blue-500"></div>
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-blue-500"></div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-blue-500"></div>

                        {/* Error Message */}
                        {registerError && (
                            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={16} className="text-red-400 shrink-0" />
                                <span className="text-sm text-red-300">{registerError}</span>
                            </div>
                        )}

                        {/* Content Container */}
                        <div className="min-h-[460px] relative">

                            {/* STEP 1: IDENTITY */}
                            {step === 1 && (
                                <div className="animate-in fade-in slide-in-from-left-4 duration-500 absolute inset-0">
                                    <form id="step1-form" onSubmit={handleNextStep} className="space-y-5 h-full flex flex-col">

                                        <div className="space-y-2">
                                            <label className="text-xs font-mono-custom text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <User size={12} />
                                                {t('register.fullName')}
                                            </label>
                                            <input
                                                type="text"
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleChange}
                                                placeholder={t('register.fullNamePlaceholder')}
                                                autoComplete="name"
                                                autoFocus
                                                className={`w-full bg-[#080b14] border ${errors.fullName ? 'border-red-500/50' : 'border-gray-800'} text-white px-4 py-3.5 text-sm font-light placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all sharp-corners ${styles.inputFocusRing}`}
                                            />
                                            {errors.fullName && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} />{errors.fullName}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-mono-custom text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Mail size={12} />
                                                {t('register.email')}
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder={t('register.emailPlaceholder')}
                                                autoComplete="email"
                                                className={`w-full bg-[#080b14] border ${errors.email ? 'border-red-500/50' : 'border-gray-800'} text-white px-4 py-3.5 text-sm font-light placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all sharp-corners ${styles.inputFocusRing}`}
                                            />
                                            {errors.email && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} />{errors.email}</p>}
                                        </div>

                                        <div className="mt-auto pt-6">
                                            <button
                                                type="submit"
                                                className="w-full btn-slide-fill py-4 font-semibold sharp-corners flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)] group"
                                            >
                                                <span>{t('register.nextStep')}</span>
                                                <ArrowRight size={16} className="transition-all group-hover:translate-x-1" />
                                            </button>

                                            <div className="relative my-6">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-gray-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* STEP 2: SECURITY */}
                            {step === 2 && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-500 absolute inset-0">
                                    <form onSubmit={handleNextStep} className="space-y-5 h-full flex flex-col">

                                        <div className="space-y-2">
                                            <label className="text-xs font-mono-custom text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Lock size={12} />
                                                {t('register.password')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    placeholder={t('register.passwordPlaceholder')}
                                                    autoComplete="new-password"
                                                    autoFocus
                                                    className={`w-full bg-[#080b14] border ${errors.password ? 'border-red-500/50' : 'border-gray-800'} text-white px-4 py-3.5 pr-12 text-sm font-light placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all sharp-corners ${styles.inputFocusRing}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-0 bottom-0 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {/* Password Strength */}
                                            {formData.password && (
                                                <div className="space-y-1">
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map((level) => (
                                                            <div key={level} className={`h-1 flex-1 rounded-full transition-all ${styles.strengthBar} ${level <= passwordStrength.level ? (passwordStrength.level <= 1 ? 'bg-red-500' : passwordStrength.level <= 2 ? 'bg-orange-500' : passwordStrength.level <= 3 ? 'bg-yellow-500' : passwordStrength.level <= 4 ? 'bg-green-500' : 'bg-emerald-500') : 'bg-gray-800'}`} />
                                                        ))}
                                                    </div>
                                                    <p className={`text-[10px] font-mono-custom ${passwordStrength.level <= 1 ? 'text-red-400' : passwordStrength.level <= 2 ? 'text-orange-400' : passwordStrength.level <= 3 ? 'text-yellow-400' : passwordStrength.level <= 4 ? 'text-green-400' : 'text-emerald-400'}`}>
                                                        {t('register.strength.label')}: {getStrengthLabel(passwordStrength.label).toUpperCase()}
                                                    </p>
                                                </div>
                                            )}
                                            {errors.password && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} />{errors.password}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-mono-custom text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Lock size={12} />
                                                {t('register.confirmPassword')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    name="confirmPassword"
                                                    value={formData.confirmPassword}
                                                    onChange={handleChange}
                                                    placeholder={t('register.confirmPasswordPlaceholder')}
                                                    autoComplete="new-password"
                                                    className={`w-full bg-[#080b14] border ${errors.confirmPassword ? 'border-red-500/50' : formData.confirmPassword && formData.password === formData.confirmPassword ? 'border-green-500/50' : 'border-gray-800'} text-white px-4 py-3.5 pr-12 text-sm font-light placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all sharp-corners ${styles.inputFocusRing}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-4 top-0 bottom-0 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                                                >
                                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                                                    <div className="absolute right-12 top-0 bottom-0 flex items-center"><Check size={16} className="text-green-500" /></div>
                                                )}
                                            </div>
                                            {errors.confirmPassword && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} />{errors.confirmPassword}</p>}
                                        </div>

                                        <div className="mt-auto pt-6 flex gap-3">
                                            <button
                                                type="button"
                                                onClick={handleBack}
                                                className="px-4 py-4 bg-[#080b14] border border-gray-800 text-gray-400 hover:text-white sharp-corners transition-colors"
                                            >
                                                <ArrowLeft size={20} />
                                            </button>
                                            <button
                                                type="submit"
                                                className="flex-1 btn-slide-fill py-4 font-semibold sharp-corners flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)] group"
                                            >
                                                <span>{t('register.nextStep')}</span>
                                                <ArrowRight size={16} className="transition-all group-hover:translate-x-1" />
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* STEP 3: PREFERENCES & TERMS */}
                            {step === 3 && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-500 absolute inset-0">
                                    <form onSubmit={handleSubmit} className="space-y-4 h-full flex flex-col">

                                        <div className="space-y-2">
                                            <label className="text-xs font-mono-custom text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Activity size={12} />
                                                {t('register.riskTolerance')}
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {riskToleranceOptions.map((option) => {
                                                    const isSelected = formData.riskTolerance === option.value;
                                                    const colorClasses = getRiskColorClasses(option.value, isSelected);
                                                    return (
                                                        <button
                                                            key={option.value}
                                                            type="button"
                                                            onClick={() => handleRiskSelect(option.value)}
                                                            className={`relative p-3 border ${colorClasses.border} ${colorClasses.bg} ${colorClasses.glow} sharp-corners transition-all duration-300 ${styles.riskCard} ${isSelected ? styles.selected : ''}`}
                                                        >
                                                            {isSelected && <div className="absolute top-1 right-1"><Check size={12} className={colorClasses.text} /></div>}
                                                            <div className={`flex flex-col items-center gap-1 ${colorClasses.text}`}>
                                                                {getRiskIcon(option.value)}
                                                                <span className="text-[10px] font-mono-custom font-bold">{option.label}</span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {formData.riskTolerance !== null && <p className="text-[10px] text-gray-500 text-center">{riskToleranceOptions.find(o => o.value === formData.riskTolerance)?.description}</p>}
                                            {errors.riskTolerance && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} />{errors.riskTolerance}</p>}
                                        </div>

                                        <label className="flex items-start gap-3 cursor-pointer group p-3 bg-blue-900/10 border border-blue-900/30 sharp-corners">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={agreedToTerms}
                                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                                    className="peer h-4 w-4 cursor-pointer appearance-none border border-gray-600 bg-gray-900 checked:border-blue-500 checked:bg-blue-600 transition-all sharp-corners"
                                                />
                                                <Check size={12} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                            </div>
                                            <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors leading-relaxed">
                                                {t('register.termsPrefix')} <button onClick={(e) => { e.preventDefault(); openLegalModal('terms'); }} className="text-blue-400 hover:underline">{t('register.termsLink')}</button> {t('register.termsAnd')} <button onClick={(e) => { e.preventDefault(); openLegalModal('privacy'); }} className="text-blue-400 hover:underline">{t('register.privacyLink')}</button>.
                                            </span>
                                        </label>
                                        {errors.terms && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} />{errors.terms}</p>}

                                        {window.location.hostname !== 'localhost' && (
                                            <div className="flex justify-center my-2 opacity-90 hover:opacity-100 transition-opacity">
                                                <ReCAPTCHA
                                                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                                                    onChange={(token) => setCaptchaToken(token)}
                                                    theme="dark"
                                                />
                                            </div>
                                        )}
                                        {errors.captcha && <p className="text-xs text-red-400 flex items-center gap-1 justify-center"><AlertCircle size={12} />{errors.captcha}</p>}

                                        <div className="mt-auto pt-4 flex gap-3">
                                            <button
                                                type="button"
                                                onClick={handleBack}
                                                className="px-4 py-4 bg-[#080b14] border border-gray-800 text-gray-400 hover:text-white sharp-corners transition-colors"
                                            >
                                                <ArrowLeft size={20} />
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isLoading || (!captchaToken && window.location.hostname !== 'localhost')}
                                                className="flex-1 btn-slide-fill py-4 font-semibold sharp-corners flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed group"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                        <span>{t('register.initializing')}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>{t('register.completeRegistration')}</span>
                                                        <ArrowRight size={16} className="transition-all group-hover:translate-x-1" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                        </div>

                        {/* Footer Status */}
                        <div className="mt-6 pt-4 border-t border-gray-800 flex justify-between items-center text-[9px] font-mono-custom text-gray-600">
                            <span>256-BIT_ENCRYPTION</span>
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-green-400">SECURE_REGISTRATION</span>
                            </div>
                        </div>
                    </div>

                    {/* Login Link */}
                    <p className="text-center mt-6 text-gray-400 text-sm">
                        {t('register.alreadyHaveAccount')}{' '}
                        <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                            {t('register.signIn')}
                        </Link>
                    </p>

                </FadeInSection>
            </div>

            {/* Decorative Elements */}
            <div className="fixed bottom-8 left-8 text-[10px] font-mono-custom text-gray-700 hidden lg:block">
                <div>SYS_REG_V2.1.0</div>
            </div>

            <div className="fixed bottom-8 right-8 text-[10px] font-mono-custom text-gray-700 text-right hidden lg:block">
                <div>&copy; 2026 COINVISIO</div>
            </div>

            {/* Legal Modal */}
            <LegalModal
                isOpen={isLegalModalOpen}
                onClose={() => setIsLegalModalOpen(false)}
                initialTab={activeLegalTab}
            />
        </div>
    );
};

export default Register;

