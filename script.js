let state = {
    initialBalance: 0,
    bets: [] // { id, sport, match, amount, odds, status: 'pending' | 'won' | 'lost' }
};

function loadState() {
    const saved = localStorage.getItem('betCalculatorState');
    if (saved) {
        state = JSON.parse(saved);
        document.getElementById('initialBalance').value = state.initialBalance || '';
    }
    render();
}

function saveState() {
    localStorage.setItem('betCalculatorState', JSON.stringify(state));
    render();
}

document.getElementById('initialBalance').addEventListener('input', (e) => {
    state.initialBalance = parseFloat(e.target.value) || 0;
    saveState();
});

document.getElementById('addBetBtn').addEventListener('click', () => {
    const sportInput = document.getElementById('betSport');
    const matchInput = document.getElementById('betMatch');
    const amountInput = document.getElementById('betAmount');
    const oddsInput = document.getElementById('betOdds');
    
    const sport = sportInput.value.trim() || 'Не указано';
    const match = matchInput.value.trim() || 'Без названия';
    const amount = parseFloat(amountInput.value);
    const odds = parseFloat(oddsInput.value);

    if (!amount || amount <= 0) { alert('Введите корректную сумму ставки'); return; }
    if (!odds || odds < 1.01) { alert('Коэффициент должен быть больше 1.00'); return; }

    const newBet = {
        id: Date.now(),
        sport: sport,
        match: match,
        amount: amount,
        odds: odds,
        status: 'pending'
    };

    state.bets.unshift(newBet);
    
    // Очистка полей, кроме вида спорта (удобно для серийных ставок)    matchInput.value = '';
    amountInput.value = '';
    oddsInput.value = '';
    matchInput.focus();
    
    saveState();
});

window.updateStatus = function(id, status) {
    const bet = state.bets.find(b => b.id === id);
    if (bet) {
        bet.status = status;
        saveState();
        // Если мы на вкладке статистики, обновляем и её
        if (document.getElementById('statsTab').style.display !== 'none') {
            renderStats();
        }
    }
}

window.deleteBet = function(id) {
    if (confirm('Удалить эту ставку?')) {
        state.bets = state.bets.filter(b => b.id !== id);
        saveState();
    }
}

document.getElementById('resetAllBtn').addEventListener('click', () => {
    if (confirm('Вы уверены? Вся история и баланс будут удалены.')) {
        state = { initialBalance: 0, bets: [] };
        document.getElementById('initialBalance').value = '';
        saveState();
    }
});

// Логика переключения вкладок
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tab = btn.dataset.tab;
        document.getElementById('allBetsTab').style.display = tab === 'all' ? 'block' : 'none';
        document.getElementById('statsTab').style.display = tab === 'stats' ? 'block' : 'none';
        
        if (tab === 'stats') {
            renderStats();
        }
    });
});
function formatMoney(amount) {
    return amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
}

function render() {
    const betListEl = document.getElementById('betList');
    betListEl.innerHTML = '';

    let currentBalance = state.initialBalance;
    let totalProfit = 0;

    state.bets.forEach(bet => {
        if (bet.status === 'won') {
            currentBalance += bet.amount * (bet.odds - 1);
            totalProfit += bet.amount * (bet.odds - 1);
        } else if (bet.status === 'lost') {
            currentBalance -= bet.amount;
            totalProfit -= bet.amount;
        }
    });

    document.getElementById('currentBalance').textContent = formatMoney(currentBalance);
    const profitEl = document.getElementById('profitDisplay');
    const profitSign = totalProfit >= 0 ? '+' : '';
    profitEl.textContent = `Прибыль: ${profitSign}${formatMoney(totalProfit)}`;
    profitEl.className = 'profit ' + (totalProfit > 0 ? 'positive' : totalProfit < 0 ? 'negative' : 'zero');

    if (state.bets.length === 0) {
        betListEl.innerHTML = '<div class="empty-state">История ставок пуста.</div>';
    } else {
        state.bets.forEach(bet => {
            const li = document.createElement('li');
            li.className = `bet-item ${bet.status}`;
            const profit = (bet.amount * (bet.odds - 1)).toFixed(2);

            li.innerHTML = `
                <div class="bet-info">
                    <div class="match-title">
                        <span class="sport-tag">${bet.sport}</span> ${bet.match}
                    </div>
                    <div>
                        <span class="odds">Кэф: ${bet.odds}</span> | 
                        Сумма: <strong>${formatMoney(bet.amount)}</strong>
                    </div>
                    <div class="details">
                        ${bet.status === 'pending' ? `Возможный выигрыш: +${formatMoney(profit)}` : 
                          bet.status === 'won' ? `✅ Выигрыш: +${formatMoney(profit)}` : 
                          `❌ Проигрыш: -${formatMoney(bet.amount)}`}
                    </div>                </div>
                <div class="bet-actions">
                    <button class="btn-action btn-won ${bet.status === 'won' ? 'active' : ''}" onclick="updateStatus(${bet.id}, 'won')">✅</button>
                    <button class="btn-action btn-lost ${bet.status === 'lost' ? 'active' : ''}" onclick="updateStatus(${bet.id}, 'lost')">❌</button>
                    <button class="btn-action btn-delete" onclick="deleteBet(${bet.id})">×</button>
                </div>
            `;
            betListEl.appendChild(li);
        });
    }
}

// Новая функция: Расчет и отрисовка статистики по видам спорта
function renderStats() {
    const container = document.getElementById('statsContainer');
    container.innerHTML = '';

    const stats = {};
    
    // Группируем данные только по ЗАВЕРШЕННЫМ ставкам для точного ROI
    state.bets.forEach(bet => {
        if (bet.status === 'pending') return; 
        
        const sport = bet.sport;
        if (!stats[sport]) {
            stats[sport] = { totalStaked: 0, totalProfit: 0, count: 0 };
        }
        
        stats[sport].count++;
        stats[sport].totalStaked += bet.amount;
        
        if (bet.status === 'won') {
            stats[sport].totalProfit += bet.amount * (bet.odds - 1);
        } else if (bet.status === 'lost') {
            stats[sport].totalProfit -= bet.amount;
        }
    });

    const sports = Object.keys(stats);
    
    if (sports.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет завершенных ставок для анализа.<br>ROI считается только по сыгравшим или проигравшим ставкам.</div>';
        return;
    }

    sports.forEach(sport => {
        const data = stats[sport];
        // ROI = (Чистая прибыль / Общая сумма ставок) * 100
        const roi = data.totalStaked > 0 ? ((data.totalProfit / data.totalStaked) * 100).toFixed(2) : 0;
        const roiClass = roi > 0 ? 'positive' : (roi < 0 ? 'negative' : '');        const roiSign = roi > 0 ? '+' : '';

        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <div class="stat-header">
                <h4>🏆 ${sport}</h4>
                <span style="color: var(--text-secondary); font-size: 0.9rem;">${data.count} ставок</span>
            </div>
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Оборот (Staked)</span>
                    <span class="stat-value">${formatMoney(data.totalStaked)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Чистая прибыль</span>
                    <span class="stat-value ${data.totalProfit >= 0 ? 'positive' : 'negative'}">
                        ${data.totalProfit >= 0 ? '+' : ''}${formatMoney(data.totalProfit)}
                    </span>
                </div>
                <div class="stat-item" style="grid-column: 1 / -1; margin-top: 5px; padding-top: 10px; border-top: 1px solid var(--border);">
                    <span class="stat-label">ROI (Return on Investment)</span>
                    <span class="stat-value ${roiClass}" style="font-size: 1.3rem;">
                        ${roiSign}${roi}%
                    </span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

loadState();