const params = new URLSearchParams(window.location.search);
const roomId = params.get('room') || localStorage.getItem('chili_roomId');
const hostKey = params.get('hostKey') || localStorage.getItem('chili_hostKey');

const elements = {
    roomCode: document.getElementById('room-code'),
    hostKey: document.getElementById('host-key'),
    startBtn: document.getElementById('start-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    endRoundBtn: document.getElementById('end-round-btn'),
    resetBtn: document.getElementById('reset-btn'),
    addBots: document.getElementById('add-bots'),
    applyConfig: document.getElementById('apply-config'),
    roundDuration: document.getElementById('round-duration'),
    totalRounds: document.getElementById('total-rounds'),
    shiftRound: document.getElementById('shift-round'),
    stateDisplay: document.getElementById('state-display'),
    leaderboard: document.getElementById('leaderboard'),
};

if (!roomId || !hostKey) {
    alert('Missing room or host key. Create a room first.');
}

localStorage.setItem('chili_roomId', roomId);
localStorage.setItem('chili_hostKey', hostKey);

if (elements.roomCode) elements.roomCode.textContent = roomId || '-';
if (elements.hostKey) elements.hostKey.textContent = hostKey || '-';

async function hostAction(action, extra = {}) {
    if (!roomId || !hostKey) return;
    await fetch(`/api/room/${encodeURIComponent(roomId)}/host`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, hostKey, ...extra }),
    });
    refreshState();
}

async function refreshState() {
    if (!roomId) return;
    try {
        const response = await fetch(`/api/room/${encodeURIComponent(roomId)}/state`);
        const state = await response.json();
        elements.stateDisplay.innerHTML = `
            <div>Phase: ${state.phase}</div>
            <div>Round: ${state.round} / ${state.totalRounds}</div>
            <div>Attributes: ${state.attributes.join(', ')}</div>
        `;
        elements.leaderboard.innerHTML = (state.leaderboard || []).map((entry, i) => `
            <div class="leaderboard-entry">
                <span class="lb-rank">#${i + 1}</span>
                <span class="lb-team">${entry.team}</span>
                <span class="lb-cash">$${entry.cash}</span>
            </div>
        `).join('');
    } catch (err) {
        elements.stateDisplay.textContent = 'Unable to fetch state.';
    }
}

if (elements.startBtn) elements.startBtn.addEventListener('click', () => hostAction('start'));
if (elements.pauseBtn) elements.pauseBtn.addEventListener('click', () => hostAction('pause'));
if (elements.endRoundBtn) elements.endRoundBtn.addEventListener('click', () => hostAction('end_round'));
if (elements.resetBtn) elements.resetBtn.addEventListener('click', () => hostAction('reset'));
if (elements.addBots) elements.addBots.addEventListener('click', () => hostAction('add_bots'));

if (elements.applyConfig) {
    elements.applyConfig.addEventListener('click', () => {
        const config = {
            roundDuration: Number(elements.roundDuration.value || 30),
            totalRounds: Number(elements.totalRounds.value || 30),
            paradigmShiftRound: Number(elements.shiftRound.value || 15),
        };
        hostAction('set_config', { config });
    });
}

refreshState();
setInterval(refreshState, 3000);
