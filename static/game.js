const params = new URLSearchParams(window.location.search);
const roomId = params.get('room') || localStorage.getItem('chili_roomId');
const teamName = localStorage.getItem('chili_teamName');
const playerName = localStorage.getItem('chili_playerName');
const playerId = localStorage.getItem('chili_playerId');

if (!roomId || !teamName || !playerName || !playerId) {
    window.location.href = '/';
}

const elements = {
    teamBadge: document.getElementById('team-badge'),
    roomBadge: document.getElementById('room-badge'),
    roundDisplay: document.getElementById('round-display'),
    cashDisplay: document.getElementById('cash-display'),
    leaderboardList: document.getElementById('leaderboard-list'),
    waitingScreen: document.getElementById('waiting-screen'),
    roundScreen: document.getElementById('round-screen'),
    resultsScreen: document.getElementById('results-screen'),
    gameoverScreen: document.getElementById('gameover-screen'),
    waitingTeam: document.getElementById('waiting-team'),
    waitingLeaderboard: document.getElementById('waiting-leaderboard'),
    barsDisplay: document.getElementById('bars-display'),
    timerFill: document.getElementById('timer-fill'),
    timerText: document.getElementById('timer-text'),
    speedBonus: document.getElementById('speed-bonus'),
    submittedIndicator: document.getElementById('submitted-indicator'),
    feedbackContainer: document.getElementById('feedback-container'),
    feedbackTimerFill: document.getElementById('feedback-timer-fill'),
    feedbackTimerText: document.getElementById('feedback-timer-text'),
    yourDecision: document.getElementById('your-decision'),
    yourPayout: document.getElementById('your-payout'),
    yourBonus: document.getElementById('your-bonus'),
    resultBars: document.getElementById('result-bars'),
    finalLeaderboard: document.getElementById('final-leaderboard'),
    resetBtn: document.getElementById('reset-btn'),
    paradigmOverlay: document.getElementById('paradigm-overlay'),
    paradigmMessage: document.getElementById('paradigm-message'),
    paradigmWarning: document.getElementById('paradigm-warning'),
    paradigmWarningMessage: document.getElementById('paradigm-warning-message'),
    countdownOverlay: document.getElementById('countdown-overlay'),
    countdownNumber: document.getElementById('countdown-number'),
    hintBox: document.getElementById('hint-box'),
    votePanel: document.getElementById('vote-panel'),
    voteList: document.getElementById('vote-list'),
    judgmentValue: document.getElementById('judgment-value'),
    speedValue: document.getElementById('speed-value'),
};

const ATTR_LABELS = {
    spiciness: { icon: '🌶️', label: 'Spiciness' },
    flavor: { icon: '👅', label: 'Flavor' },
    portion: { icon: '🍽️', label: 'Portion' },
    ambiance: { icon: '✨', label: 'Ambiance' },
    authenticity: { icon: '🏆', label: 'Authenticity' },
    presentation: { icon: '🎨', label: 'Presentation' },
    speed_of_service: { icon: '⚡', label: 'Speed' },
    value: { icon: '💰', label: 'Value' },
};

let ws = null;
let gameState = {
    phase: 'waiting',
    round: 0,
    cash: 0,
    bars: {},
    attributes: [],
    voted: null,
    timerInterval: null,
    resultsTimerInterval: null,
    lastBeepSecond: null,
};

function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/room/${encodeURIComponent(roomId)}/ws?playerId=${encodeURIComponent(playerId)}&team=${encodeURIComponent(teamName)}&name=${encodeURIComponent(playerName)}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => console.log('Connected');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };
    ws.onclose = () => {
        console.log('Disconnected. Reconnecting...');
        setTimeout(connect, 2000);
    };
}

function handleMessage(data) {
    switch (data.type) {
        case 'connected':
            handleConnected(data);
            break;
        case 'teams_updated':
            updateLeaderboard(data.leaderboard);
            break;
        case 'round_start':
            handleRoundStart(data);
            break;
        case 'vote_update':
            handleVoteUpdate(data);
            break;
        case 'decision_locked':
            handleDecisionLocked(data);
            break;
        case 'round_results':
            handleRoundResults(data);
            break;
        case 'paradigm_warning':
            showParadigmWarning(data.message);
            break;
        case 'paradigm_shift':
            handleParadigmShift(data);
            break;
        case 'game_over':
            handleGameOver(data);
            break;
        case 'game_paused':
            elements.roundDisplay.textContent = 'Game paused by host';
            showScreen('waiting-screen');
            break;
        case 'game_reset':
            window.location.href = '/';
            break;
        default:
            break;
    }
}

