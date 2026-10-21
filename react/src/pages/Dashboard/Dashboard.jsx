import React from 'react';
import { FadeInSection, PageHeader } from '../../components';
import { Activity } from 'lucide-react';
import RegimeGauge from '../../components/Dashboard/RegimeGauge';
import SignalFeed from '../../components/Dashboard/SignalFeed';
import AnomalyAlerts from '../../components/Dashboard/AnomalyAlerts';
import MarketOverview from '../../components/Dashboard/MarketOverview';
import WatchlistWidget from '../../components/Dashboard/WatchlistWidget';
import PriceChart from '../../components/Dashboard/PriceChart';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
    const { t } = useTranslation('dashboard');
    return (
        <div className="p-4 sm:p-6 pb-20 md:pb-6">
            <FadeInSection>

                <div className="flex flex-col gap-6">
                    {/* 1. Header & Market Overview & Watchlist */}
                    <div>
                        <PageHeader
                            icon={Activity}
                            subtitle={t('header.subtitle')}
                            title={t('header.title')}
                            highlight={t('header.highlight')}
                        />

                        {/* Daily Insight */}
                        <div className="mb-6">
                            <MarketOverview />
                        </div>


                    </div>

                    {/* 2. Main Grid (Strict 3-Column Layout from Analysis) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:min-h-[700px]">

                        {/* LEFT COLUMN (3/12): Regime & Watchlist */}
                        <div className="lg:col-span-3 flex flex-col gap-4 sm:gap-6 h-auto lg:h-full lg:min-h-0">
                            <div className="flex-1">
                                <RegimeGauge />
                            </div>
                            <div className="flex-1 overflow-visible">
                                <WatchlistWidget compact={true} />
                            </div>
                        </div>

                        {/* CENTER COLUMN (6/12): Main Price Chart */}
                        <div className="lg:col-span-6 h-[400px] sm:h-[460px] lg:h-full lg:min-h-0">
                            <PriceChart symbol="BTC/USDT" mode="candlestick" />
                        </div>

                        {/* RIGHT COLUMN (3/12): Signal Feed & Anomalies */}
                        <div className="lg:col-span-3 flex flex-col gap-4 sm:gap-6 h-auto lg:h-full lg:min-h-0">
                            <div className="flex-1">
                                <SignalFeed />
                            </div>
                            <div className="flex-1">
                                <AnomalyAlerts />
                            </div>
                        </div>

                    </div>

                </div>

            </FadeInSection>
        </div>
    );
};

export default Dashboard;
