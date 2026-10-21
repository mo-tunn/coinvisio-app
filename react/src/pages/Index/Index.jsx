import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Activity,
    ShieldCheck,
    Zap,
    Brain,
    Bell,
    MessageSquare,
    ArrowRight,
    Layers,
    ChevronRight,
    BarChart3,
    Cpu,
    Globe,
    Terminal,
    Scan,
    Send,
    Radio,
    Database,
    HelpCircle,
    GitCommit,
    History,
    AlertTriangle,
    Mail,
} from 'lucide-react';

// Import reusable components
import { FadeInSection, CountUp, Typewriter, FeatureCard, LanguageSwitcher } from '../../components';
import SEO from '../../components/SEO';

// Import page utilities
import { coinData, statsData, getActionColorClass, getCurrentCoins } from './IndexUtils';

// Import page-specific styles (if any)
import styles from './Index.module.css';
import logo from '../../assets/logotransparan.png';
import LegalModal from '../../components/LegalModal';
import { useAuth } from '../../context';
import { useTranslation } from 'react-i18next';

const Index = () => {
    const { t, i18n } = useTranslation('index');
    const { isAuthenticated } = useAuth();
    const isTurkish = i18n.language?.toLowerCase().startsWith('tr');
    const [scrolled, setScrolled] = useState(false);
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const earlyAccessPath = isAuthenticated ? '/hub/dashboard' : '/auth-choice';

    // Legal Modal State
    const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
    const [activeLegalTab, setActiveLegalTab] = useState('disclaimer');

    const openLegalModal = (tab) => {
        setActiveLegalTab(tab);
        setIsLegalModalOpen(true);
    };

    // States for Intelligence Hub Animations
    const [regimeProgress, setRegimeProgress] = useState(0);
    const [coinIndex, setCoinIndex] = useState(0);

    // Stats visibility state
    const [statsVisible, setStatsVisible] = useState(false);
    const statsRef = useRef(null);

    // Chat Animation States
    const [chatStep, setChatStep] = useState(0);

    // --- MOCK DATA FOR HERO VISUAL ---
    const mockWatchlist = [
        { s: 'BTC', p: '$43,250', c: '+2.4%', up: true },
        { s: 'ETH', p: '$2,240', c: '+1.8%', up: true },
        { s: 'SOL', p: '$98.45', c: '-0.5%', up: false },
        { s: 'XRP', p: '$0.54', c: '+0.2%', up: true },
        { s: 'ADA', p: '$0.48', c: '-1.1%', up: false },
    ];

    const mockSignals = [
        { pair: 'ETH/USDT', type: 'BULLISH', ref: '$2,240', proj: '$2,300-$2,380' },
        { pair: 'SOL/USDT', type: 'BEARISH', ref: '$99.5', proj: '$92-$97' },
        { pair: 'AVAX/USDT', type: 'BULLISH', ref: '$35.20', proj: '$36.8-$38.6' },
        { pair: 'BNB/USDT', type: 'NEUTRAL', ref: '$310', proj: '$305-$318' },
        { pair: 'DOT/USDT', type: 'BULLISH', ref: '$7.20', proj: '$7.5-$8.0' },
    ];

    const mockAnomalies = [
        { sym: 'LTC', value: 2, unit: 'm', msg: 'UNUSUAL VOLUME' },
        { sym: 'DOGE', value: 15, unit: 'm', msg: 'SHARP DROP' },
        { sym: 'LINK', value: 1, unit: 'h', msg: 'VOLATILITY SPIKE' },
        { sym: 'UNI', value: 3, unit: 'h', msg: 'SURGE' },
        { sym: 'MATIC', value: 4, unit: 'h', msg: 'UNUSUAL VOLUME' },
    ];

    const [activeSignals, setActiveSignals] = useState(mockSignals.slice(0, 2));
    const [activeAnomalies, setActiveAnomalies] = useState(mockAnomalies.slice(0, 3));
    const [watchlistIndex, setWatchlistIndex] = useState(0);

    // Animation Effect for Feeds
    useEffect(() => {
        const interval = setInterval(() => {
            // Rotate Signals
            setActiveSignals(prev => {
                const nextDocs = [...prev];
                const first = nextDocs.shift();
                // Pick a random next one from mock that isn't currently shown (simplified logic)
                const randomNext = mockSignals[Math.floor(Math.random() * mockSignals.length)];
                nextDocs.push(randomNext);
                return nextDocs;
            });

            // Rotate Anomalies
            setActiveAnomalies(prev => {
                const nextDocs = [...prev];
                nextDocs.shift();
                const randomNext = mockAnomalies[Math.floor(Math.random() * mockAnomalies.length)];
                nextDocs.push(randomNext);
                return nextDocs;
            });
        }, 3000); // Update every 3 seconds

        return () => clearInterval(interval);
    }, []);

    // Scroll effect for navbar
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Intersection Observer for Stats & Chat Trigger
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setStatsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.3 }
        );

        if (statsRef.current) {
            observer.observe(statsRef.current);
        }

        // Chat trigger
        const chatObserver = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => setChatStep(1), 500);
                    setTimeout(() => setChatStep(2), 2000);
                    setTimeout(() => setChatStep(3), 4500);
                    setTimeout(() => setChatStep(4), 7000);
                }
            },
            { threshold: 0.5 }
        );

        const chatSection = document.getElementById('iris');
        if (chatSection) chatObserver.observe(chatSection);

        return () => {
            observer.disconnect();
            chatObserver.disconnect();
        };
    }, []);

    // Animation Loops
    useEffect(() => {
        const progressInterval = setInterval(() => {
            setRegimeProgress(prev => (prev >= 100 ? 0 : prev + 1));
        }, 50);

        const coinInterval = setInterval(() => {
            setCoinIndex(prev => (prev + 1) % coinData.length);
        }, 1500);

        return () => {
            clearInterval(progressInterval);
            clearInterval(coinInterval);
        };
    }, []);

    const handleJoinWaitlist = (e) => {
        e.preventDefault();
        if (email) {
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 3000);
            setEmail('');
        }
    };

    const currentCoins = getCurrentCoins(coinIndex);
    const formatRelativeTime = (value, unit) =>
        unit === 'h'
            ? t('hero.time.hoursAgo', { value })
            : t('hero.time.minutesAgo', { value });

    return (
        <div className="min-h-screen bg-[#010205] text-white font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden relative">
            <SEO
                title={isTurkish ? "CoinVisio - Kripto Piyasalarını Basitleştiren Yapay Zeka" : "CoinVisio - AI That Simplifies Crypto Markets"}
                description={t('hero.subtitle')}
                keywords="crypto, cryptocurrency, AI market analysis, bitcoin, ethereum, trading signals, anomalies, price predictions"
                url="https://coinvisio.com"
                image="https://coinvisio.com/logotransparan.png"
            />

            {/* Global Background Grid */}
            <div className="fixed inset-0 grid-bg-global pointer-events-none z-0"></div>

            {/* Navbar */}
            <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#010205]/95 backdrop-blur-md border-b border-blue-900/20 py-3' : 'bg-transparent py-6'}`}>
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 flex items-center justify-center sharp-corners overflow-hidden">
                            <img src={logo} alt="CoinVisio Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xl font-light tracking-widest font-sans">COINVISIO</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-xs font-mono-custom text-gray-400 uppercase tracking-widest">
                        <a href="#features" className="hover:text-blue-400 transition-colors">{t('nav.features')}</a>
                        <a href="#how-it-works" className="hover:text-blue-400 transition-colors">{t('nav.process')}</a>
                        <a href="#iris" className="hover:text-blue-400 transition-colors">{t('nav.iris')}</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                        <Link to={earlyAccessPath} className="bg-white text-black px-6 py-2 text-xs font-bold uppercase tracking-wider hover:bg-blue-50 transition-colors sharp-corners border border-transparent hover:border-blue-200">
                            {t('nav.earlyAccess')}
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden border-b border-blue-900/10 z-10">
                <div className="absolute inset-0 grid-bg-hero z-0 pointer-events-none"></div>
                <div className="absolute inset-0 grid-accent z-0"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] hero-glow rounded-full blur-3xl pointer-events-none"></div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16">

                        {/* Hero Text */}
                        <div className="lg:w-1/2 lg:shrink-0 text-center lg:text-left">
                            <FadeInSection>
                                <div className="inline-flex items-center gap-2 px-3 py-1 border border-blue-500/30 bg-blue-900/10 text-blue-400 text-[10px] font-mono-custom uppercase tracking-widest mb-6 sharp-corners">
                                    <span className="w-1.5 h-1.5 bg-blue-500 animate-pulse"></span>
                                    {t('hero.status')}
                                </div>

                                <h1 className="text-5xl lg:text-7xl font-light leading-tight tracking-tighter mb-6 font-main text-white">
                                    {isTurkish ? (
                                        <>
                                            {t('hero.title.prefix')}{' '}
                                            <span className="script-highlight text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400 px-1 text-5xl lg:text-7xl">{t('hero.title.highlight')}</span>
                                            <span className="script-highlight text-blue-500 text-5xl lg:text-7xl">.</span>{' '}
                                            <span className="whitespace-nowrap">{t('hero.title.suffix')}</span>
                                        </>
                                    ) : (
                                        <>
                                            {t('hero.title.prefix')}{' '}
                                            <span className="script-highlight text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400 px-2 text-6xl lg:text-8xl">{t('hero.title.highlight')}</span>
                                            <span className="script-highlight text-blue-500 text-6xl lg:text-8xl">.</span> <br />
                                            {t('hero.title.suffix')}
                                        </>
                                    )}
                                </h1>

                                <p className="text-gray-400 text-lg lg:text-xl max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed font-light">
                                    {t('hero.subtitle')}
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                    <Link to={earlyAccessPath} className="group px-8 py-4 btn-slide-fill font-semibold sharp-corners flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                        <span>{t('hero.cta')}</span>
                                        <ArrowRight size={16} className="transition-all group-hover:translate-x-1" />
                                    </Link>
                                    <Link to="/intro?guest=true" className="group px-8 py-4 btn-slide-fill-dark font-semibold sharp-corners flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.06)]">
                                        <HelpCircle size={16} className="text-gray-400" />
                                        <span>{t('hero.how')}</span>
                                    </Link>
                                </div>
                            </FadeInSection>
                        </div>

                        {/* Hero Visual - System Intelligence Hub */}
                        <div className="lg:w-3/5 min-w-0 w-full relative">
                            <FadeInSection delay={200}>
                                <div className="relative z-10 bg-[#03050a] border border-gray-800 shadow-[0_0_50px_rgba(37,99,235,0.1)] p-1 sharp-corners group hover:border-gray-700 transition-colors duration-500">

                                    {/* Header */}
                                    <div className="bg-[#050505] border-b border-gray-800 p-2 flex items-center justify-between">
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                                        </div>
                                        <span className="text-[10px] font-mono-custom text-gray-500 tracking-widest uppercase">COINVISIO_INTELLIGENCE_HUB_V2.0</span>
                                    </div>

                                    {/* Main Dashboard Content */}
                                    <div className="p-4 bg-[#03050a] relative overflow-hidden flex flex-col gap-4 min-h-[500px]">
                                        {/* Background Effect */}
                                        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(100, 100, 100, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 100, 100, 0.5) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                                        {/* 1. Daily AI Briefing (Top) */}
                                        <div className="w-full bg-[#03050a] border border-gray-800 sharp-corners p-3 relative overflow-hidden">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 flex items-center justify-center sharp-corners bg-purple-500/10 text-purple-400">
                                                        <Brain size={14} />
                                                    </div>
                                                    <span className="text-xs font-bold text-white uppercase tracking-wider">{t('hero.dailyBriefing')}</span>
                                                </div>
                                                <span className="px-2 py-0.5 text-[10px] bg-green-500/10 text-green-400 border border-green-500/30 sharp-corners font-bold">{t('hero.bullishBias')}</span>
                                            </div>
                                            <div className="bg-[#070a16] border border-gray-800/70 p-2 sharp-corners">
                                                <div className="text-[10px] text-gray-300 font-mono-custom leading-relaxed overflow-hidden whitespace-nowrap">
                                                    <Typewriter
                                                        text={t('hero.typewriter')}
                                                        speed={30}
                                                        loop={true}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Main Grid Layout */}
                                        <div className="grid grid-cols-12 gap-4 flex-1">

                                            {/* Left Column: Regime & Watchlist (3 cols) */}
                                            <div className="col-span-3 flex flex-col gap-4">
                                                {/* Market Regime */}
                                                <div className="bg-[#080b14] border border-gray-800 p-3 sharp-corners flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                                                    <div className="absolute top-2 left-2 text-[8px] text-gray-500 font-mono-custom">MARKET_REGIME</div>
                                                    <BarChart3 size={24} className="text-gray-600 mb-2 absolute top-2 right-2 opacity-20" />

                                                    {/* Simple Gauge Visual */}
                                                    <div className="relative w-20 h-10 mt-4">
                                                        <div className="absolute inset-0 rounded-t-full border-[6px] border-gray-800 border-b-0"></div>
                                                        <div className="absolute inset-0 rounded-t-full border-[6px] border-green-500 border-b-0 border-l-transparent border-r-transparent transform -rotate-45 origin-bottom"></div>
                                                    </div>

                                                    <div className="text-sm font-bold text-white mt-1">BULLISH</div>
                                                    <div className="text-[8px] text-green-400 uppercase tracking-tight">ACCUMULATION_PHASE</div>

                                                    <div className="flex justify-between w-full mt-3 px-1 text-[7px] text-gray-600 font-mono-custom">
                                                        <span>VOL: 0.045</span>
                                                        <span>R: 1.2%</span>
                                                    </div>
                                                </div>

                                                {/* Watchlist */}
                                                <div className="bg-[#080b14] border border-gray-800 p-3 sharp-corners flex-1 flex flex-col">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[9px] text-gray-500 font-mono-custom uppercase">WATCHLIST</span>
                                                        <Activity size={10} className="text-blue-500" />
                                                    </div>
                                                    <div className="space-y-2 flex-1 relative overflow-hidden">
                                                        <div className="space-y-2 transition-all duration-500">
                                                            {mockWatchlist.slice(0, 3).map((coin, i) => (
                                                                <div key={`${coin.s}-${i}`} className="flex justify-between items-center bg-white/5 p-1.5 rounded-sm animate-in fade-in duration-500 slide-in-from-bottom-2">
                                                                    <span className="font-bold text-white text-[10px]">{coin.s}</span>
                                                                    <div className="text-right">
                                                                        <div className="text-[10px] text-gray-300">{coin.p}</div>
                                                                        <div className={`text-[8px] ${coin.up ? 'text-green-400' : 'text-red-400'}`}>{coin.c}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Center Column: Chart (6 cols) */}
                                            <div className="col-span-6 bg-[#020305] border border-gray-800 sharp-corners p-0 relative flex flex-col">
                                                {/* Chart Header */}
                                                <div className="p-3 border-b border-gray-800 flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white text-sm">BTC/USDT</span>
                                                        <span className="px-1 py-0.5 bg-green-500/20 text-green-400 text-[8px] font-bold sharp-corners">LIVE</span>
                                                    </div>
                                                    <span className="text-green-400 text-sm font-mono-custom font-bold">$43,248.50</span>
                                                </div>

                                                {/* Chart Area Mock */}
                                                <div className="flex-1 relative w-full overflow-hidden flex items-end pb-0 bg-[#020305] group/chart">
                                                    {/* Grid Lines */}
                                                    <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)', backgroundSize: '100% 40px' }}></div>

                                                    {/* Price Line SVG */}
                                                    <svg className="w-full h-full absolute inset-0 overflow-visible" preserveAspectRatio="none" viewBox="0 0 360 100">
                                                        <defs>
                                                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                                                                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                                                            </linearGradient>
                                                        </defs>

                                                        {/* Path for Area Fill */}
                                                        <path
                                                            d="M0,80 Q30,70 60,85 T120,60 T180,75 T240,40 T300,55 T360,20 V100 H0 Z"
                                                            fill="url(#chartGradient)"
                                                        />

                                                        {/* Path for Line */}
                                                        <path
                                                            d="M0,80 Q30,70 60,85 T120,60 T180,75 T240,40 T300,55 T360,20"
                                                            fill="none"
                                                            stroke="#22c55e"
                                                            strokeWidth="2"
                                                            vectorEffect="non-scaling-stroke"
                                                        />
                                                    </svg>

                                                    {/* Pulsing Dot at End of Line (Approximated Position) */}
                                                    <div className="absolute top-[20%] right-[0%] w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e] animate-pulse"></div>
                                                    <div className="absolute top-[20%] right-[0%] w-2 h-2 bg-green-500 rounded-full animate-ping opacity-50"></div>

                                                </div>

                                                {/* AI Analyzing Overlay - Bottom Center */}
                                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-900/10 backdrop-blur-sm border border-blue-500/30 px-3 py-1.5 sharp-corners flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                                    <span className="text-[9px] text-blue-400 font-mono-custom tracking-widest">AI_ANALYZING_PATTERN</span>
                                                </div>
                                            </div>

                                            {/* Right Column: Market Pulse & Anomaly (3 cols) */}
                                            <div className="col-span-3 flex flex-col gap-4">
                                                {/* AI Analysis Feed */}
                                                <div className="bg-[#080b14] border border-gray-800 p-3 sharp-corners flex-1 overflow-hidden flex flex-col">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[9px] text-gray-500 font-mono-custom uppercase">{t('hero.marketPulse')}</span>
                                                        <Layers size={10} className="text-purple-500" />
                                                    </div>
                                                    <div className="space-y-2 flex-1 overflow-hidden relative">
                                                        {activeSignals.map((signal, index) => (
                                                            <div
                                                                key={`${signal.pair}-${index}`}
                                                                className="bg-[#0a0f1e] p-2 border-l-2 transition-all duration-500 animate-in slide-in-from-right-4 fade-in"
                                                                style={{
                                                                    borderColor: signal.type === 'BULLISH'
                                                                        ? '#22c55e'
                                                                        : signal.type === 'BEARISH'
                                                                            ? '#ef4444'
                                                                            : '#9ca3af'
                                                                }}
                                                            >
                                                                <div className="flex justify-between mb-1">
                                                                    <span className="font-bold text-white text-[9px]">{signal.pair}</span>
                                                                    <span className={`text-[8px] px-1 rounded ${signal.type === 'BULLISH'
                                                                        ? 'text-green-400 bg-green-900/30'
                                                                        : signal.type === 'BEARISH'
                                                                            ? 'text-red-400 bg-red-900/30'
                                                                            : 'text-gray-300 bg-white/5'
                                                                        }`}
                                                                    >
                                                                        {signal.type}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between text-[8px] font-mono-custom text-gray-500">
                                                                    <div>
                                                                        <div className="uppercase">{t('hero.ref')}</div>
                                                                        <div className="text-gray-300">{signal.ref}</div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="uppercase">{t('hero.band')}</div>
                                                                        <div className="text-gray-300">{signal.proj}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Anomaly Detection List */}
                                                <div className="bg-[#0f0505] border border-red-900/30 p-3 sharp-corners flex-1 flex flex-col relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none"></div>
                                                    <div className="flex justify-between items-center mb-3 relative z-10">
                                                        <div className="flex items-center gap-2 text-red-400 text-[8px] font-mono-custom uppercase tracking-wider">
                                                            <Activity size={10} />
                                                            <span>{t('hero.anomalies')}</span>
                                                        </div>
                                                        <Scan size={10} className="text-red-500 animate-spin-slow" />
                                                    </div>

                                                    <div className="space-y-2 relative z-10 overflow-hidden flex-1">
                                                        {activeAnomalies.map((ad, idx) => (
                                                            <div key={`${ad.sym}-${idx}`} className="bg-black/40 border border-red-900/30 p-1.5 sharp-corners flex items-center gap-2 animate-in slide-in-from-right-4 fade-in duration-500">
                                                                <div className="w-5 h-5 flex items-center justify-center rounded-sm bg-red-500/20 text-red-500 shrink-0">
                                                                    <AlertTriangle size={10} />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[9px] font-bold text-white">{ad.sym}</span>
                                                                        <span className="text-[8px] text-gray-500 font-mono-custom">{formatRelativeTime(ad.value, ad.unit)}</span>
                                                                    </div>
                                                                    <div className="text-[8px] text-red-300 truncate">{ad.msg}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                        </div>

                                    </div>

                                    {/* Footer Status */}
                                    <div className="bg-[#050505] p-2 border-t border-gray-800 flex justify-between items-center text-[9px] font-mono-custom text-gray-600">
                                        <div className="flex gap-3">
                                            <span>CPU: 12%</span>
                                            <span>MEM: 480MB</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                            <span className="text-green-400 font-bold">SYSTEM_OPTIMAL</span>
                                        </div>
                                    </div>

                                </div>

                                {/* Decorative Tech Elements */}
                                <div className="absolute -bottom-4 -right-4 w-16 h-16 border-r border-b border-blue-500/20 sharp-corners"></div>
                                <div className="absolute -top-4 -left-4 w-8 h-8 border-l border-t border-blue-500/20 sharp-corners"></div>
                            </FadeInSection>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust & Stats Bar */}
            <section ref={statsRef} className="py-8 border-b border-blue-900/10 bg-[#020308]/80 backdrop-blur z-10 relative">
                <FadeInSection>
                    <div className="container mx-auto px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {statsData.map((stat, i) => (
                                <div key={i} className="flex flex-col items-center justify-center border-r border-blue-900/10 last:border-0">
                                    <span className="text-2xl font-bold font-mono-custom text-white">
                                        <CountUp
                                            start={statsVisible}
                                            end={stat.value}
                                            suffix={stat.suffix}
                                            prefix={stat.prefix}
                                            decimals={stat.decimals || 0}
                                        />
                                    </span>
                                    <span className="text-xs text-gray-500 uppercase tracking-widest">{t(stat.labelKey)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </FadeInSection>
            </section>

            {/* Process Section */}
            <section id="how-it-works" className="py-24 relative z-10 bg-[#010205]">
                <FadeInSection className="container mx-auto px-6">
                    <div className="text-center mb-24 relative z-20">
                        <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-wide pb-2 leading-relaxed">
                            {t('process.title')}<span className="text-blue-500">.</span>
                        </h2>
                        <p className="text-gray-400 font-light max-w-3xl mx-auto text-xl md:text-2xl leading-relaxed">
                            {t('process.subtitle')}
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-12 relative">
                        <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

                        {/* Step 1 */}
                        <div className="w-full md:w-1/3 flex flex-col items-center text-center group">
                            <div className="w-24 h-24 bg-[#0a0f1e] border border-gray-800 flex items-center justify-center mb-8 relative sharp-corners group-hover:border-blue-500/50 transition-colors">
                                <div className="absolute -inset-1 border border-gray-800 opacity-50 scale-90"></div>
                                <Activity className="text-gray-500" size={32} />
                            </div>
                            <h3 className="text-lg font-bold font-mono-custom mb-2 text-gray-300 uppercase">{t('process.step1.title')}</h3>
                            <p className="text-xs text-gray-500 max-w-[200px] leading-relaxed">{t('process.step1.desc')}</p>
                        </div>

                        {/* Step 2 (Core) */}
                        <div className="w-full md:w-1/3 flex flex-col items-center text-center">
                            <div className="w-32 h-32 bg-black border border-blue-500 flex items-center justify-center mb-8 relative sharp-corners shadow-[0_0_40px_rgba(37,99,235,0.15)]">
                                <div className="absolute inset-1 border border-blue-500/30"></div>
                                <div className="absolute inset-0 bg-blue-500/5 animate-pulse"></div>
                                <Brain className="text-blue-500 relative z-10" size={40} />
                                <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500"></div>
                                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500"></div>
                            </div>
                            <h3 className="text-lg font-bold font-mono-custom mb-2 text-white uppercase">{t('process.step2.title')}</h3>
                            <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">{t('process.step2.desc')}</p>
                        </div>

                        {/* Step 3 */}
                        <div className="w-full md:w-1/3 flex flex-col items-center text-center group">
                            <div className="w-24 h-24 bg-[#0a0f1e] border border-blue-500/30 flex items-center justify-center mb-8 relative sharp-corners group-hover:border-blue-400 transition-colors">
                                <Zap className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" size={32} />
                            </div>
                            <h3 className="text-lg font-bold font-mono-custom mb-2 text-white uppercase">{t('process.step3.title')}</h3>
                            <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">{t('process.step3.desc')}</p>
                        </div>
                    </div>
                </FadeInSection>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 relative z-10">
                <FadeInSection className="relative max-w-6xl mx-auto px-6">

                    <div className="text-center mb-24 relative z-20">
                        <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 pb-2 leading-relaxed">
                            {t('modules.title')}<span className="text-blue-500">.</span>
                        </h2>
                        <p className="text-gray-400 font-light max-w-3xl mx-auto text-xl md:text-2xl leading-relaxed">
                            {t('modules.subtitle')}
                        </p>
                    </div>

                    <div className="relative max-w-5xl mx-auto">
                        {/* Connection Lines Layer */}
                        <div className="absolute inset-0 pointer-events-none hidden md:block">
                            <div className="flow-line-h top-[25%] left-[20%] right-[20%]"><div className="flow-packet-h"></div></div>
                            <div className="flow-line-h top-[75%] left-[20%] right-[20%]"><div className="flow-packet-h" style={{ animationDelay: '1.5s' }}></div></div>
                            <div className="flow-line-v left-[25%] top-[10%] bottom-[10%]"><div className="flow-packet-v" style={{ animationDelay: '0.5s' }}></div></div>
                            <div className="flow-line-v right-[25%] top-[10%] bottom-[10%]"><div className="flow-packet-v" style={{ animationDelay: '2s' }}></div></div>
                            <div className="flow-line-v left-1/2 top-[50%] bottom-0 h-[50%]"><div className="flow-packet-v" style={{ animationDelay: '1s' }}></div></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 relative z-10">
                            <FeatureCard
                                icon={<BarChart3 />}
                                title={t('modules.marketPulse.title')}
                                desc={t('modules.marketPulse.desc')}
                            />
                            <FeatureCard
                                icon={<Cpu />}
                                title={t('modules.analysisHub.title')}
                                desc={t('modules.analysisHub.desc')}
                            />
                            <FeatureCard
                                icon={<Activity />}
                                title={t('modules.anomalyRadar.title')}
                                desc={t('modules.anomalyRadar.desc')}
                            />
                            <FeatureCard
                                icon={<Bell />}
                                title={t('modules.coins.title')}
                                desc={t('modules.coins.desc')}
                                badgeText=""
                            />
                            <FeatureCard
                                icon={<Terminal />}
                                title={t('modules.briefing.title')}
                                desc={t('modules.briefing.desc')}
                            />
                            <FeatureCard
                                icon={<ShieldCheck />}
                                title={t('modules.aiInsights.title')}
                                desc={t('modules.aiInsights.desc')}
                            />
                        </div>
                    </div>
                </FadeInSection>
            </section>

            {/* Iris AI Section */}
            <section id="iris" className="py-32 relative overflow-hidden border-t border-blue-900/20 bg-[#010205] z-10">
                <FadeInSection className="container mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-20">

                        {/* Text Content */}
                        <div className="lg:w-1/2">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 flex items-center justify-center bg-blue-600/20 rounded-full">
                                    <MessageSquare size={16} className="text-blue-400" />
                                </div>
                                <span className="text-blue-400 font-mono-custom text-sm tracking-wider uppercase">{t('iris.badge')}</span>
                            </div>

                            <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-white tracking-wide relative z-20 pb-2 leading-relaxed">
                                {isTurkish ? (
                                    <>
                                        <span className="text-glow-white">IRIS AI</span> İLE TANIŞIN<span className="text-blue-500">.</span>
                                    </>
                                ) : (
                                    <>
                                        {t('iris.title')} <span className="text-glow-white">IRIS AI</span><span className="text-blue-500">.</span>
                                    </>
                                )}
                            </h2>

                            <p className="text-gray-400 text-lg md:text-xl mb-12 leading-relaxed font-light">
                                {t('iris.subtitle')}
                            </p>

                            {/* Feature Steps */}
                            <div className="relative space-y-0 pl-0">
                                <div className="absolute left-[39px] top-8 bottom-8 w-[2px] bg-gradient-to-b from-blue-600/50 via-blue-400/30 to-white/20 z-0">
                                    <div className="data-packet"></div>
                                </div>

                                {/* Step 1 Node */}
                                <div className="relative flex items-center gap-6 mb-8 group z-10">
                                    <div className="w-20 h-20 bg-[#050810] border border-blue-900/50 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.15)] group-hover:border-blue-500 transition-all duration-300 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <Database size={28} className="text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                                        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                    </div>
                                    <div className="flex-1 bg-[#0a0f1e]/50 p-4 border border-white/5 rounded-r-xl border-l-2 border-l-blue-500 backdrop-blur-sm hover:bg-[#0a0f1e] transition-colors">
                                        <h4 className="text-white font-medium text-lg mb-1 tracking-wide flex items-center gap-2">
                                            {t('iris.step1.title')} <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded font-mono-custom">STEP 01</span>
                                        </h4>
                                        <p className="text-gray-400 font-light text-sm leading-relaxed">{t('iris.step1.desc')}</p>
                                    </div>
                                </div>

                                {/* Step 2 Node */}
                                <div className="relative flex items-center gap-6 mb-8 group z-10">
                                    <div className="w-20 h-20 bg-[#050810] border border-sky-800/50 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.15)] group-hover:border-sky-300 transition-all duration-300 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-sky-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <Globe size={28} className="text-sky-200 group-hover:scale-110 transition-transform duration-300" />
                                        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-sky-300 rounded-full animate-pulse"></div>
                                    </div>
                                    <div className="flex-1 bg-[#0a0f1e]/50 p-4 border border-white/5 rounded-r-xl border-l-2 border-l-sky-300 backdrop-blur-sm hover:bg-[#0a0f1e] transition-colors">
                                        <h4 className="text-white font-medium text-lg mb-1 tracking-wide flex items-center gap-2">
                                            {t('iris.step2.title')} <span className="text-[10px] bg-sky-900/40 text-sky-200 px-1.5 py-0.5 rounded font-mono-custom">STEP 02</span>
                                        </h4>
                                        <p className="text-gray-400 font-light text-sm leading-relaxed">{t('iris.step2.desc')}</p>
                                    </div>
                                </div>

                                {/* Step 3 Node */}
                                <div className="relative flex items-center gap-6 group z-10">
                                    <div className="w-20 h-20 bg-[#050810] border border-gray-600/50 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:border-white transition-all duration-300 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <History size={28} className="text-gray-300 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                                        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                    </div>
                                    <div className="flex-1 bg-[#0a0f1e]/50 p-4 border border-white/5 rounded-r-xl border-l-2 border-l-gray-400 backdrop-blur-sm hover:bg-[#0a0f1e] transition-colors">
                                        <h4 className="text-white font-medium text-lg mb-1 tracking-wide flex items-center gap-2">
                                            {t('iris.step3.title')} <span className="text-[10px] bg-gray-800 text-white px-1.5 py-0.5 rounded font-mono-custom">STEP 03</span>
                                        </h4>
                                        <p className="text-gray-400 font-light text-sm leading-relaxed">{t('iris.step3.desc')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12">
                                <Link to="/auth-choice" className="group px-8 py-4 btn-slide-fill-dark font-semibold sharp-corners flex items-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.06)]">
                                    {t('iris.startChat')} <ChevronRight size={14} />
                                </Link>
                            </div>
                        </div>

                        {/* Mobile Chat Interface Mockup */}
                        <div className="lg:w-1/2 w-full flex justify-center perspective-1000" style={{ transformStyle: 'preserve-3d' }}>
                            <div className="relative w-[340px] h-[680px] bg-[#000] rounded-[40px] shadow-[0_0_60px_rgba(37,99,235,0.15)] p-2 border-[4px] border-[#1a1f30] overflow-hidden transform rotate-y-[-10deg] rotate-x-[5deg] hover:transform-none transition-all duration-700">

                                {/* Dynamic Island Area */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[25px] bg-black rounded-b-[16px] z-30 flex justify-center items-center">
                                    <div className="w-16 h-1 rounded-full bg-gray-900"></div>
                                </div>

                                {/* Screen Content */}
                                <div className="w-full h-full bg-gradient-to-b from-[#0a0f1e] to-[#010205] rounded-[32px] overflow-hidden flex flex-col relative">

                                    {/* Chat Header */}
                                    <div className="pt-10 pb-4 px-6 border-b border-white/5 flex justify-between items-center backdrop-blur-md bg-[#0a0f1e]/80 sticky top-0 z-20">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                    <Brain size={18} className="text-white" />
                                                </div>
                                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#0a0f1e] rounded-full"></div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">IRIS AI</div>
                                                <div className="text-[10px] text-blue-400 font-medium">{t('iris.onlineAgent')}</div>
                                            </div>
                                        </div>
                                        <div className="p-2 bg-white/5 rounded-full">
                                            <Radio size={16} className="text-gray-400" />
                                        </div>
                                    </div>

                                    {/* Messages Area */}
                                    <div className="flex-1 p-5 overflow-y-auto space-y-6 scrollbar-hide">

                                        {/* User Message */}
                                        {chatStep >= 1 && (
                                            <div className="flex justify-end chat-bubble-enter">
                                                <div className="chat-bubble-3d bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm p-4 rounded-[20px] rounded-tr-[4px] max-w-[85%] font-light">
                                                    {t('iris.userQuestion')}
                                                </div>
                                            </div>
                                        )}

                                        {/* Processing Indicator */}
                                        {chatStep === 2 && (
                                            <div className="flex justify-start chat-bubble-enter">
                                                <div className="bg-[#1a1f30]/80 backdrop-blur-sm border border-white/5 p-3 rounded-[16px] max-w-[90%] space-y-2 chat-bubble-3d">
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono-custom">
                                                        <Database size={12} className="text-blue-400 animate-pulse" />
                                                        <span>{t('iris.processing.core')} <span className="text-green-400">{t('iris.processing.done')}</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono-custom">
                                                        <Globe size={12} className="text-yellow-400 animate-pulse" />
                                                        <span>{t('iris.processing.web')} <span className="text-green-400">{t('iris.processing.done')}</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono-custom">
                                                        <History size={12} className="text-purple-400" />
                                                        <span>{t('iris.processing.context')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Iris Response */}
                                        {chatStep >= 3 && (
                                            <div className="flex justify-start chat-bubble-enter">
                                                <div className="chat-bubble-3d bg-[#151925] text-gray-200 text-sm p-4 rounded-[20px] rounded-tl-[4px] max-w-[95%] border border-white/5 font-light">
                                                    <p className="mb-3 leading-relaxed">
                                                        <Typewriter
                                                            text={t('iris.response')}
                                                            speed={15}
                                                        />
                                                    </p>

                                                    {chatStep >= 4 && (
                                                        <div className="space-y-3 processing-step step-1">
                                                            <div className="bg-blue-900/10 border border-blue-500/20 p-2.5 rounded-lg">
                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                    <Globe size={10} className="text-blue-400" />
                                                                    <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">{t('iris.webInsight')}</span>
                                                                </div>
                                                                <p className="text-xs text-gray-300 leading-relaxed">
                                                                    {t('iris.webInsightBody')}
                                                                </p>
                                                            </div>

                                                            <div className="pl-2 border-l-2 border-gray-700">
                                                                <span className="text-[10px] text-gray-500 font-mono-custom uppercase block mb-1">{t('iris.sourcesScanned')}</span>
                                                                <div className="flex flex-wrap gap-2">
                                                                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400">Bloomberg Macro</span>
                                                                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400">CoinDesk</span>
                                                                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400">Fed Reports</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {chatStep >= 4 && (
                                                        <p className="text-xs text-gray-400 processing-step step-2 mt-3 pt-3 border-t border-white/5">
                                                            {t('iris.note')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    </div>

                                    {/* Input Area */}
                                    <div className="p-4 bg-[#0a0f1e]/90 backdrop-blur-md border-t border-white/5 absolute bottom-0 w-full">
                                        <div className="flex items-center gap-3 bg-[#050810] rounded-full px-5 py-3 border border-white/10 shadow-inner">
                                            <input type="text" placeholder={t('iris.inputPlaceholder')} className="bg-transparent text-sm text-white focus:outline-none w-full placeholder-gray-600 font-light" disabled />
                                            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                                                <Send size={14} className="text-blue-400" />
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                </FadeInSection>
            </section>

            {/* Final CTA */}
            <section className="py-32 relative overflow-hidden z-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'linear-gradient(rgba(37, 99, 235, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(37, 99, 235, 0.1) 1px, transparent 1px)',
                    backgroundSize: '100px 100px',
                    maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                }}></div>

                <FadeInSection className="container mx-auto px-6 relative z-10 text-center">
                    <h2 className="text-5xl md:text-7xl font-semibold mb-10 tracking-wide font-main text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 relative z-20 pb-2 leading-relaxed">
                        {t('cta.title')}<span className="text-blue-500">.</span>
                    </h2>

                    <div className="max-w-xl mx-auto relative">
                        <form onSubmit={handleJoinWaitlist} className="flex items-center gap-3 p-2 bg-[#050810] border border-gray-800 rounded-full shadow-2xl pl-6">
                            <input
                                type="email"
                                placeholder={t('cta.inputPlaceholder')}
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-transparent border-none text-white focus:outline-none w-full text-sm font-light placeholder-gray-600"
                                autoComplete="off"
                            />

                            <button
                                type="submit"
                                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-lg shrink-0"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </form>

                        {submitted && (
                            <div className="mt-4 text-xs font-mono-custom animate-pulse text-green-500">
                                {t('cta.success')}
                            </div>
                        )}
                    </div>
                </FadeInSection>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-blue-900/10 bg-[#010205] text-center z-10 relative">
                <div className="container mx-auto px-6">
                    <div className="flex justify-center items-center gap-3 mb-6 opacity-60">
                        <div className="w-10 h-10 flex items-center justify-center sharp-corners overflow-hidden">
                            <img src={logo} alt="CoinVisio Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-light font-sans tracking-widest text-sm">COINVISIO</span>
                    </div>

                    {/* Legal Links */}
                    <div className="flex justify-center gap-6 mb-8 text-[10px] items-center text-gray-500 uppercase font-mono-custom tracking-wider">
                        <a href="mailto:info@coinvisio.com" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
                            <Mail size={12} />
                            info@coinvisio.com
                        </a>
                        <span className="text-gray-800">|</span>
                        <button onClick={() => openLegalModal('privacy')} className="hover:text-blue-400 transition-colors">{t('footer.privacy')}</button>
                        <span className="text-gray-800">|</span>
                        <button onClick={() => openLegalModal('terms')} className="hover:text-blue-400 transition-colors">{t('footer.terms')}</button>
                        <span className="text-gray-800">|</span>
                        <button onClick={() => openLegalModal('disclaimer')} className="hover:text-blue-400 transition-colors">{t('footer.disclaimer')}</button>
                    </div>

                    {/* Risk Disclaimer Text */}
                    <div className="max-w-3xl mx-auto border border-red-500/10 bg-red-900/5 p-4 sharp-corners mb-8">
                        <div className="flex items-center justify-center gap-2 mb-2 text-red-500/80">
                            <ShieldCheck size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{t('footer.riskWarning')}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed max-w-2xl mx-auto">
                            {t('footer.riskText')}
                        </p>
                    </div>

                    <p className="text-gray-600 text-xs font-mono-custom uppercase">{t('footer.systemOnline')}</p>
                </div>
            </footer>

            {/* Legal Modal */}
            <LegalModal
                isOpen={isLegalModalOpen}
                onClose={() => setIsLegalModalOpen(false)}
                initialTab={activeLegalTab}
            />
        </div>
    );
};

export default Index;