function handleConnected(data) {
    elements.teamBadge.textContent = teamName;
    elements.roomBadge.textContent = `ROOM ${roomId}`;
    elements.waitingTeam.textContent = teamName;
    if (data.bars) gameState.bars = data.bars;
    if (data.attributes) gameState.attributes = data.attributes;
    if (data.cash !== undefined) {
        gameState.cash = data.cash;
        elements.cashDisplay.textContent = `$${gameState.cash}`;
    }
    if (data.gameState?.leaderboard) {
        updateLeaderboard(data.gameState.leaderboard);
    }
}

function updateLeaderboard(leaderboard) {
    if (!leaderboard) return;
    elements.leaderboardList.innerHTML = leaderboard.map((entry, i) => `
        <div class="leaderboard-entry ${entry.team === teamName ? 'highlight' : ''}">
            <span class="lb-rank">#${i + 1}</span>
            <span class="lb-team">${entry.team}</span>
            <span class="lb-cash">$${entry.cash}</span>
        </div>
    `).join('');

    elements.waitingLeaderboard.innerHTML = leaderboard.map((entry) => `
        <div class="leaderboard-entry ${entry.team === teamName ? 'highlight' : ''}">
            <span class="lb-team">${entry.team} (${entry.players})</span>
            <span class="lb-cash">$${entry.cash}</span>
        </div>
    `).join('');

    const myTeam = leaderboard.find(e => e.team === teamName);
    if (myTeam) {
        gameState.cash = myTeam.cash;
        elements.cashDisplay.textContent = `$${gameState.cash}`;
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

async function handleRoundStart(data) {
    gameState.phase = 'round';
    gameState.round = data.round;
    gameState.voted = null;
    clearResultsTimer();
    gameState.bars = data.bars || gameState.bars;
    gameState.cash = data.cash !== undefined ? data.cash : gameState.cash;
    gameState.attributes = data.attributes || gameState.attributes;

    elements.roundDisplay.textContent = `Round ${data.round} / ${data.totalRounds}`;
    elements.cashDisplay.textContent = `$${gameState.cash}`;

    renderBars();
    elements.submittedIndicator.classList.add('hidden');
    elements.votePanel.classList.add('hidden');

    if (data.phaseHints && data.phaseHints.length > 0) {
        elements.hintBox.innerHTML = data.phaseHints.map(h => `<div>${h}</div>`).join('');
        elements.hintBox.classList.remove('hidden');
    } else {
        elements.hintBox.classList.add('hidden');
    }

    if (data.round === 1) {
        await showCountdown();
    }

    showScreen('round-screen');
    startTimer(data.timeLimit);
}

function showCountdown() {
    return new Promise(resolve => {
        elements.countdownOverlay.classList.remove('hidden');
        let count = 3;
        elements.countdownNumber.textContent = count;
        gameAudio.countdownBeep();

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                elements.countdownNumber.textContent = count;
                elements.countdownNumber.style.animation = 'none';
                void elements.countdownNumber.offsetHeight;
                elements.countdownNumber.style.animation = 'countdown-pop 0.8s ease-out';
                gameAudio.countdownBeep();
            } else if (count === 0) {
                elements.countdownNumber.textContent = 'GO!';
                elements.countdownNumber.style.color = 'var(--success)';
                elements.countdownNumber.style.animation = 'none';
                void elements.countdownNumber.offsetHeight;
                elements.countdownNumber.style.animation = 'countdown-pop 0.8s ease-out';
                gameAudio.countdownGo();
            } else {
                clearInterval(interval);
                elements.countdownOverlay.classList.add('hidden');
                elements.countdownNumber.style.color = '';
                gameAudio.roundStart();
                resolve();
            }
        }, 700);
    });
}

function calcDisplayWidth(level) {
    const max = 200;
    const width = (Math.log10(1 + level) / Math.log10(1 + max)) * 100;
    return Math.max(4, Math.min(100, width));
}

function renderBars() {
    elements.barsDisplay.innerHTML = gameState.attributes.map(attr => {
        const level = gameState.bars[attr] || 0;
        const info = ATTR_LABELS[attr] || { icon: '❓', label: attr };
        const displayWidth = calcDisplayWidth(level);
        const over = level > 100 ? `<span class="bar-over">+${level - 100}</span>` : '';
        return `
            <button class="bar-button" data-attr="${attr}">
                <div class="bar-header">
                    <span class="bar-icon">${info.icon}</span>
                    <span class="bar-label">${info.label}</span>
                    <span class="bar-level">${level}${over}</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${displayWidth}%"></div>
                </div>
            </button>
        `;
    }).join('');

    document.querySelectorAll('.bar-button').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            const attr = btn.dataset.attr;
            gameState.voted = attr;
            gameAudio.submit();
            send({ type: 'submit_vote', decision: attr });
            highlightVote(attr);
        });
    });
}

