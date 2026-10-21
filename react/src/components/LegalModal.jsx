import React, { useState } from 'react';
import { X, Shield, FileText, AlertTriangle, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LegalModal = ({ isOpen, onClose, initialTab = 'disclaimer' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const { t } = useTranslation('legal');

    if (!isOpen) return null;

    const tabs = [
        { id: 'disclaimer', label: t('tabs.disclaimer'), icon: AlertTriangle },
        { id: 'privacy', label: t('tabs.privacy'), icon: Shield },
        { id: 'terms', label: t('tabs.terms'), icon: FileText },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#03050a] border border-gray-800 w-full max-w-4xl h-[80vh] sharp-corners shadow-2xl flex flex-col md:flex-row overflow-hidden">

                {/* Sidebar */}
                <div className="w-full md:w-64 bg-[#05070e] border-b md:border-b-0 md:border-r border-gray-800 flex flex-col">
                    <div className="p-6 border-b border-gray-800">
                        <h2 className="text-xl font-light text-white tracking-widest uppercase">
                            {t('header.legal')} <span className="text-blue-500 font-bold">{t('header.info')}</span>
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold transition-all sharp-corners ${activeTab === tab.id
                                        ? 'bg-blue-900/20 text-blue-400 border-l-2 border-blue-500'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border-l-2 border-transparent'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                {activeTab === tab.id && <ChevronRight size={14} className="ml-auto" />}
                            </button>
                        ))}
                    </div>
                    <div className="p-4 border-t border-gray-800 text-[10px] text-gray-600 font-mono-custom text-center">
                        {t('footer.copyright')}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-gray-800 text-gray-500 hover:text-white transition-colors sharp-corners border border-transparent hover:border-gray-700"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                        {activeTab === 'disclaimer' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-3 text-yellow-500 mb-2">
                                    <AlertTriangle size={32} />
                                    <h3 className="text-2xl font-light text-white uppercase">{t('disclaimer.title')}</h3>
                                </div>
                                <div className="h-px w-full bg-gradient-to-r from-yellow-500/50 to-transparent"></div>

                                <div className="prose prose-invert prose-sm max-w-none text-gray-400">
                                    <p className="font-bold text-white text-base">{t('disclaimer.important')}</p>

                                    <p>
                                        {t('disclaimer.body')}
                                    </p>

                                    <div className="bg-yellow-900/10 border border-yellow-500/20 p-4 sharp-corners my-6">
                                        <p className="text-yellow-200 m-0">
                                            <strong>{t('disclaimer.noAdviceTitle')}</strong> {t('disclaimer.noAdviceText')}
                                        </p>
                                    </div>

                                    <h4 className="text-white mt-6 mb-2">{t('disclaimer.accuracyTitle')}</h4>
                                    <p>
                                        {t('disclaimer.accuracyText')}
                                    </p>

                                    <h4 className="text-white mt-6 mb-2">{t('disclaimer.userResponsibilityTitle')}</h4>
                                    <p>
                                        {t('disclaimer.userResponsibilityText')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'privacy' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-3 text-blue-500 mb-2">
                                    <Shield size={32} />
                                    <h3 className="text-2xl font-light text-white uppercase">{t('privacy.title')}</h3>
                                </div>
                                <div className="h-px w-full bg-gradient-to-r from-blue-500/50 to-transparent"></div>

                                <div className="prose prose-invert prose-sm max-w-none text-gray-400">
                                    <p>{t('privacy.updated')}</p>

                                    <h4 className="text-white mt-6 mb-2">{t('privacy.collectionTitle')}</h4>
                                    <p>
                                        {t('privacy.collectionText')}
                                    </p>

                                    <h4 className="text-white mt-6 mb-2">{t('privacy.usageTitle')}</h4>
                                    <p>
                                        {t('privacy.usageIntro')}
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>{t('privacy.usageBullet1')}</li>
                                        <li>{t('privacy.usageBullet2')}</li>
                                        <li>{t('privacy.usageBullet3')}</li>
                                    </ul>
                                    <p>{t('privacy.noSell')}</p>

                                    <h4 className="text-white mt-6 mb-2">{t('privacy.securityTitle')}</h4>
                                    <p>
                                        {t('privacy.securityText')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'terms' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-3 text-purple-500 mb-2">
                                    <FileText size={32} />
                                    <h3 className="text-2xl font-light text-white uppercase">{t('terms.title')}</h3>
                                </div>
                                <div className="h-px w-full bg-gradient-to-r from-purple-500/50 to-transparent"></div>

                                <div className="prose prose-invert prose-sm max-w-none text-gray-400">
                                    <p className="font-bold text-white">{t('terms.intro')}</p>

                                    <h4 className="text-white mt-6 mb-2">{t('terms.acceptableUseTitle')}</h4>
                                    <p>
                                        {t('terms.acceptableUseText')}
                                    </p>

                                    <h4 className="text-white mt-6 mb-2">{t('terms.subscriptionTitle')}</h4>
                                    <p>
                                        {t('terms.subscriptionText')}
                                    </p>

                                    <h4 className="text-white mt-6 mb-2">{t('terms.liabilityTitle')}</h4>
                                    <p>
                                        {t('terms.liabilityText')}
                                    </p>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Action Bar */}
                    <div className="p-6 bg-[#05070e] border-t border-gray-800 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold sharp-corners transition-colors"
                        >
                            {t('actions.understand')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LegalModal;
