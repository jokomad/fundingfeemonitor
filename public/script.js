let chartInstance = null;

async function fetchFunding() {
    try {
        const response = await fetch('/api/funding');
        const data = await response.json();
        renderList(data);
        document.getElementById('last-sync').innerText = `Last updated: ${new Date().toLocaleTimeString([], { hour12: false })}`;
    } catch (err) {
        console.error('Error fetching funding:', err);
    }
}

function renderList(items) {
    const list = document.getElementById('funding-list');
    if (items.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 50px;">No negative funding rates found.</div>';
        return;
    }

    list.innerHTML = items.map(item => `
        <div class="funding-item" onclick="showChart('${item.symbol}')">
            <div class="symbol-info">
                <span class="symbol-name">${item.symbol.replace('USDT', '')}</span>
                <span class="symbol-pair">USDT Perpetual</span>
            </div>
            <div class="rate-info">
                <div class="rate-value">${(item.rate * 100).toFixed(4)}%</div>
                <div class="rate-label">FUNDING RATE</div>
            </div>
        </div>
    `).join('');
}

async function showChart(symbol) {
    const modal = document.getElementById('chart-modal');
    const modalTitle = document.getElementById('modal-symbol');
    modalTitle.innerText = `${symbol} History`;
    modal.style.display = 'flex';

    try {
        const response = await fetch(`/api/history/${symbol}`);
        const history = await response.json();
        
        renderChart(history);
    } catch (err) {
        console.error('Error fetching history:', err);
    }
}

function renderChart(history) {
    const ctx = document.getElementById('fundingChart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    const labels = history.map(h => new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    const data = history.map(h => h.rate * 100);

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Funding Rate (%)',
                data: data,
                borderColor: '#ff4a4a',
                backgroundColor: 'rgba(255, 74, 74, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                pointHitRadius: 10,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: { color: '#666', maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }
                },
                y: {
                    reverse: true,
                    display: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#666' }
                }
            }
        }
    });
}

// Close modal logic
document.getElementById('close-modal').onclick = () => {
    document.getElementById('chart-modal').style.display = 'none';
};

window.onclick = (event) => {
    const modal = document.getElementById('chart-modal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};

// Initial fetch and set interval
fetchFunding();
setInterval(fetchFunding, 10000); // UI poll every 10s
