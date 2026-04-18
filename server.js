const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Data storage
let fundingData = {
    allSymbols: {}, // symbol -> { currentRate, lastUpdate }
    history: {},    // symbol -> Array of { time, rate }
};

// Bybit API Base
const BYBIT_API = 'https://api.bybit.com/v5/market/tickers?category=linear';

async function fetchFundingRates() {
    try {
        console.log(`[${new Date().toISOString()}] Fetching tickers...`);
        const response = await axios.get(BYBIT_API);
        if (response.data && response.data.result && response.data.result.list) {
            const tickers = response.data.result.list;
            const now = Date.now();

            tickers.forEach(ticker => {
                const symbol = ticker.symbol;
                const rate = parseFloat(ticker.fundingRate);

                // Store current rate
                fundingData.allSymbols[symbol] = {
                    currentRate: rate,
                    lastUpdate: now
                };

                // Store in history
                if (!fundingData.history[symbol]) {
                    fundingData.history[symbol] = [];
                }

                fundingData.history[symbol].push({
                    time: now,
                    rate: rate
                });

                // Keep only last 72 hours of data 
                const oneDayAgo = now - 168 * 60 * 60 * 1000;
                fundingData.history[symbol] = fundingData.history[symbol].filter(h => h.time > oneDayAgo);
            });
            console.log(`Updated ${tickers.length} symbols.`);
        }
    } catch (error) {
        console.error('Error fetching Bybit tickers:', error.message);
    }
}

// Precision scheduler: Every minute at 03 seconds
// cron format: second minute hour day month day-of-week
cron.schedule('3 * * * * *', () => {
    fetchFundingRates();
});

// Initial fetch if history is empty
fetchFundingRates();

app.use(express.static('public'));

app.get('/api/funding', (req, res) => {
    // Only return negative funding rates, sorted from most negative to least
    const negativePairs = Object.entries(fundingData.allSymbols)
        .filter(([symbol, data]) => symbol.endsWith('USDT') && data.currentRate < 0)
        .map(([symbol, data]) => ({
            symbol,
            rate: data.currentRate,
            lastUpdate: data.lastUpdate
        }))
        .sort((a, b) => a.rate - b.rate); // -0.01 is smaller than -0.005, so a-b puts most negative first

    res.json(negativePairs);
});

app.get('/api/history/:symbol', (req, res) => {
    const symbol = req.params.symbol;
    const history = fundingData.history[symbol] || [];
    res.json(history);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Scheduler active: Fetching at 03s past every minute');
});
