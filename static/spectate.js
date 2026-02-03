const params = new URLSearchParams(window.location.search);
const roomId = params.get('room') || localStorage.getItem('chili_roomId');
if (!roomId) {
    window.location.href = '/';
}

const roomEl = document.getElementById('spectator-room');
const roundEl = document.getElementById('spectator-round');
const leaderboardEl = document.getElementById('spectator-leaderboard');
const eventFeed = document.getElementById('event-feed');

roomEl.textContent = `Room: ${roomId}`;

const spectatorId = 'spec_' + Math.random().toString(36).slice(2, 8);
let ws = null;

function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/room/${encodeURIComponent(roomId)}/ws?playerId=${spectatorId}&team=spectator&name=Spectator`;
    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };
    ws.onclose = () => setTimeout(connect, 2000);
}

function handleMessage(data) {
    if (data.type === 'round_start') {
        roundEl.textContent = `Round: ${data.round} / ${data.totalRounds}`;
        logEvent(`Round ${data.round} started`);
    }
    if (data.type === 'round_results') {
        logEvent(`Round ${data.round} results posted`);
    }
    if (data.type === 'paradigm_warning') {
        logEvent('Market rumor: shift incoming');
    }
    if (data.type === 'paradigm_shift') {
        logEvent(`Paradigm shift: ${data.newAttribute}`);
    }
    if (data.type === 'game_over') {
        logEvent('Game over');
    }
    if (data.type === 'teams_updated' || data.type === 'connected') {
        const leaderboard = data.leaderboard || data.gameState?.leaderboard;
        if (leaderboard) updateLeaderboard(leaderboard);
    }
}

function updateLeaderboard(leaderboard) {
    leaderboardEl.innerHTML = leaderboard.map((entry, i) => `
        <div class="leaderboard-entry">
            <span class="lb-rank">#${i + 1}</span>
            <span class="lb-team">${entry.team}</span>
            <span class="lb-cash">$${entry.cash}</span>
        </div>
    `).join('');
}

function logEvent(text) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const entry = document.createElement('div');
    entry.className = 'event-entry';
    entry.textContent = `[${time}] ${text}`;
    eventFeed.prepend(entry);

    while (eventFeed.children.length > 20) {
        eventFeed.removeChild(eventFeed.lastChild);
    }
}

async function fetchState() {
    try {
        const response = await fetch(`/api/room/${encodeURIComponent(roomId)}/state`);
        const state = await response.json();
        roundEl.textContent = `Round: ${state.round} / ${state.totalRounds}`;
        if (state.leaderboard) updateLeaderboard(state.leaderboard);
    } catch (err) {
        // ignore
    }
}

connect();
fetchState();
