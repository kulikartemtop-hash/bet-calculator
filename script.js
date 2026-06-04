// Состояние приложения
let state = {
    initialBalance: 0,
    bets: [] // { id, amount, odds, status: 'pending' | 'won' | 'lost' }
};

// Загрузка данных при старте
function loadState() {
    const saved = localStorage.getItem('betCalculatorState');
    if (saved) {
        state = JSON.parse(saved);
        document.getElementById('initialBalance').value = state.initialBalance || '';
    }
    render();
}

// Сохранение данных
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
    const amountInput = document.getElementById('betAmount');
    const oddsInput = document.getElementById('betOdds');
    
    const amount = parseFloat(amountInput.value);
    const odds = parseFloat(oddsInput.value);

    if (!amount || amount <= 0) {
        alert('Введите корректную сумму ставки');
        return;
    }
    if (!odds || odds < 1.01) {
        alert('Коэффициент должен быть больше 1.00');
        return;
    }

    const newBet = {
        id: Date.now(),
        amount: amount,
        odds: odds,
        status: 'pending'    };

    state.bets.unshift(newBet);
    amountInput.value = '';
    oddsInput.value = '';
    amountInput.focus();
    saveState();
});

// Изменение статуса ставки
window.updateStatus = function(id, status) {
    const bet = state.bets.find(b => b.id === id);
    if (bet) {
        bet.status = status;
        saveState();
    }
}

// Удаление ставки
window.deleteBet = function(id) {
    if (confirm('Удалить эту ставку из истории?')) {
        state.bets = state.bets.filter(b => b.id !== id);
        saveState();
    }
}

// Полный сброс
document.getElementById('resetAllBtn').addEventListener('click', () => {
    if (confirm('Вы уверены? Вся история и баланс будут удалены.')) {
        state = { initialBalance: 0, bets: [] };
        document.getElementById('initialBalance').value = '';
        saveState();
    }
});

// Форматирование денег
function formatMoney(amount) {
    return amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
}

// Отрисовка интерфейса
function render() {
    const betListEl = document.getElementById('betList');
    betListEl.innerHTML = '';

    let currentBalance = state.initialBalance;
    let totalProfit = 0;

    state.bets.forEach(bet => {
        if (bet.status === 'won') {            const profit = bet.amount * (bet.odds - 1);
            currentBalance += profit;
            totalProfit += profit;
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
        betListEl.innerHTML = '<div class="empty-state">История ставок пуста. Добавьте первую ставку!</div>';
    } else {
        state.bets.forEach(bet => {
            const li = document.createElement('li');
            li.className = `bet-item ${bet.status}`;
            
            const potentialWin = (bet.amount * bet.odds).toFixed(2);
            const profit = (bet.amount * (bet.odds - 1)).toFixed(2);

            li.innerHTML = `
                <div class="bet-info">
                    <div>Ставка: <strong>${formatMoney(bet.amount)}</strong> | Коэф: <span class="odds">${bet.odds}</span></div>
                    <div class="details">
                        ${bet.status === 'pending' ? `Возможный выигрыш: ${formatMoney(potentialWin)} (чистыми: +${formatMoney(profit)})` : 
                          bet.status === 'won' ? `✅ Выигрыш: +${formatMoney(profit)}` : 
                          `❌ Проигрыш: -${formatMoney(bet.amount)}`}
                    </div>
                </div>
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

// Инициализация
loadState();