function highlightVote(attr) {
    elements.submittedIndicator.classList.remove('hidden');
    document.querySelectorAll('.bar-button').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.attr === attr);
    });
}

function handleVoteUpdate(data) {
    if (!data.votes) return;
    elements.votePanel.classList.remove('hidden');
    const total = data.totalPlayers || 0;

    elements.voteList.innerHTML = gameState.attributes.map(attr => {
        const count = data.votes[attr] || 0;
        const info = ATTR_LABELS[attr] || { icon: '❓', label: attr };
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const locked = data.locked && data.choice === attr;
        return `
            <div class="vote-item ${locked ? 'locked' : ''}">
                <span class="vote-label">${info.icon} ${info.label}</span>
                <div class="vote-bar">
                    <div class="vote-fill" style="width: ${pct}%"></div>
                </div>
                <span class="vote-count">${count}/${total}</span>
            </div>
        `;
    }).join('');

    if (data.locked && data.choice) {
        highlightVote(data.choice);
        document.querySelectorAll('.bar-button').forEach(btn => {
            btn.disabled = true;
        });
    }
}

function handleDecisionLocked(data) {
    highlightVote(data.choice);
}

function startTimer(duration) {
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);

    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    gameState.lastBeepSecond = null;

    function updateTimer() {
        const now = Date.now();
        const remaining = Math.max(0, (endTime - now) / 1000);
        const elapsed = (now - startTime) / 1000;

        const pct = (remaining / duration) * 100;
        elements.timerFill.style.width = `${pct}%`;
        elements.timerText.textContent = `${Math.ceil(remaining)}s`;

        const remainingInt = Math.ceil(remaining);
        elements.timerFill.classList.remove('urgent', 'critical');
        if (remaining <= 5) {
            elements.timerFill.classList.add('critical');
            elements.timerText.style.color = 'var(--accent-red)';
            if (remainingInt !== gameState.lastBeepSecond && remaining > 0) {
                gameState.lastBeepSecond = remainingInt;
                gameAudio.timerCritical();
            }
        } else if (remaining <= 10) {
            elements.timerFill.classList.add('urgent');
            elements.timerText.style.color = 'var(--warning)';
            if (remainingInt === 10 && gameState.lastBeepSecond !== 10) {
                gameState.lastBeepSecond = 10;
                gameAudio.timerWarning();
            }
        } else {
            elements.timerText.style.color = '';
        }

        if (elapsed <= 10) {
            elements.speedBonus.textContent = '1.5x bonus';
            elements.speedBonus.className = 'speed-bonus high';
        } else if (elapsed <= 20) {
            elements.speedBonus.textContent = '1.3x bonus';
            elements.speedBonus.className = 'speed-bonus medium';
        } else {
            elements.speedBonus.textContent = '1.0x';
            elements.speedBonus.className = 'speed-bonus low';
        }

        if (remaining <= 0) {
            clearInterval(gameState.timerInterval);
        }
    }

    updateTimer();
    gameState.timerInterval = setInterval(updateTimer, 100);
}

function clearResultsTimer() {
    if (gameState.resultsTimerInterval) {
        clearInterval(gameState.resultsTimerInterval);
        gameState.resultsTimerInterval = null;
    }
    if (elements.feedbackTimerFill) {
        elements.feedbackTimerFill.style.width = '100%';
        elements.feedbackTimerFill.classList.remove('urgent', 'critical');
    }
    if (elements.feedbackTimerText) {
        elements.feedbackTimerText.textContent = '--';
    }
}

function startResultsTimer(duration) {
    if (!duration || !elements.feedbackTimerFill || !elements.feedbackTimerText) return;
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);

    if (gameState.resultsTimerInterval) {
        clearInterval(gameState.resultsTimerInterval);
    }

    function updateResultsTimer() {
        const now = Date.now();
        const remaining = Math.max(0, (endTime - now) / 1000);
        const pct = (remaining / duration) * 100;

        elements.feedbackTimerFill.style.width = `${pct}%`;
        elements.feedbackTimerText.textContent = `${Math.ceil(remaining)}s`;

        elements.feedbackTimerFill.classList.remove('urgent', 'critical');
        if (remaining <= 5) {
            elements.feedbackTimerFill.classList.add('critical');
        } else if (remaining <= 10) {
            elements.feedbackTimerFill.classList.add('urgent');
        }

        if (remaining <= 0) {
            clearInterval(gameState.resultsTimerInterval);
            gameState.resultsTimerInterval = null;
        }
    }

    updateResultsTimer();
    gameState.resultsTimerInterval = setInterval(updateResultsTimer, 100);
}

