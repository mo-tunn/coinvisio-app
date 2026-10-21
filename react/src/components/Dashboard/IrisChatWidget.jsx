import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare,
    X,
    ArrowRight,
    Bot,
    Loader,
    Maximize2,
    Minimize2,
    History,
    Plus,
    ChevronLeft,
    Sparkles,
    MoreHorizontal,
    Eye,
    BookOpen,
    ExternalLink,
    Trash2,
    GripVertical
} from 'lucide-react';
import { irisService } from '../../services/iris.service';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

// --- Sub-Component: Sources List ---
const SourcesList = ({ sourcesText, title }) => {
    const [showAllModal, setShowAllModal] = useState(false);
    if (!sourcesText) return null;

    // Detect markdown links [Title](URL)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [];
    let match;
    while ((match = linkRegex.exec(sourcesText)) !== null) {
        links.push({ title: match[1], url: match[2] });
    }

    if (links.length === 0) return null;

    const displayLinks = links.slice(0, 3);
    const hasMore = links.length > 3;

    return (
        <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-gray-500 mb-2">
                <BookOpen size={12} /> {title}
            </div>
            <div className="space-y-1">
                {displayLinks.map((link, idx) => (
                    <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-[#080b14] hover:bg-[#0f1422] border border-gray-800 rounded text-xs text-blue-400 hover:text-blue-300 transition-colors group"
                    >
                        <ExternalLink size={10} className="opacity-50 group-hover:opacity-100 shrink-0" />
                        <span className="truncate">{link.title}</span>
                    </a>
                ))}

                {hasMore && (
                    <button
                        onClick={() => setShowAllModal(true)}
                        className="w-full mt-2 py-1.5 px-3 bg-[#080b14] hover:bg-[#0f1422] border border-gray-700 rounded text-[10px] uppercase font-bold text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-1"
                    >
                        <Plus size={10} /> {links.length - 3} More Sources
                    </button>
                )}
            </div>

            {/* Sources Modal */}
            {showAllModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#050810] border border-gray-800 sharp-corners w-full max-w-md max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-gray-800">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <BookOpen size={16} className="text-blue-500" />
                                All Sources ({links.length})
                            </h3>
                            <button
                                onClick={() => setShowAllModal(false)}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 sharp-corners transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-2">
                            {links.map((link, idx) => (
                                <a
                                    key={idx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-3 p-3 bg-[#080b14] hover:bg-[#0f1422] border border-gray-800 rounded text-sm text-blue-400 hover:text-blue-300 transition-colors group"
                                >
                                    <ExternalLink size={14} className="opacity-50 group-hover:opacity-100 shrink-0 mt-0.5" />
                                    <span className="break-words leading-snug">{link.title}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const IrisChatWidget = () => {
    const { user } = useAuth();
    const { t } = useTranslation('iris');
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const defaultGreeting = t('greeting');
    const [messages, setMessages] = useState([
        { id: 1, type: 'bot', text: defaultGreeting }
    ]);
    const [input, setInput] = useState('');

    // Custom Event Listener for external triggers
    useEffect(() => {
        const handleOpenIrisChat = (e) => {
            const { prompt } = e.detail;
            if (prompt) {
                setIsOpen(true);
                if (isExpanded) {
                    setIsExpanded(false);
                }
                setInput(prompt);

                // We need to wait for state to update, then submit.
                // A better approach is to use a ref to trigger sending.
                setTimeout(() => {
                    const form = document.getElementById('iris-chat-form');
                    if (form) {
                        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }
                }, 100);
            }
        };

        window.addEventListener('open-iris-chat', handleOpenIrisChat);
        return () => window.removeEventListener('open-iris-chat', handleOpenIrisChat);
    }, [isExpanded]);


    // UX States
    const [loadingState, setLoadingState] = useState(null); // 'thinking', 'analyzing', 'fetching', null
    const [isStreaming, setIsStreaming] = useState(false);
    const [history, setHistory] = useState([]);
    const [usage, setUsage] = useState({ used: 0, limit: 20, tier: 'free' });

    // Smooth Streaming Refs
    const streamBuffer = useRef('');
    const streamingActive = useRef(false);
    const displayedTextRef = useRef(''); // Tracks what's currently on screen to avoid stale closures
    const currentBotMsgId = useRef(null);
    const currentSessionId = useRef(null);

    const messagesEndRef = useRef(null);

    // Draggable position (only for non-expanded mode)
    const [position, setPosition] = useState({ x: null, y: null });
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loadingState, isStreaming]);

    // Loading Text Cycler
    useEffect(() => {
        if (!loadingState) return;
        const states = [t('loading.thinking'), t('loading.scanning'), t('loading.analyzing'), t('loading.formulating')];
        // We can create a visual cycler here if needed, but for now specific states are handled by parent logic 
        // or we just render based on 'loadingState' string if it changes.
    }, [loadingState, t]);

    // Smooth Typewriter Logic
    useEffect(() => {
        let animationFrame;

        const typeWriterLoop = () => {
            if (streamBuffer.current.length > 0) {
                // Determine speed based on buffer size (catch up if behind)
                const charsToType = streamBuffer.current.length > 50 ? 5 : streamBuffer.current.length > 20 ? 3 : 1;
                const chunk = streamBuffer.current.slice(0, charsToType);
                streamBuffer.current = streamBuffer.current.slice(charsToType);

                displayedTextRef.current += chunk;

                setMessages(prev => prev.map(msg => {
                    if (msg.id === currentBotMsgId.current) {
                        return { ...msg, text: displayedTextRef.current };
                    }
                    return msg;
                }));
            } else if (!streamingActive.current && isStreaming) {
                // Network done AND buffer empty -> Stop visual streaming
                setIsStreaming(false);
            }

            if (isStreaming || streamBuffer.current.length > 0) {
                // Use setTimeout for control, requestAnimationFrame for smoothness
                // 20ms = ~50 chars/sec (normal reading/speaking speed)
                setTimeout(() => requestAnimationFrame(typeWriterLoop), 20);
            }
        };

        if (isStreaming) {
            typeWriterLoop();
        }

        return () => cancelAnimationFrame(animationFrame);
    }, [isStreaming]);

    useEffect(() => {
        const loadHistory = async () => {
            if (isOpen && user) {
                // Preload history when widget opens
                const data = await irisService.getHistory(user.id);
                setHistory(data);
            }
        };
        loadHistory();
    }, [isOpen, user]); // Preload when widget opens

    // Fetch Usage
    useEffect(() => {
        const fetchUsage = async () => {
            if (isOpen && user) {
                const tier = user.user_metadata?.subscription_tier || 'free';
                const data = await irisService.getUsage(user.id, tier);
                setUsage(data);
            }
        };
        fetchUsage();
    }, [isOpen, user, messages.length]); // Refresh after messages change

    // Helper: Parse content for sources & Bold Text
    const renderMessageContent = (msg) => {
        if (msg.type === 'user') return msg.text;

        // Split Sources if present (format: **📚 Sources:**)
        const sourceMatch = msg.text.match(/\*\*(?:📚\s*)?(?:Sources|Kaynaklar):\*\*/i);
        const splitIndex = sourceMatch ? sourceMatch.index : -1;

        let mainText = msg.text;
        let sourcesText = null;

        if (splitIndex !== -1) {
            mainText = msg.text.substring(0, splitIndex).trim();
            sourcesText = msg.text.substring(splitIndex);
        }

        // Bold Text Parser
        // Splits by **text** and renders alternating plain/strong
        const renderBold = (text) => {
            const parts = text.split(/(\*\*[^*]+\*\*)/g);
            return parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
                }
                return part;
            });
        };

        return (
            <>
                <div className="whitespace-pre-wrap font-mono text-xs md:text-sm text-gray-300">
                    {renderBold(mainText)}
                    {msg.isStreaming && <span className="inline-block w-1.5 h-3 ml-1 bg-blue-500 animate-pulse" />}
                </div>
                {sourcesText && <SourcesList sourcesText={sourcesText} title={t('sources.title')} />}
            </>
        );
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
        if (!isExpanded) setShowHistory(true);
    };

    // Drag Handlers
    const handleDragStart = (e) => {
        if (isExpanded) return;
        isDragging.current = true;
        const rect = e.currentTarget.closest('[data-iris-container]').getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
    };

    const handleDragMove = (e) => {
        if (!isDragging.current) return;
        const newX = e.clientX - dragOffset.current.x;
        const newY = e.clientY - dragOffset.current.y;
        // Clamp to viewport (use button size 64x64, with some padding)
        const buttonSize = 64;
        const maxX = window.innerWidth - buttonSize - 8;
        const maxY = window.innerHeight - buttonSize - 8;
        setPosition({
            x: Math.max(8, Math.min(newX, maxX)),
            y: Math.max(8, Math.min(newY, maxY))
        });
    };

    const handleDragEnd = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
    };

    // Fixed Layout Logic (with drag position support)
    // Only apply drag position to the CLOSED button, not the open widget
    const getButtonStyle = () => {
        if (position.x !== null && position.y !== null) {
            return { left: position.x, top: position.y, right: 'auto', bottom: 'auto' };
        }
        return {}; // Default CSS positioning
    };

    const containerClasses = isExpanded
        ? "fixed inset-0 md:inset-10 bg-[#050810] border border-blue-900/50 shadow-2xl z-[100] flex sharp-corners animate-in zoom-in-95 duration-200 overflow-hidden"
        : "fixed inset-0 md:inset-auto md:bottom-8 md:right-8 w-full h-[100dvh] md:w-[380px] md:h-[600px] md:max-h-[80vh] bg-[#050810] md:border md:border-blue-900/30 shadow-2xl z-[100] flex flex-col md:sharp-corners overflow-hidden";

    const loadSession = async (sess) => {
        if (loadingState || isStreaming) return;

        setLoadingState('fetching');
        try {
            const dbMessages = await irisService.getChatLog(sess.id);

            // Convert DB format to UI format
            const uiMessages = dbMessages.map((msg, idx) => ({
                id: Date.now() + idx,
                type: msg.role === 'user' ? 'user' : 'bot',
                text: msg.content,
                isStreaming: false
            }));

            // If empty (shouldn't be), keep default greeting. Else replace.
            if (uiMessages.length > 0) {
                setMessages(uiMessages);
            }

            currentSessionId.current = sess.id;
            // setCurrentSessionIdState(sess.id) // If we use state

            // Close mobile sidebar if open
            if (!isExpanded) setShowHistory(false);

        } catch (err) {
            console.error("Failed to load session:", err);
        } finally {
            setLoadingState(null);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        if (!user) {
            setMessages(prev => [...prev, { id: Date.now(), type: 'bot', text: t('chat.loginRequired') }]);
            return;
        }

        const userText = input;
        const userMsg = { id: Date.now(), type: 'user', text: userText };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Optimistic Usage Increment (instant feedback)
        setUsage(prev => ({ ...prev, used: prev.used + 1 }));

        // Start Loading (NO BUBBLE YET - Fixes Artifact)
        setLoadingState('thinking');
        currentBotMsgId.current = Date.now() + 1;
        displayedTextRef.current = '';
        streamBuffer.current = '';
        streamingActive.current = true;

        try {
            const tier = user.user_metadata?.subscription_tier || 'Free';
            let isFirstChunk = true;

            await irisService.streamAskIris(
                userText,
                user.id,
                tier,
                (chunk) => {
                    if (isFirstChunk) {
                        setLoadingState(null);
                        setIsStreaming(true); // Starts the Typewriter Loop via useEffect
                        // Create the message bubble ONLY now. logic is moved here to avoid artifact.
                        setMessages(prev => [...prev, { id: currentBotMsgId.current, type: 'bot', text: '', isStreaming: true }]);
                        isFirstChunk = false;
                    }

                    // Buffer the chunk
                    streamBuffer.current += chunk;
                },
                currentSessionId.current, // Pass current session ID from ref
                (newSessionId) => { // Callback to capture new session ID
                    currentSessionId.current = newSessionId; // Update ref

                    // Optimistic History Update - Add new chat to history list immediately
                    setHistory(prev => {
                        // Check if this session already exists
                        if (prev.some(h => h.id === newSessionId)) return prev;
                        // Add to top of list
                        const newItem = {
                            id: newSessionId,
                            title: userText.slice(0, 40) + (userText.length > 40 ? '...' : ''),
                            date: new Date().toISOString().split('T')[0],
                            last_msg_time: new Date().toISOString()
                        };
                        return [newItem, ...prev];
                    });
                }
            );

            // Network Finished
            streamingActive.current = false;
            // The useEffect loop will unset isStreaming when buffer is empty

        } catch (err) {
            console.error("Iris Error:", err);
            let errorText = t('chat.errorNetwork');

            // Debugging: Show actual error details if available
            if (err.message) {
                errorText += `\n\n${t('chat.errorDebug')}: ${err.message}`;
            }
            if (err.response && err.response.data) {
                errorText += `\n\n${t('chat.errorServer')}: ${typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)}`;
            }

            if (err.response && err.response.status === 429) {
                errorText = `**${t('chat.limitReached')}**\n\n${t('chat.limitBody')}\n\n**${t('chat.limitFree')}**\n**${t('chat.limitPremium')}**`;
            }

            setLoadingState(null);
            streamingActive.current = false;
            setIsStreaming(false);

            // If error, likely no bubble existed if it failed fast, or it exists if it failed mid-stream
            // We force add/update
            setMessages(prev => {
                const existing = prev.find(m => m.id === currentBotMsgId.current);
                if (existing) {
                    return prev.map(msg => msg.id === currentBotMsgId.current ? { ...msg, text: msg.text + "\n\n" + errorText, isStreaming: false, isError: true } : msg);
                } else {
                    return [...prev, { id: currentBotMsgId.current, type: 'bot', text: errorText, isStreaming: false, isError: true }];
                }
            });
        }
    };

    return (
        <>
            {/* Toggle Button (Draggable) */}
            {!isOpen && (
                <div
                    data-iris-container
                    className="fixed bottom-8 right-8 z-50 flex flex-col items-center"
                    style={getButtonStyle()}
                >
                    {/* Drag Handle */}
                    <div
                        onMouseDown={handleDragStart}
                        className="w-8 h-4 bg-gray-800/80 rounded-t flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-gray-700/80 transition-colors"
                        title={t('button.drag')}
                    >
                        <MoreHorizontal size={14} className="text-gray-400" />
                    </div>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)] flex items-center justify-center sharp-corners transition-all hover:scale-105 group"
                    >
                        <Eye size={28} className="group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className={containerClasses}>

                    {/* Sidebar (History) */}
                    {(isExpanded || showHistory) && (
                        <div className={`${isExpanded ? 'w-64' : 'absolute inset-0 z-20 bg-[#050810]'} border-r border-gray-800 flex flex-col transition-all`}>
                            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('history.title')}</span>
                                {!isExpanded && (
                                    <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                <button
                                    onClick={() => {
                                        currentSessionId.current = null;
                                        setMessages([{ id: 1, type: 'bot', text: defaultGreeting }]);
                                        if (!isExpanded) setShowHistory(false);
                                    }}
                                    className="w-full text-left p-3 mb-2 bg-blue-900/20 text-blue-400 border border-blue-900/50 sharp-corners text-xs font-bold flex items-center gap-2 hover:bg-blue-900/30"
                                >
                                    <Plus size={14} /> {t('history.newChat')}
                                </button>
                                <div className="space-y-1">
                                    {history.map(item => (
                                        <div
                                            key={item.id}
                                            className="w-full flex items-center gap-1 p-3 hover:bg-gray-900 sharp-corners group border-b border-gray-800/50"
                                        >
                                            <button
                                                onClick={() => loadSession(item)}
                                                className="flex-1 text-left min-w-0 overflow-hidden"
                                            >
                                                <div className="text-sm font-medium text-gray-300 group-hover:text-white truncate">{item.title}</div>
                                                <div className="text-[10px] text-gray-600 mt-1">{item.date}</div>
                                            </button>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!user) return;
                                                    const confirmed = window.confirm(t('history.deleteConfirm'));
                                                    if (!confirmed) return;

                                                    // Optimistic delete (instant UI feedback)
                                                    setHistory(prev => prev.filter(h => h.id !== item.id));

                                                    // If deleting active session, clear chat
                                                    if (currentSessionId.current === item.id) {
                                                        currentSessionId.current = null;
                                                        setMessages([{ id: 1, type: 'bot', text: defaultGreeting }]);
                                                    }

                                                    // Background API call (no await needed for UI)
                                                    irisService.deleteHistory(item.id, user.id);
                                                }}
                                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors shrink-0"
                                                title={t('history.delete')}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Chat Area */}
                    <div className="flex-1 flex flex-col relative w-full h-full">

                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#03050a]/95 backdrop-blur shrink-0">
                            <div className="flex items-center gap-3">
                                {(!isExpanded && !showHistory) && (
                                    <button
                                        onClick={() => setShowHistory(true)}
                                        className="p-1.5 hover:bg-gray-800 sharp-corners text-gray-400"
                                    >
                                        <History size={18} />
                                    </button>
                                )}
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center sharp-corners shadow-lg">
                                    <Eye size={18} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        IRIS AI <span className="px-1.5 py-0.5 bg-blue-900/50 text-blue-300 text-[9px] rounded border border-blue-800">BETA</span>
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${loadingState ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
                                        <span className="text-[10px] text-gray-400">
                                            {loadingState || t('header.connected')}
                                        </span>
                                        <span className="text-[10px] text-gray-500 ml-2">
                                            {usage.used}/{usage.limit}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleExpand}
                                    className="p-1.5 text-gray-500 hover:text-white transition-colors hover:bg-gray-800 sharp-corners hidden md:block"
                                    title={isExpanded ? t('header.minimize') : t('header.expand')}
                                >
                                    {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 text-gray-500 hover:text-white transition-colors hover:bg-gray-800 sharp-corners"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800 bg-[#050810] relative">
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
                                <Eye size={200} />
                            </div>

                            {messages.map(msg => (
                                <div key={msg.id} className={`relative z-10 flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] md:max-w-[75%] p-4 text-xs md:text-sm leading-relaxed sharp-corners shadow-sm ${msg.type === 'user'
                                        ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white border-none'
                                        : 'bg-[#0a0f1e] border border-gray-800 text-gray-300'
                                        }`}>
                                        {renderMessageContent(msg)}
                                    </div>
                                </div>
                            ))}

                            {/* Loading Indicator */}
                            {loadingState && (
                                <div className="flex justify-start relative z-10">
                                    <div className="bg-[#0a0f1e] border border-gray-800 p-3 sharp-corners flex items-center gap-3">
                                        <Loader size={14} className="animate-spin text-blue-400" />
                                        <span className="text-xs text-gray-400 animate-pulse">
                                            {loadingState === 'thinking' ? t('loading.thinking') : t('typing.analyzing')}
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form id="iris-chat-form" onSubmit={handleSend} className="p-4 border-t border-gray-800 bg-[#03050a] flex gap-3 shrink-0">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={t('input.placeholder')}
                                disabled={!!loadingState || isStreaming}
                                className="flex-1 bg-[#080b14] border border-gray-800 text-white text-sm p-3 focus:outline-none focus:border-blue-500 sharp-corners transition-colors disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || !!loadingState || isStreaming}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 sharp-corners transition-colors shadow-lg shadow-blue-900/20"
                            >
                                <ArrowRight size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default IrisChatWidget;
