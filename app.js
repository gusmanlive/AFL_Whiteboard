(() => {
  'use strict';

  const STORAGE_KEY = 'afl-coaches-whiteboard-v1';
  const MAX_PLAYERS = 50;
  const INITIAL_ROWS = 22;

  const POSITIONS = [
    // Forward line (top scoring end)
    { id: 'fp_left', role: 'FP', label: 'Forward Pocket', x: 30, y: 17 },
    { id: 'ff', role: 'FF', label: 'Full Forward', x: 50, y: 14 },
    { id: 'fp_right', role: 'FP', label: 'Forward Pocket', x: 70, y: 17 },
    // Half forward
    { id: 'hff_left', role: 'HFF', label: 'Half Forward Flank', x: 26, y: 33 },
    { id: 'chf', role: 'CHF', label: 'Centre Half Forward', x: 50, y: 31 },
    { id: 'hff_right', role: 'HFF', label: 'Half Forward Flank', x: 74, y: 33 },
    // Centre line
    { id: 'wing_left', role: 'W', label: 'Wing', x: 22, y: 50 },
    { id: 'centre', role: 'C', label: 'Centre', x: 50, y: 46 },
    { id: 'wing_right', role: 'W', label: 'Wing', x: 78, y: 50 },
    // Followers
    { id: 'ruck', role: 'RUCK', label: 'Ruck', x: 50, y: 56 },
    { id: 'ruck_rover', role: 'RR', label: 'Ruck Rover', x: 37, y: 62 },
    { id: 'rover', role: 'ROV', label: 'Rover', x: 63, y: 62 },
    // Half back
    { id: 'hbf_left', role: 'HBF', label: 'Half Back Flank', x: 26, y: 76 },
    { id: 'chb', role: 'CHB', label: 'Centre Half Back', x: 50, y: 78 },
    { id: 'hbf_right', role: 'HBF', label: 'Half Back Flank', x: 74, y: 76 },
    // Back line (bottom)
    { id: 'bp_left', role: 'BP', label: 'Back Pocket', x: 30, y: 91 },
    { id: 'fb', role: 'FB', label: 'Full Back', x: 50, y: 94 },
    { id: 'bp_right', role: 'BP', label: 'Back Pocket', x: 70, y: 91 }
  ];

  const BENCH = [
    { id: 'bench1', label: 'Interchange 1' },
    { id: 'bench2', label: 'Interchange 2' },
    { id: 'bench3', label: 'Interchange 3' },
    { id: 'bench4', label: 'Interchange 4' }
  ];

  const $ = id => document.getElementById(id);
  const syncAdapter = window.WhiteboardSync.createAdapter();

  function blankPlayer(index = 0) {
    return {
      id: `p_${Date.now().toString(36)}_${index}_${Math.random().toString(36).slice(2, 7)}`,
      number: '',
      firstName: '',
      surname: ''
    };
  }

  function defaultState() {
    const assignments = {};
    POSITIONS.forEach(p => assignments[p.id] = { playerId: '', text: '' });
    BENCH.forEach(p => assignments[p.id] = { playerId: '', text: '' });
    return {
      schemaVersion: 2,
      boardId: null,
      mode: 'local',
      details: { date: '', time: '', homeTeam: '', awayTeam: '', location: '' },
      roster: Array.from({ length: INITIAL_ROWS }, (_, i) => blankPlayer(i)),
      assignments,
      updatedAt: new Date().toISOString()
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const base = defaultState();
      return {
        ...base,
        ...parsed,
        details: { ...base.details, ...(parsed.details || {}) },
        assignments: { ...base.assignments, ...(parsed.assignments || {}) },
        roster: Array.isArray(parsed.roster) && parsed.roster.length ? parsed.roster : base.roster
      };
    } catch (err) {
      console.warn('Could not load saved whiteboard state.', err);
      return defaultState();
    }
  }

  let state = loadState();

  function snapshot() {
    return JSON.parse(JSON.stringify(state));
  }

  function saveState({ publish = true } = {}) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (publish) syncAdapter.publish(snapshot()).catch(() => {});
  }

  function setTab(tabName) {
    document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === tabName));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function playerDisplay(player) {
    if (!player) return '';
    const name = [player.firstName, player.surname].filter(Boolean).join(' ').trim();
    if (!player.number && !name) return '';
    if (player.number && name) return `#${player.number} ${name}`;
    if (player.number) return `#${player.number}`;
    return name;
  }

  function activePlayers() {
    return state.roster.filter(p => playerDisplay(p));
  }

  function rosterById(id) {
    return state.roster.find(p => p.id === id);
  }

  function assignmentDisplay(assignment) {
    if (!assignment) return '';
    if (assignment.playerId) {
      const player = rosterById(assignment.playerId);
      if (player && playerDisplay(player)) return playerDisplay(player);
    }
    return assignment.text || '';
  }

  function resolveAssignment(value) {
    const trimmed = value.trim();
    if (!trimmed) return { playerId: '', text: '' };
    const match = activePlayers().find(p => playerDisplay(p).toLowerCase() === trimmed.toLowerCase());
    return match ? { playerId: match.id, text: '' } : { playerId: '', text: trimmed };
  }

  function renderPlayerOptions() {
    const options = $('playerOptions');
    options.innerHTML = activePlayers()
      .sort((a, b) => Number(a.number || 9999) - Number(b.number || 9999) || playerDisplay(a).localeCompare(playerDisplay(b)))
      .map(p => `<option value="${escapeHtml(playerDisplay(p))}"></option>`)
      .join('');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
    }[ch]));
  }

  function renderPositions() {
    const layer = $('positionLayer');
    layer.innerHTML = POSITIONS.map(pos => `
      <div class="position-node" data-position-node="${pos.id}" style="left:${pos.x}%; top:${pos.y}%;">
        <label class="position-role" for="pos_${pos.id}" title="${escapeHtml(pos.label)}">${pos.role}</label>
        <input
          id="pos_${pos.id}"
          class="position-input"
          type="text"
          list="playerOptions"
          autocomplete="off"
          aria-label="${escapeHtml(pos.label)} player"
          placeholder="Player"
          data-assignment="${pos.id}"
          value="${escapeHtml(assignmentDisplay(state.assignments[pos.id]))}"
        />
      </div>
    `).join('');

    layer.querySelectorAll('[data-assignment]').forEach(input => {
      input.addEventListener('change', onAssignmentChange);
      input.addEventListener('blur', onAssignmentChange);
    });
  }

  function renderBench() {
    $('benchGrid').innerHTML = BENCH.map(slot => `
      <div class="bench-slot" data-bench-node="${slot.id}">
        <label for="bench_${slot.id}">${slot.label}</label>
        <input id="bench_${slot.id}" type="text" list="playerOptions" autocomplete="off" placeholder="Player" data-assignment="${slot.id}" value="${escapeHtml(assignmentDisplay(state.assignments[slot.id]))}" />
      </div>
    `).join('');
    $('benchGrid').querySelectorAll('[data-assignment]').forEach(input => {
      input.addEventListener('change', onAssignmentChange);
      input.addEventListener('blur', onAssignmentChange);
    });
  }

  function onAssignmentChange(event) {
    const key = event.target.dataset.assignment;
    const next = resolveAssignment(event.target.value);
    const old = state.assignments[key] || { playerId:'', text:'' };
    if (old.playerId === next.playerId && old.text === next.text) return;
    state.assignments[key] = next;
    saveState();
    renderAssignmentsOnly();
  }

  function renderAssignmentsOnly() {
    document.querySelectorAll('[data-assignment]').forEach(input => {
      const display = assignmentDisplay(state.assignments[input.dataset.assignment]);
      if (document.activeElement !== input) input.value = display;
    });
    renderDuplicateWarnings();
  }

  function renderDuplicateWarnings() {
    document.querySelectorAll('.position-node.duplicate, .bench-slot.duplicate').forEach(el => el.classList.remove('duplicate'));
    const byPlayer = new Map();
    Object.entries(state.assignments).forEach(([slotId, assignment]) => {
      if (!assignment?.playerId) return;
      const arr = byPlayer.get(assignment.playerId) || [];
      arr.push(slotId);
      byPlayer.set(assignment.playerId, arr);
    });
    byPlayer.forEach(slots => {
      if (slots.length < 2) return;
      slots.forEach(slotId => {
        const node = document.querySelector(`[data-position-node="${slotId}"]`) || document.querySelector(`[data-bench-node="${slotId}"]`);
        if (node) node.classList.add('duplicate');
      });
    });
  }

  function renderInfo() {
    $('infoDate').textContent = formatDate(state.details.date) || '—';
    $('infoTime').textContent = formatTime(state.details.time) || '—';
    $('infoHome').textContent = state.details.homeTeam || '—';
    $('infoAway').textContent = state.details.awayTeam || '—';
    $('infoLocation').textContent = state.details.location || '—';
  }

  function formatDate(value) {
    if (!value) return '';
    const [y,m,d] = value.split('-').map(Number);
    if (!y || !m || !d) return value;
    return new Intl.DateTimeFormat('en-AU', { day:'numeric', month:'short', year:'numeric' }).format(new Date(y, m-1, d));
  }

  function formatTime(value) {
    if (!value) return '';
    const [h,m] = value.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return value;
    const d = new Date(); d.setHours(h,m,0,0);
    return new Intl.DateTimeFormat('en-AU', { hour:'numeric', minute:'2-digit' }).format(d);
  }

  function renderSetupDetails() {
    $('matchDate').value = state.details.date || '';
    $('matchTime').value = state.details.time || '';
    $('homeTeam').value = state.details.homeTeam || '';
    $('awayTeam').value = state.details.awayTeam || '';
    $('location').value = state.details.location || '';
  }

  function renderRoster() {
    const tbody = $('rosterBody');
    const duplicateNumbers = duplicateRosterNumbers();
    tbody.innerHTML = state.roster.map((player, index) => {
      const hasError = player.number && duplicateNumbers.has(normalizeNumber(player.number));
      return `
        <tr data-player-row="${player.id}" class="${hasError ? 'has-error' : ''}">
          <td>${index + 1}</td>
          <td><input class="player-number-input" type="text" inputmode="numeric" value="${escapeHtml(player.number)}" placeholder="#" data-player-field="number" data-player-id="${player.id}" aria-label="Player ${index+1} number" /></td>
          <td><input type="text" value="${escapeHtml(player.firstName)}" placeholder="First name" data-player-field="firstName" data-player-id="${player.id}" aria-label="Player ${index+1} first name" /></td>
          <td><input type="text" value="${escapeHtml(player.surname)}" placeholder="Surname" data-player-field="surname" data-player-id="${player.id}" aria-label="Player ${index+1} surname" /></td>
          <td><button class="icon-btn" type="button" data-remove-player="${player.id}" title="Remove player" aria-label="Remove player ${index+1}">×</button></td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('[data-player-field]').forEach(input => {
      input.addEventListener('input', onRosterInput);
      input.addEventListener('change', () => renderRosterIntegrity());
    });
    tbody.querySelectorAll('[data-remove-player]').forEach(btn => btn.addEventListener('click', () => removePlayer(btn.dataset.removePlayer)));
    renderRosterIntegrity();
  }

  function normalizeNumber(value) {
    return String(value || '').trim().replace(/^#/, '').toLowerCase();
  }

  function duplicateRosterNumbers() {
    const counts = new Map();
    state.roster.forEach(p => {
      const n = normalizeNumber(p.number);
      if (!n) return;
      counts.set(n, (counts.get(n) || 0) + 1);
    });
    return new Set([...counts.entries()].filter(([,count]) => count > 1).map(([n]) => n));
  }

  function renderRosterIntegrity() {
    const duplicates = duplicateRosterNumbers();
    document.querySelectorAll('[data-player-row]').forEach(row => {
      const player = rosterById(row.dataset.playerRow);
      row.classList.toggle('has-error', Boolean(player?.number && duplicates.has(normalizeNumber(player.number))));
    });
    $('rosterCount').textContent = `${activePlayers().length} / ${MAX_PLAYERS} players${duplicates.size ? ' • duplicate number warning' : ''}`;
  }

  function onRosterInput(event) {
    const player = rosterById(event.target.dataset.playerId);
    if (!player) return;
    const field = event.target.dataset.playerField;
    player[field] = field === 'number' ? event.target.value.replace(/^#/, '') : event.target.value;
    saveState();
    renderPlayerOptions();
    renderAssignmentsOnly();
    renderRosterIntegrity();
  }

  function addPlayer() {
    if (state.roster.length >= MAX_PLAYERS) {
      alert(`Maximum roster size is ${MAX_PLAYERS} players.`);
      return;
    }
    state.roster.push(blankPlayer(state.roster.length));
    saveState();
    renderRoster();
    const rows = $('rosterBody').querySelectorAll('tr');
    rows[rows.length - 1]?.querySelector('input')?.focus();
  }

  function removePlayer(playerId) {
    const display = playerDisplay(rosterById(playerId));
    state.roster = state.roster.filter(p => p.id !== playerId);
    Object.keys(state.assignments).forEach(slot => {
      if (state.assignments[slot]?.playerId === playerId) {
        state.assignments[slot] = { playerId: '', text: display || '' };
      }
    });
    if (!state.roster.length) state.roster.push(blankPlayer(0));
    saveState();
    renderRoster();
    renderPlayerOptions();
    renderAssignmentsOnly();
  }

  function clearRoster() {
    if (!confirm('Clear the entire player roster? Existing position selections will remain as manual text.')) return;
    Object.keys(state.assignments).forEach(slot => {
      const current = assignmentDisplay(state.assignments[slot]);
      state.assignments[slot] = { playerId: '', text: current };
    });
    state.roster = Array.from({ length: INITIAL_ROWS }, (_, i) => blankPlayer(i));
    saveState();
    renderRoster();
    renderPlayerOptions();
    renderAssignmentsOnly();
  }

  function bindDetails() {
    const mapping = {
      matchDate: 'date',
      matchTime: 'time',
      homeTeam: 'homeTeam',
      awayTeam: 'awayTeam',
      location: 'location'
    };
    Object.entries(mapping).forEach(([elementId, key]) => {
      $(elementId).addEventListener('input', event => {
        state.details[key] = event.target.value;
        saveState();
        renderInfo();
      });
    });
  }

  function resetAll() {
    if (!confirm('Reset all match details, roster and whiteboard positions?')) return;
    state = defaultState();
    saveState();
    renderAll();
    setTab('setup');
  }

  function mergeRemoteState(remote) {
    if (!remote || typeof remote !== 'object') return;
    state = { ...state, ...remote };
    saveState({ publish: false });
    renderAll();
  }

  function renderAll() {
    renderSetupDetails();
    renderRoster();
    renderPlayerOptions();
    renderPositions();
    renderBench();
    renderInfo();
    renderDuplicateWarnings();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    renderAll();
    bindDetails();

    document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
    $('editSetupBtn').addEventListener('click', () => setTab('setup'));
    $('goWhiteboardBtn').addEventListener('click', () => setTab('whiteboard'));
    $('addPlayerBtn').addEventListener('click', addPlayer);
    $('clearRosterBtn').addEventListener('click', clearRoster);
    $('resetAllBtn').addEventListener('click', resetAll);

    syncAdapter.subscribe(mergeRemoteState);
    await syncAdapter.connect().catch(() => null);
    registerServiceWorker();
  });
})();
