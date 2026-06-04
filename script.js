// Состояние приложения
let state = {
    initialBalance: 0,
    bets: [] // Структура: { id, sport, match, type, details, amount, odds, status }
};

// Загрузка данных из localStorage
function loadState() {
    const saved = localStorage.getItem('betCalculatorState');
    if (saved) {
        state = JSON.parse(saved);
        document.getElementById('initialBalance').value = state.initialBalance || '';
    }
    render();
}

// Сохранение данных в localStorage
function saveState() {
    localStorage.setItem('betCalculatorState', JSON.stringify(state));
    render();
}

// Обновление начального баланса
document.getElementById('initialBalance').addEventListener('input', (e) => {
    state.initialBalance = parseFloat(e.target.value) || 0;
    saveState();
});

// Добавление новой ставки
document.getElementById('addBetBtn').addEventListener('click', () => {
    const sportInput = document.getElementById('betSport');
    const matchInput = document.getElementById('betMatch');
    const typeInput = document.getElementById('betType');
    const detailsInput = document.getElementById('betDetails');
    const amountInput = document.getElementById('betAmount');
    const oddsInput = document.getElementById('betOdds');
    
    const sport = sportInput.value.trim() || 'Не указано';
    const match = matchInput.value.trim() || 'Без названия';
    const type = typeInput.value;
    const details = detailsInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const odds = parseFloat(oddsInput.value);

    if (!amount || amount <= 0) { alert('Введите корректную сумму ставки'); return; }
    if (!odds || odds < 1.01) { alert('Коэффициент должен быть больше 1.00'); return; }

    const newBet = {
        id: Date.now(),
        sport: sport,        match: match,
        type: type,
        details: details,
        amount: amount,
        odds: odds,
        status: 'pending'
    };

    state.bets.unshift(newBet); // Добавляем в начало списка
    
    // Очищаем поля (вид спорта оставляем для удобства серийных ставок)
    matchInput.value = '';
    detailsInput.value = '';
    amountInput.value = '';
    oddsInput.value = '';
    matchInput.focus();
    
    saveState();
});

// Изменение статуса ставки (глобальные функции для onclick в HTML)
window.updateStatus = function(id, status) {
    const bet = state.bets.find(b => b.id === id);
    if (bet) {
        bet.status = status;
        saveState();
        // Если открыта вкладка статистики, обновляем её
        if (document.getElementById('statsTab').style.display !== 'none') {
            renderStats();
        }
    }
};

// Удаление ставки
window.deleteBet = function(id) {
    if (confirm('Удалить эту ставку из истории?')) {
        state.bets = state.bets.filter(b => b.id !== id);
        saveState();
    }
};

// Полный сброс
document.getElementById('resetAllBtn').addEventListener('click', () => {
    if (confirm('ВНИМАНИЕ: Вся история ставок и баланс будут безвозвратно удалены. Продолжить?')) {
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

// Форматирование денег
function formatMoney(amount) {
    return amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
}

// Отрисовка основного интерфейса и списка ставок
function render() {
    const betListEl = document.getElementById('betList');
    betListEl.innerHTML = '';

    let currentBalance = state.initialBalance;
    let totalProfit = 0;

    // Расчет баланса
    state.bets.forEach(bet => {
        if (bet.status === 'won') {
            currentBalance += bet.amount * (bet.odds - 1);
            totalProfit += bet.amount * (bet.odds - 1);
        } else if (bet.status === 'lost') {
            currentBalance -= bet.amount;
            totalProfit -= bet.amount;
        }
    });

    // Обновление шапки с балансом
    document.getElementById('currentBalance').textContent = formatMoney(currentBalance);
    const profitEl = document.getElementById('profitDisplay');
    const profitSign = totalProfit >= 0 ? '+' : '';
    profitEl.textContent = `Прибыль: ${profitSign}${formatMoney(totalProfit)}`;
    profitEl.className = 'profit ' + (totalProfit > 0 ? 'positive' : totalProfit < 0 ? 'negative' : 'zero');

    // Отрисовка списка
    if (state.bets.length === 0) {
        betListEl.innerHTML = '<div class="empty-state">История ставок пуста.<br>Добавьте свою первую ставку выше!</div>';    } else {
        state.bets.forEach(bet => {
            const li = document.createElement('li');
            li.className = `bet-item ${bet.status}`;
            const profit = (bet.amount * (bet.odds - 1)).toFixed(2);
            
            // Красивое форматирование типа ставки: "ТБ (2.5)" или просто "П1"
            const typeDisplay = bet.details ? `${bet.type} (${bet.details})` : (bet.type || 'Не указано');

            li.innerHTML = `
                <div class="bet-info">
                    <div class="match-title">
                        <span class="sport-tag">${bet.sport}</span> ${bet.match}
                    </div>
                    <div>
                        <span class="bet-type-tag">${typeDisplay}</span>
                        <span class="odds">Кэф: ${bet.odds}</span> | 
                        Сумма: <strong>${formatMoney(bet.amount)}</strong>
                    </div>
                    <div class="details">
                        ${bet.status === 'pending' ? `⏳ Возможен выигрыш: +${formatMoney(profit)}` : 
                          bet.status === 'won' ? `✅ Выигрыш: +${formatMoney(profit)}` : 
                          `❌ Проигрыш: -${formatMoney(bet.amount)}`}
                    </div>
                </div>
                <div class="bet-actions">
                    <button class="btn-action btn-won ${bet.status === 'won' ? 'active' : ''}" onclick="updateStatus(${bet.id}, 'won')" title="Выиграла">✅</button>
                    <button class="btn-action btn-lost ${bet.status === 'lost' ? 'active' : ''}" onclick="updateStatus(${bet.id}, 'lost')" title="Проиграла">❌</button>
                    <button class="btn-action btn-delete" onclick="deleteBet(${bet.id})" title="Удалить">×</button>
                </div>
            `;
            betListEl.appendChild(li);
        });
    }
}

// Отрисовка статистики по видам спорта (ROI)
function renderStats() {
    const container = document.getElementById('statsContainer');
    container.innerHTML = '';

    const stats = {};
    
    // Группируем данные ТОЛЬКО по завершенным ставкам для точного ROI
    state.bets.forEach(bet => {
        if (bet.status === 'pending') return; 
        
        const sport = bet.sport;
        if (!stats[sport]) {
            stats[sport] = { totalStaked: 0, totalProfit: 0, count: 0 };        }
        
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
        container.innerHTML = '<div class="empty-state">Нет завершенных ставок для анализа.<br>ROI рассчитывается только по сыгравшим или проигравшим ставкам.</div>';
        return;
    }

    // Сортируем виды спорта по общей сумме ставок (по убыванию)
    sports.sort((a, b) => stats[b].totalStaked - stats[a].totalStaked);

    sports.forEach(sport => {
        const data = stats[sport];
        const roi = data.totalStaked > 0 ? ((data.totalProfit / data.totalStaked) * 100).toFixed(2) : 0;
        const roiClass = roi > 0 ? 'positive' : (roi < 0 ? 'negative' : '');
        const roiSign = roi > 0 ? '+' : '';

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
                <div class="stat-item" style="grid-column: 1 / -1; margin-top: 8px; padding-top: 10px; border-top: 1px solid var(--border);">
                    <span class="stat-label">ROI (Return on Investment)</span>
                    <span class="stat-value ${roiClass}" style="font-size: 1.4rem;">
                        ${roiSign}${roi}%                    </span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Инициализация при загрузке страницы
loadState();