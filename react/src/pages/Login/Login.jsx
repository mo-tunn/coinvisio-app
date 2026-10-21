import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context';
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    AlertCircle,
    Shield,
    ChevronLeft,
    CheckCircle2,
    Check
} from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { FadeInSection, LanguageSwitcher } from '../../components';
import { validateEmail } from './LoginUtils';
import styles from './Login.module.css';
import logo from '../../assets/logotransparan.png';
import { useTranslation } from 'react-i18next';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation('auth');
    const { login } = useAuth();

    // Step state: 1 = Email, 2 = Password
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [successMessage, setSuccessMessage] = useState(
        location.state?.registered ? t('login.accountCreated') : ''
    );
    const [captchaToken, setCaptchaToken] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        if (loginError) setLoginError('');
    };

    const handleNextStep = (e) => {
        e.preventDefault();

        if (!formData.email) {
            setErrors({ email: t('errors.emailRequired') });
            return;
        }
        if (!validateEmail(formData.email)) {
            setErrors({ email: t('errors.emailInvalid') });
            return;
        }

        // Move to next step with animation feel
        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
        setLoginError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.password) {
            setErrors({ password: t('errors.passwordRequired') });
            return;
        }

        if (!captchaToken && window.location.hostname !== 'localhost') {
            setLoginError(t('errors.captchaRequired', { defaultValue: 'Please complete the CAPTCHA.' }));
            return;
        }

        setIsLoading(true);
        setLoginError('');
        setSuccessMessage('');

        try {
            const response = await login(formData, { rememberMe, captchaToken: captchaToken || 'localhost-dummy-token' });
            console.log('Login successful:', response);
            navigate('/hub/dashboard', { replace: true });
        } catch (error) {
            console.error('Login error:', error);
            setLoginError(error.message || t('errors.loginFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#010205] text-white font-sans selection:bg-blue-600 selection:text-white overflow-hidden relative flex items-center justify-center">
            <div className="absolute top-6 right-6 z-20">
                <LanguageSwitcher />
            </div>

            {/* Global Background Grid */}
            <div className="fixed inset-0 grid-bg-global pointer-events-none z-0"></div>

            {/* Floating Particles */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className={styles.particle}></div>
                ))}
            </div>

            {/* Radial Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] hero-glow rounded-full blur-3xl pointer-events-none opacity-50"></div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-md px-6">
                <FadeInSection>

                    {/* Logo & Title */}
                    <div className="text-center mb-10">
                        <Link to="/" className="inline-flex items-center gap-3 mb-8 group">
                            <div className="w-20 h-20 flex items-center justify-center sharp-corners transition-colors overflow-hidden">
                                <img src={logo} alt="CoinVisio Logo" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-2xl font-light tracking-widest font-sans">COINVISIO</span>
                        </Link>

                        <h1 className="text-3xl font-semibold mb-3 text-white">
                            {t('login.title')}<span className="text-blue-500">.</span>
                        </h1>
                        <p className="text-gray-400 font-light">
                            {t('login.subtitle')}
                        </p>
                    </div>

                    {/* Stepper Progress */}
                    <div className="flex justify-between mb-8 relative max-w-[200px] mx-auto">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-800 -translate-y-1/2 z-0"></div>
                        <div className="absolute top-1/2 left-0 h-0.5 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-500"
                            style={{ width: `${((step - 1) / 1) * 100}%` }}></div>

                        {[1, 2].map((s) => (
                            <div key={s} className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono-custom border-2 transition-all duration-300
                                    ${step >= s ? 'bg-[#010205] border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-[#03050a] border-gray-700 text-gray-500'}`}>
                                    {step > s ? <Check size={14} /> : `0${s}`}
                                </div>
                                <span className={`text-[10px] uppercase font-mono-custom tracking-wider transition-colors absolute top-10 whitespace-nowrap ${step >= s ? 'text-blue-400' : 'text-gray-600'}`}>
                                    {s === 1 ? t('login.emailStep') : t('login.passwordStep')}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Login Card */}
                    <div className={`relative bg-[#03050a] border border-gray-800 p-8 sharp-corners ${styles.loginCard}`}>

                        {/* Scanner Line */}
                        <div className={styles.loginScanLine}></div>

                        {/* Decorative Corners */}
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-blue-500"></div>
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-blue-500"></div>
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-blue-500"></div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-blue-500"></div>

                        {/* Card Header */}
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
                            <div className="flex items-center gap-2">
                                <div className="relative w-2 h-2">
                                    <span className="absolute w-full h-full bg-blue-500 rounded-full animate-ping opacity-75"></span>
                                    <span className="relative block w-2 h-2 bg-blue-500 rounded-full"></span>
                                </div>
                                <span className="text-[10px] font-mono-custom text-gray-400 uppercase tracking-widest">SECURE_AUTH_{step === 1 ? 'STEP_01' : 'STEP_02'}</span>
                            </div>
                            <Shield size={14} className="text-gray-600" />
                        </div>

                        {/* Messages */}
                        {successMessage && (
                            <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 rounded-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                                <span className="text-sm text-green-300">{successMessage}</span>
                            </div>
                        )}

                        {loginError && (
                            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={16} className="text-red-400 shrink-0" />
                                <span className="text-sm text-red-300">{loginError}</span>
                            </div>
                        )}

                        {/* Content Container */}
                        <div className="relative min-h-[420px]">

                            {/* STEP 1: EMAIL */}
                            {step === 1 && (
                                <div className="animate-in fade-in slide-in-from-left-4 duration-500 absolute inset-0">
                                    <form onSubmit={handleNextStep} className="space-y-6 h-full flex flex-col">

                                        <div className="space-y-2">
                                            <label className="text-xs font-mono-custom text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Mail size={12} />
                                                {t('login.email')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    placeholder={t('login.emailPlaceholder')}
                                                    autoComplete="email"
                                                    autoFocus
                                                    className={`w-full bg-[#080b14] border ${errors.email ? 'border-red-500/50' : 'border-gray-800'} text-white px-4 py-4 text-base font-light placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all sharp-corners ${styles.inputGlow}`}
                                                />
                                                {errors.email && (
                                                    <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                                                        <AlertCircle size={12} />
                                                        {errors.email}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full btn-slide-fill py-4 font-semibold sharp-corners flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)] group mt-2"
                                        >
                                            <span>{t('login.continue')}</span>
                                            <ArrowRight size={16} className="transition-all group-hover:translate-x-1" />
                                        </button>

                                    </form>
                                </div>
                            )}

                            {/* STEP 2: PASSWORD */}
                            {step === 2 && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-500 absolute inset-0">
                                    <div className="mb-6 flex items-center gap-3 p-3 bg-[#080b14] border border-gray-800 sharp-corners">
                                        <div className="w-8 h-8 bg-blue-500/10 flex items-center justify-center rounded-sm text-blue-400">
                                            <Mail size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-gray-500 uppercase font-mono-custom">{t('login.signingInAs')}</p>
                                            <p className="text-sm text-white truncate font-medium">{formData.email}</p>
                                        </div>
                                        <button
                                            onClick={handleBack}
                                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                                        >
                                            {t('login.change')}
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-mono-custom text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                <Lock size={12} />
                                                {t('login.password')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    placeholder={t('login.passwordPlaceholder')}
                                                    autoComplete="current-password"
                                                    autoFocus
                                                    className={`w-full bg-[#080b14] border ${errors.password ? 'border-red-500/50' : 'border-gray-800'} text-white px-4 py-4 pr-12 text-base font-light placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all sharp-corners ${styles.inputGlow}`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-0 bottom-0 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {errors.password && (
                                                <p className="text-xs text-red-400 flex items-center gap-1">
                                                    <AlertCircle size={12} />
                                                    {errors.password}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={rememberMe}
                                                    onChange={(e) => setRememberMe(e.target.checked)}
                                                    className="w-4 h-4 bg-[#080b14] border border-gray-700 rounded-sm checked:bg-blue-600 checked:border-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                                />
                                                <span className="text-gray-400 group-hover:text-gray-300 transition-colors">{t('login.rememberMe')}</span>
                                            </label>
                                            <a href="#" className="text-blue-400 hover:text-blue-300 transition-colors font-mono-custom text-xs">
                                                {t('login.forgotPassword')}
                                            </a>
                                        </div>

                                        {window.location.hostname !== 'localhost' && (
                                            <div className="flex justify-center my-4 opacity-90 hover:opacity-100 transition-opacity">
                                                <ReCAPTCHA
                                                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                                                    onChange={(token) => setCaptchaToken(token)}
                                                    theme="dark"
                                                />
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={isLoading || (!captchaToken && window.location.hostname !== 'localhost')}
                                            className="w-full btn-slide-fill py-4 font-semibold sharp-corners flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed group"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                    <span>{t('login.loggingIn')}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>{t('login.accessAccount')}</span>
                                                    <ArrowRight size={16} className="transition-all group-hover:translate-x-1" />
                                                </>
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleBack}
                                            className="w-full text-center text-xs text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1 mt-4"
                                        >
                                            <ChevronLeft size={12} />
                                            {t('login.backToEmail')}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>

                        {/* Footer Status */}
                        <div className="mt-8 pt-4 border-t border-gray-800 flex justify-between items-center text-[9px] font-mono-custom text-gray-600">
                            <span>SSL_ENCRYPTED</span>
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-green-400">SECURE_CONNECTION</span>
                            </div>
                        </div>
                    </div>

                    {/* Sign Up Link */}
                    <p className="text-center mt-8 text-gray-400 text-sm">
                        {t('login.noAccount')}{' '}
                        <Link to="/register" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                            {t('login.createAccount')}
                        </Link>
                    </p>

                </FadeInSection>
            </div>
        </div>
    );
};

export default Login;
