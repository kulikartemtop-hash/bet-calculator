let state = {
    initialBalance: 0,
    bets: [] // { id, sport, match, type, details, amount, odds, status }
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
        sport: sport,
        match: match,
        type: type,
        details: details,
        amount: amount,
        odds: odds,        status: 'pending'
    };

    state.bets.unshift(newBet);
    
    // Очищаем поля, но оставляем вид спорта для удобства серийных ставок
    matchInput.value = '';
    detailsInput.value = '';
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

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tab = btn.dataset.tab;
        document.getElementById('allBetsTab').style.display = tab === 'all' ? 'block' : 'none';
        document.getElementById('statsTab').style.display = tab === 'stats' ? 'block' : 'none';
                if (tab === 'stats') renderStats();
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
            
            // Формируем красивое отображение типа ставки (например: "ТБ (2.5)")
            const typeDisplay = bet.details ? `${bet.type} (${bet.details})` : (bet.type || 'Не указано');

            li.innerHTML = `
                <div class="bet-info">
                    <div class="match-title">
                        <span class="sport-tag">${bet.sport}</span> ${bet.match}
                    </div>
                    <div>
                        <span class="bet-type-tag">${typeDisplay}</span>
                        <span class="odds">Кэф: ${bet.odds}</span> |                         Сумма: <strong>${formatMoney(bet.amount)}</strong>
                    </div>
                    <div class="details">
                        ${bet.status === 'pending' ? `Возможный выигрыш: +${formatMoney(profit)}` : 
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

function renderStats() {
    const container = document.getElementById('statsContainer');
    container.innerHTML = '';

    const stats = {};
    
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
        const roi = data.totalStaked > 0 ? ((data.totalProfit / data.totalStaked) * 100).toFixed(2) : 0;
        const roiClass = roi > 0 ? 'positive' : (roi < 0 ? 'negative' : '');
        const roiSign = roi > 0 ? '+' : '';

        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <div class="stat-header">
                <h4>🏆 ${sport}</h4>
                <span style="color: var(--text-secondary); font<think>
The user wants to add a "Bet Type" selector (e.g., Total Over, Total Under, 1X2, Handicap) to the betting calculator.

I need to update:
1. `index.html`: Add a `<select>` for "Тип исхода" (Bet Type) and an optional text input for "Детали" (Details, e.g., "2.5", "-1.5").
2. `style.css`: Add styles for the new `<select>` element and a new tag style for displaying the bet type in the history list.
3. `script.js`: 
   - Update the `state.bets` structure to include `type` and `details`.
   - Update the `addBetBtn` event listener to capture these new values.
   - Update the `render()` function to display the bet type and details nicely (e.g., "ТБ (2.5)").
   - Ensure backward compatibility so old saved bets (without `type` or `details`) don't break the app.

Let's refine the HTML structure for the form to keep it clean:
Row 1: Вид спорта | Матч
Row 2: Тип исхода (Select) | Детали (Input)
Row 3: Сумма | Коэффициент

This is a very logical and compact layout.

CSS updates:
- Add `select` to the existing `input` styling rules.
- Add `.bet-type-tag` class for the orange/yellow badge showing the bet type (P1, TB, etc.), similar to the sport tag but distinct.

JS updates:
- `const type = document.getElementById('betType').value;`
- `const details = document.getElementById('betDetails').value.trim();`
- In `render()`: `const typeDisplay = bet.details ? \`${bet.type} (${bet.details})\` : (bet.type || 'Не указано');`

This perfectly fulfills the user's request while maintaining the clean, professional look of the app. I will provide the complete updated files.
</think>

Отличное дополнение! Выбор типа исхода (П1, Тотал, Фора и т.д.) сделает трекер по-настоящему профессиональным и удобным для анализа. 

Я добавил выпадающий список **«Тип исхода»** и дополнительное поле **«Детали»** (например, чтобы указать "2.5" для тотала или "-1.5" для форы). 

Вот обновленные файлы. Просто замени содержимое старых файлов на эти новые версии.

### 1. `index.html` (Добавлены поля типа исхода и деталей)
```html<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Про-Трекер Ставок</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

<div class="container">
    <h1>📊 Про-Трекер Ставок</h1>

    <!-- Баланс -->
    <div class="card balance-display">
        <h2>Итоговый баланс</h2>
        <div class="amount" id="currentBalance">0 ₽</div>
        <div class="profit zero" id="profitDisplay">Прибыль: 0 ₽</div>
    </div>

    <!-- Настройки -->
    <div class="card">
        <div class="form-group">
            <label for="initialBalance">Начальный банкролл (₽)</label>
            <input type="number" id="initialBalance" placeholder="Например: 10000" min="0">
        </div>
    </div>

    <!-- Добавление ставки -->
    <div class="card">
        <h3 style="margin-top: 0;">Новая ставка</h3>
        <div class="row">
            <div class="form-group">
                <label for="betSport">Вид спорта</label>
                <input type="text" id="betSport" list="sportsList" placeholder="Футбол...">
                <datalist id="sportsList">
                    <option value="Футбол">
                    <option value="Хоккей">
                    <option value="Баскетбол">
                    <option value="Теннис">
                    <option value="Киберспорт">
                    <option value="Бокс/MMA">
                </datalist>
            </div>
            <div class="form-group">
                <label for="betMatch">Матч / Событие</label>
                <input type="text" id="betMatch" placeholder="Реал vs Барселона">
            </div>
        </div>
                <div class="row">
            <div class="form-group">
                <label for="betType">Тип исхода</label>
                <select id="betType">
                    <option value="П1">П1 (Победа 1)</option>
                    <option value="Х">Х (Ничья)</option>
                    <option value="П2">П2 (Победа 2)</option>
                    <option value="ТБ">Тотал больше (ТБ)</option>
                    <option value="ТМ">Тотал меньше (ТМ)</option>
                    <option value="Ф1">Фора 1 (Ф1)</option>
                    <option value="Ф2">Фора 2 (Ф2)</option>
                    <option value="ИТБ1">ИТБ 1</option>
                    <option value="ИТМ1">ИТМ 1</option>
                    <option value="Другое">Другое</option>
                </select>
            </div>
            <div class="form-group">
                <label for="betDetails">Детали (опционально)</label>
                <input type="text" id="betDetails" placeholder="напр: 2.5, -1.5, Желтые">
            </div>
        </div>

        <div class="row">
            <div class="form-group">
                <label for="betAmount">Сумма (₽)</label>
                <input type="number" id="betAmount" placeholder="1000" min="1">
            </div>
            <div class="form-group">
                <label for="betOdds">Коэффициент</label>
                <input type="number" id="betOdds" placeholder="1.85" min="1.01" step="0.01">
            </div>
        </div>
        <button class="btn-primary" id="addBetBtn">Добавить ставку</button>
    </div>

    <!-- Вкладки -->
    <div class="tabs">
        <button class="tab-btn active" data-tab="all">📋 Все ставки</button>
        <button class="tab-btn" data-tab="stats">📈 Статистика по видам спорта</button>
    </div>

    <!-- Вкладка: Все ставки -->
    <div class="tab-content" id="allBetsTab">
        <div class="card">
            <ul class="bet-list" id="betList"></ul>
            <button class="btn-reset" id="resetAllBtn">🗑️ Очистить всё</button>
        </div>
    </div>

    <!-- Вкладка: Статистика -->    <div class="tab-content" id="statsTab" style="display: none;">
        <div class="card">
            <div id="statsContainer"></div>
        </div>
    </div>

</div>

<script src="script.js" defer></script>
</body>
</html>