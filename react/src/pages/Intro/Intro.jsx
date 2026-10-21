import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Activity,
    ArrowLeft,
    ArrowRight,
    Bell,
    Brain,
    CheckCircle2,
    MessageSquare,
    Radar,
    Shield,
    Sparkles,
} from 'lucide-react';
import { FadeInSection } from '../../components';
import { useAuth } from '../../context';
import styles from './Intro.module.css';
import logo from '../../assets/logotransparan.png';
import { useTranslation } from 'react-i18next';

const INTRO_PENDING_KEY = 'cv_intro_pending';
const introSeenKeyForEmail = (email) => `cv_intro_seen:${email}`;

const Intro = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useTranslation('intro');

    const [stepIndex, setStepIndex] = useState(0);
    const [bias, setBias] = useState('BULLISH');
    const [riskPreset, setRiskPreset] = useState('Moderate');
    const [lastCopied, setLastCopied] = useState('');

    const displayName = user?.user_metadata?.full_name || user?.email || 'there';
    const userEmail = (user?.email || '').toLowerCase();

    const [searchParams] = useSearchParams();
    const isGuest = searchParams.get('guest') === 'true';

    const [pendingEmail] = useState(() => {
        try {
            return (localStorage.getItem(INTRO_PENDING_KEY) || '').toLowerCase();
        } catch {
            return '';
        }
    });

    const introIsAllowed = useMemo(() => {
        if (isGuest) return true; // Guest mode bypasses checks
        if (!pendingEmail) return false;
        if (!userEmail) return null; // wait for user to load
        if (pendingEmail !== userEmail) return false;
        return localStorage.getItem(introSeenKeyForEmail(pendingEmail)) !== 'true';
    }, [pendingEmail, userEmail, isGuest]);

    useEffect(() => {
        if (introIsAllowed === null) return;
        if (introIsAllowed === false) {
            // If we already marked it as seen but key remained, clean it up
            if (pendingEmail && localStorage.getItem(introSeenKeyForEmail(pendingEmail)) === 'true') {
                localStorage.removeItem(INTRO_PENDING_KEY);
            }
            navigate('/hub/dashboard', { replace: true });
        }
    }, [introIsAllowed, navigate, pendingEmail]);

    const finishIntro = () => {
        if (isGuest) {
            navigate('/register');
            return;
        }
        if (pendingEmail) {
            localStorage.setItem(introSeenKeyForEmail(pendingEmail), 'true');
            localStorage.removeItem(INTRO_PENDING_KEY);
        }
        navigate('/hub/dashboard', { replace: true });
    };

    const steps = useMemo(() => ([
        {
            key: 'welcome',
            title: t('step.welcome.title', { name: displayName }),
            subtitle: t('step.welcome.subtitle'),
            Icon: Sparkles,
            body: (
                <div className="space-y-4">
                    <p className="text-gray-400 text-sm leading-relaxed">
                        {t('step.welcome.body')}
                    </p>
                    <div className="bg-[#070a16] border border-gray-800/70 p-4 sharp-corners">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 bg-blue-900/20 border border-blue-500/30 sharp-corners flex items-center justify-center">
                                <Shield size={16} className="text-blue-400" />
                            </div>
                            <div>
                                <div className="text-xs font-mono-custom uppercase tracking-widest text-gray-400">
                                    {t('step.welcome.important')}
                                </div>
                                <div className="text-sm text-gray-300 leading-relaxed mt-1">
                                    {t('step.welcome.note')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'coins',
            title: t('step.coins.title'),
            subtitle: t('step.coins.subtitle'),
            Icon: Bell,
            body: (
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="text-sm text-gray-300 leading-relaxed">
                            {t('step.coins.body')}
                        </div>
                        <div className="text-xs text-gray-500 font-mono-custom uppercase tracking-widest">
                            {t('step.coins.tip')}
                        </div>
                        <div className="text-sm text-gray-400">
                            {t('step.coins.tipText')}
                        </div>
                    </div>
                    <div className="bg-[#070a16] border border-gray-800/70 p-4 sharp-corners">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-mono-custom uppercase tracking-widest text-gray-500">{t('step.coins.watchlistPreview')}</span>
                            <span className="text-[10px] font-mono-custom uppercase tracking-widest text-blue-400">{t('step.coins.live')}</span>
                        </div>
                        <div className="space-y-2">
                            {[
                                { sym: 'BTC', delta: '+1.2%', tone: 'text-green-400' },
                                { sym: 'ETH', delta: '+0.4%', tone: 'text-green-400' },
                                { sym: 'SOL', delta: '-0.8%', tone: 'text-red-400' },
                            ].map((row) => (
                                <div key={row.sym} className="flex items-center justify-between bg-[#03050a] border border-gray-800 p-2 sharp-corners">
                                    <span className="text-xs font-mono-custom text-gray-300">{row.sym}</span>
                                    <span className={`text-xs font-mono-custom ${row.tone}`}>{row.delta}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'market',
            title: t('step.market.title'),
            subtitle: t('step.market.subtitle'),
            Icon: Activity,
            body: (
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <p className="text-sm text-gray-300 leading-relaxed">
                            {t('step.market.body')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {['BULLISH', 'BEARISH', 'NEUTRAL'].map((value) => {
                                const active = bias === value;
                                const label = value === 'BULLISH' ? t('labels.bullish') : value === 'BEARISH' ? t('labels.bearish') : t('labels.neutral');
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setBias(value)}
                                        className={`px-3 py-2 text-[10px] font-mono-custom uppercase tracking-widest border sharp-corners ${styles.pill} ${active
                                            ? 'bg-blue-600/15 border-blue-500/50 text-blue-300'
                                            : 'bg-[#080b14] border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="text-xs text-gray-500 leading-relaxed">
                            {t('step.market.note')}
                        </div>
                    </div>
                    <div className="bg-[#070a16] border border-gray-800/70 p-4 sharp-corners">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono-custom uppercase tracking-widest text-gray-500">{t('step.market.sample')}</span>
                            <span className="text-[10px] font-mono-custom uppercase tracking-widest text-gray-400">{t('step.market.confidence')}</span>
                        </div>
                        <div className="mt-3 bg-[#03050a] border border-gray-800 p-4 sharp-corners">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono-custom text-gray-300">BTC</span>
                                <span className={`text-[10px] font-mono-custom uppercase tracking-widest px-2 py-1 border sharp-corners ${bias === 'BULLISH'
                                    ? 'text-green-400 border-green-500/30 bg-green-500/10'
                                    : bias === 'BEARISH'
                                        ? 'text-red-400 border-red-500/30 bg-red-500/10'
                                        : 'text-gray-300 border-gray-600/40 bg-white/5'
                                    }`}
                                >
                                    {bias === 'BULLISH' ? t('labels.bullish') : bias === 'BEARISH' ? t('labels.bearish') : t('labels.neutral')}
                                </span>
                            </div>
                            <div className="mt-3">
                                <div className="h-1.5 bg-gray-800 sharp-corners overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: '72%' }}></div>
                                </div>
                                <div className="mt-2 text-[10px] text-gray-500 font-mono-custom uppercase tracking-widest">
                                    {t('step.market.scenario')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'anomalies',
            title: t('step.anomalies.title'),
            subtitle: t('step.anomalies.subtitle'),
            Icon: Radar,
            body: (
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <p className="text-sm text-gray-300 leading-relaxed">
                            {t('step.anomalies.body')}
                        </p>
                        <div className="text-xs text-gray-500 font-mono-custom uppercase tracking-widest">
                            {t('step.anomalies.labels')}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: t('labels.surge'), cls: 'text-green-400 border-green-500/30 bg-green-500/10' },
                                { label: t('labels.sharpDrop'), cls: 'text-red-400 border-red-500/30 bg-red-500/10' },
                                { label: t('labels.unusualVolume'), cls: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
                                { label: t('labels.volatilitySpike'), cls: 'text-blue-300 border-blue-500/30 bg-blue-500/10' },
                            ].map((t) => (
                                <span key={t.label} className={`px-2 py-1 text-[10px] font-mono-custom uppercase tracking-widest border sharp-corners ${t.cls}`}>
                                    {t.label}
                                </span>
                            ))}
                        </div>
                        <div className="text-xs text-gray-500 leading-relaxed">
                            {t('step.anomalies.note')}
                        </div>
                    </div>
                    <div className="bg-[#070a16] border border-gray-800/70 p-4 sharp-corners">
                        <div className="text-[10px] font-mono-custom uppercase tracking-widest text-gray-500 mb-3">{t('step.anomalies.example')}</div>
                        <div className="space-y-2">
                            {[
                                { sym: 'LINK', tag: t('labels.unusualVolume'), tone: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' },
                                { sym: 'AVAX', tag: t('labels.surge'), tone: 'text-green-400 border-green-500/30 bg-green-500/10' },
                            ].map((row) => (
                                <div key={row.sym} className="flex items-center justify-between bg-[#03050a] border border-gray-800 p-3 sharp-corners">
                                    <span className="text-xs font-mono-custom text-gray-300">{row.sym}</span>
                                    <span className={`px-2 py-1 text-[10px] font-mono-custom uppercase tracking-widest border sharp-corners ${row.tone}`}>
                                        {row.tag}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'insights',
            title: t('step.insights.title'),
            subtitle: t('step.insights.subtitle'),
            Icon: Brain,
            body: (
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <p className="text-sm text-gray-300 leading-relaxed">
                            {t('step.insights.body')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {['Conservative', 'Moderate', 'Aggressive'].map((value) => {
                                const active = riskPreset === value;
                                const label = value === 'Conservative' ? t('step.insights.conservative') : value === 'Moderate' ? t('step.insights.moderate') : t('step.insights.aggressive');
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setRiskPreset(value)}
                                        className={`px-3 py-2 text-[10px] font-mono-custom uppercase tracking-widest border sharp-corners ${styles.pill} ${active
                                            ? 'bg-blue-600/15 border-blue-500/50 text-blue-300'
                                            : 'bg-[#080b14] border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="text-xs text-gray-500 leading-relaxed">
                            {t('step.insights.note')}
                        </div>
                    </div>
                    <div className="bg-[#070a16] border border-gray-800/70 p-4 sharp-corners">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono-custom uppercase tracking-widest text-gray-500">{t('step.insights.daily')}</span>
                            <span className="text-[10px] font-mono-custom uppercase tracking-widest text-blue-400">{t('step.insights.auto')}</span>
                        </div>
                        <div className="mt-3 bg-[#03050a] border border-gray-800 p-4 sharp-corners">
                            <div className="text-xs text-gray-300 leading-relaxed">
                                {t('step.insights.dailyBody')}
                            </div>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'iris',
            title: t('step.iris.title'),
            subtitle: t('step.iris.subtitle'),
            Icon: MessageSquare,
            body: (
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <p className="text-sm text-gray-300 leading-relaxed">
                            {t('step.iris.body')}
                        </p>
                        <div className="text-xs text-gray-500 font-mono-custom uppercase tracking-widest">{t('step.iris.tryPrompt')}</div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                t('step.iris.prompt1'),
                                t('step.iris.prompt2'),
                                t('step.iris.prompt3'),
                            ].map((prompt) => (
                                <button
                                    key={prompt}
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(prompt);
                                            setLastCopied(prompt);
                                            setTimeout(() => setLastCopied(''), 1500);
                                        } catch {
                                            // Clipboard may be blocked; silently ignore
                                        }
                                    }}
                                    className="px-3 py-2 text-[10px] font-mono-custom tracking-widest border border-gray-800 bg-[#080b14] text-gray-400 hover:text-gray-200 hover:border-gray-700 sharp-corners"
                                    title={t('step.iris.copyTitle')}
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                        {lastCopied && (
                            <div className="text-[10px] font-mono-custom uppercase tracking-widest text-blue-400">
                                {t('step.iris.copied')}
                            </div>
                        )}
                    </div>
                    <div className="bg-[#070a16] border border-gray-800/70 p-4 sharp-corners">
                        <div className="text-[10px] font-mono-custom uppercase tracking-widest text-gray-500 mb-3">{t('step.iris.expect')}</div>
                        <div className="space-y-2">
                            {[
                                t('step.iris.expect1'),
                                t('step.iris.expect2'),
                                t('step.iris.expect3'),
                            ].map((line) => (
                                <div key={line} className="flex items-center gap-2 text-sm text-gray-300">
                                    <CheckCircle2 size={16} className="text-blue-400" />
                                    <span>{line}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'done',
            title: t('step.done.title'),
            subtitle: t('step.done.subtitle'),
            Icon: CheckCircle2,
            body: (
                <div className="space-y-4">
                    <p className="text-gray-300 text-sm leading-relaxed">
                        {isGuest
                            ? "You are ready to get started! Create your account to customize your intelligence hub."
                            : "That’s it. You can revisit settings anytime from your profile and tailor the experience to your style."
                        }
                    </p>
                    <div className="bg-[#070a16] border border-gray-800/70 p-4 sharp-corners">
                        <div className="text-xs font-mono-custom uppercase tracking-widest text-gray-500">
                            {t('step.done.reminder')}
                        </div>
                        <div className="mt-2 text-sm text-gray-300 leading-relaxed">
                            {t('step.done.reminderText')}
                        </div>
                    </div>
                </div>
            ),
        },
    ]), [bias, displayName, lastCopied, riskPreset, t, isGuest]);

    const current = steps[Math.min(stepIndex, steps.length - 1)];
    const CurrentIcon = current.Icon;

    if (introIsAllowed === null) {
        return (
            <div className="min-h-screen bg-[#010205] text-white font-sans flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-400 text-sm font-mono">{t('loading.preparing')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#010205] text-white font-sans overflow-hidden relative flex items-center justify-center py-10">
            <div className="fixed inset-0 grid-bg-global pointer-events-none z-0"></div>

            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className={styles.floatingOrb}></div>
                ))}
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] hero-glow rounded-full blur-3xl pointer-events-none opacity-40"></div>

            <div className="relative z-10 w-full max-w-4xl px-6">
                <FadeInSection>
                    <div className={`relative bg-[#03050a] border border-gray-800 p-8 sharp-corners ${styles.stepCard}`}>
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-blue-500"></div>
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-blue-500"></div>
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-blue-500"></div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-blue-500"></div>

                        <div className="flex items-start justify-between gap-4 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 flex items-center justify-center sharp-corners overflow-hidden border border-gray-800 bg-[#010205]">
                                    <img src={logo} alt="CoinVisio Logo" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-mono-custom uppercase tracking-widest text-gray-500">
                                        COINVISIO_INTRO
                                    </div>
                                    <div className="text-lg font-semibold text-white">
                                        {t('header.quickTour')}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={finishIntro}
                                className="text-[10px] font-mono-custom uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                {t('header.skip')}
                            </button>
                        </div>

                        {/* Stepper */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between text-[10px] font-mono-custom uppercase tracking-widest text-gray-600">
                                <span>{t('header.step', { current: Math.min(stepIndex + 1, steps.length), total: steps.length })}</span>
                                <span>{current.key}</span>
                            </div>
                            <div className="mt-3 h-1 bg-gray-800 sharp-corners overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="mb-8">
                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-11 h-11 bg-blue-900/20 border border-blue-500/30 sharp-corners flex items-center justify-center">
                                    <CurrentIcon size={18} className="text-blue-400" />
                                </div>
                                <div className="flex-1">
                                    <h1 className="text-2xl md:text-3xl font-semibold text-white">
                                        {current.title}<span className="text-blue-500">.</span>
                                    </h1>
                                    <p className="text-gray-400 font-light mt-1">
                                        {current.subtitle}
                                    </p>
                                </div>
                            </div>
                            {current.body}
                        </div>

                        {/* Footer CTA */}
                        <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-800">
                            <button
                                type="button"
                                onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
                                disabled={stepIndex === 0}
                                className="px-4 py-3 text-xs font-mono-custom uppercase tracking-widest border border-gray-800 bg-[#080b14] text-gray-400 hover:text-white hover:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed sharp-corners flex items-center gap-2 transition-colors"
                            >
                                <ArrowLeft size={14} />
                                {t('footer.back')}
                            </button>

                            <div className="flex-1 text-center text-[10px] text-gray-600 font-mono-custom uppercase tracking-widest hidden sm:block">
                                {t('footer.center')}
                            </div>

                            {stepIndex < steps.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setStepIndex((s) => Math.min(steps.length - 1, s + 1))}
                                    className="px-6 py-3 btn-slide-fill font-semibold sharp-corners flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.06)]"
                                >
                                    {t('footer.next')}
                                    <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={finishIntro}
                                    className="px-6 py-3 btn-slide-fill font-semibold sharp-corners flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.06)]"
                                >
                                    {isGuest ? "Register" : t('footer.openDashboard')}
                                    <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </FadeInSection>
            </div>
        </div>
    );
};

export default Intro;
