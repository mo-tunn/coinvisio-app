/**
 * Index Page Utility Functions and Constants
 */

// Mock Data for Rotating Coins
export const coinData = [
    { symbol: "ETH", name: "Ethereum", action: "BUY", score: 94, type: "buy" },
    { symbol: "SOL", name: "Solana", action: "BUY", score: 88, type: "buy" },
    { symbol: "MATIC", name: "Polygon", action: "HOLD", score: 65, type: "hold" },
    { symbol: "BTC", name: "Bitcoin", action: "STRONG", score: 98, type: "buy" },
    { symbol: "AVAX", name: "Avalanche", action: "BUY", score: 82, type: "buy" },
    { symbol: "ADA", name: "Cardano", action: "SELL", score: 42, type: "sell" },
    { symbol: "LINK", name: "Chainlink", action: "BUY", score: 89, type: "buy" },
    { symbol: "DOT", name: "Polkadot", action: "HOLD", score: 58, type: "hold" },
    { symbol: "DOGE", name: "Dogecoin", action: "SELL", score: 35, type: "sell" },
    { symbol: "XRP", name: "Ripple", action: "HOLD", score: 55, type: "hold" },
    { symbol: "LTC", name: "Litecoin", action: "BUY", score: 78, type: "buy" },
];

// Stats data for the stats section
export const statsData = [
    { labelKey: 'stats.activeCoins', value: 500, suffix: '+' },
    { labelKey: 'stats.dataPoints', value: 2, suffix: 'M+' },
    { labelKey: 'stats.uptime', value: 99.9, suffix: '%', decimals: 1 },
    { labelKey: 'stats.latency', value: 50, prefix: '<', suffix: 'ms' }
];

// Get action color class based on coin type
export const getActionColorClass = (type) => {
    switch (type) {
        case 'buy':
            return 'text-green-400 bg-green-900/20';
        case 'sell':
            return 'text-red-400 bg-red-900/20';
        default:
            return 'text-yellow-400 bg-yellow-900/20';
    }
};

// Get current 3 coins cyclically based on index
export const getCurrentCoins = (coinIndex, coinList = coinData) => [
    coinList[coinIndex % coinList.length],
    coinList[(coinIndex + 1) % coinList.length],
    coinList[(coinIndex + 2) % coinList.length],
];