function handleRoundResults(data) {
    gameState.phase = 'results';
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
    }
    startResultsTimer(data.resultsDuration);

    const myResult = data.results[teamName];

    if (data.feedback) {
        elements.feedbackContainer.innerHTML = data.feedback.map(item => `
            <div class="feedback-item ${item.won ? 'won' : 'lost'}">
                <span class="feedback-outcome">${item.won ? 'WON' : 'LOST'}</span>
                ${item.text}
            </div>
        `).join('');
    }

    if (myResult) {
        const dealOutcome = document.getElementById('deal-outcome');
        dealOutcome.textContent = myResult.won ? 'DEAL WON!' : 'DEAL LOST';
        dealOutcome.className = `deal-outcome ${myResult.won ? 'won' : 'lost'}`;

        elements.yourDecision.textContent = myResult.decision || 'None';
        elements.yourPayout.textContent = myResult.won ? `+$${myResult.payout}` : '$0';
        elements.yourBonus.textContent = myResult.buildAmount > 0
            ? `Built +${myResult.buildAmount} ${myResult.decision}`
            : 'No investment made';

        gameState.cash = myResult.totalCash;
        gameState.bars = myResult.bars;
        elements.cashDisplay.textContent = `$${gameState.cash}`;

        elements.judgmentValue.textContent = formatJudgment(myResult.judgment);
        elements.speedValue.textContent = formatSpeed(myResult.speedTier, myResult.speedBonus);

        elements.resultBars.innerHTML = gameState.attributes.map((attr) => {
            const level = myResult.bars[attr] || 0;
            const info = ATTR_LABELS[attr] || { icon: '❓', label: attr };
            const displayWidth = calcDisplayWidth(level);
            const over = level > 100 ? `<span class="bar-over">+${level - 100}</span>` : '';
            const isBuilt = attr === myResult.decision;
            return `
                <div class="result-bar ${isBuilt ? 'built' : ''}">
                    <span class="bar-icon">${info.icon}</span>
                    <span class="bar-label">${info.label}</span>
                    <div class="bar-track small">
                        <div class="bar-fill" style="width: ${displayWidth}%"></div>
                    </div>
                    <span class="bar-level">${level}${over}</span>
                </div>
            `;
        }).join('');

        if (myResult.won) {
            gameAudio.win();
        } else {
            gameAudio.lose();
        }
    }

    updateLeaderboard(data.leaderboard);
    showScreen('results-screen');
}

function formatJudgment(judgment) {
    if (judgment === 'correct') return 'Correct ✓';
    if (judgment === 'near') return 'Close';
    return 'Miss';
}

function formatSpeed(speedTier, bonus) {
    if (speedTier === 'fast') return `Fast (${bonus}x)`;
    if (speedTier === 'medium') return `Medium (${bonus}x)`;
    if (speedTier === 'fallback') return 'Fallback';
    return `Slow (${bonus}x)`;
}

function handleParadigmShift(data) {
    if (data.attributes) {
        gameState.attributes = data.attributes;
    }
    elements.paradigmMessage.textContent = data.message;
    elements.paradigmOverlay.classList.remove('hidden');
    setTimeout(() => {
        elements.paradigmOverlay.classList.add('hidden');
    }, 2000);
}

function showParadigmWarning(message) {
    elements.paradigmWarningMessage.textContent = message;
    elements.paradigmWarning.classList.remove('hidden');
    setTimeout(() => {
        elements.paradigmWarning.classList.add('hidden');
    }, 2000);
}

function handleGameOver(data) {
    gameState.phase = 'gameover';
    elements.finalLeaderboard.innerHTML = data.leaderboard.map((entry, i) => `
        <div class="final-entry ${entry.team === teamName ? 'highlight' : ''}">
            <span class="final-rank">#${i + 1}</span>
            <span class="final-team">${entry.team}</span>
            <span class="final-cash">$${entry.cash}</span>
        </div>
    `).join('');
    showScreen('gameover-screen');
}

function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

if (elements.resetBtn) {
    elements.resetBtn.addEventListener('click', () => {
        window.location.href = '/';
    });
}

// Initialize audio on first interaction
if (window.gameAudio) {
    document.addEventListener('click', () => gameAudio.init(), { once: true });
    document.addEventListener('touchstart', () => gameAudio.init(), { once: true });
}

// Kick off
connect();
