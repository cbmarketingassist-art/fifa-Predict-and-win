// ─────────────────────────────────────────────
//  Flag helper — flag-icons CSS library (embedded SVG)
// ─────────────────────────────────────────────
const _flagSizeMap = {
  'flag-img-card':  'flag-sz-card',
  'flag-img-vs':    'flag-sz-vs',
  'flag-img-tz':    'flag-sz-tz',
  'flag-img-split': 'flag-sz-split',
  'flag-img-pick':  'flag-sz-pick',
};

function flagImg(team, cls) {
  if (!team) return '';
  const sz = _flagSizeMap[cls] || 'flag-sz-card';
  if (team.flagCode) {
    return `<span class="fi fi-${team.flagCode} ${sz}" title="${team.name}"></span>`;
  }
  return `<span class="flag-emoji-fb">${team.flag}</span>`;
}

// ─────────────────────────────────────────────
//  Screen Manager
// ─────────────────────────────────────────────
const Screens = (() => {
  let current = null;
  const screens = {};

  function register(id, el) {
    screens[id] = el;
    if (el.classList.contains('active')) current = id;
  }

  function show(id, direction = 'right') {
    if (current === id) return;
    const prev = screens[current];
    const next = screens[id];
    if (!next) return;

    if (prev) {
      prev.classList.remove('active');
      prev.classList.add(direction === 'right' ? 'exit-left' : 'exit-right');
      setTimeout(() => prev.classList.remove('exit-left', 'exit-right'), 350);
    }

    next.classList.remove('exit-left', 'exit-right');
    next.classList.add('active', direction === 'right' ? 'enter-right' : 'enter-left');
    setTimeout(() => next.classList.remove('enter-right', 'enter-left'), 350);
    current = id;
  }

  return { register, show, getCurrent: () => current };
})();

// ─────────────────────────────────────────────
//  Login Screen
// ─────────────────────────────────────────────
function initLoginScreen() {
  const phoneInput   = document.getElementById('phoneInput');
  const nameInput    = document.getElementById('nameInput');
  const loginBtn     = document.getElementById('loginBtn');
  const phoneGroup   = document.getElementById('phoneGroup');
  const nameGroup    = document.getElementById('nameGroup');
  const welcomeGroup = document.getElementById('welcomeGroup');
  const welcomeName  = document.getElementById('welcomeName');
  const phoneError   = document.getElementById('phoneError');
  const nameError    = document.getElementById('nameError');
  const phonePrefix  = document.getElementById('phonePrefix');
  const loginScreen  = document.getElementById('screen-login');

  let state = 'phone';

  // ── Critical mobile fix: tap prefix → focus input ──
  if (phonePrefix) {
    phonePrefix.addEventListener('click', () => {
      phoneInput.focus();
    });
    phonePrefix.addEventListener('touchend', (e) => {
      e.preventDefault();
      phoneInput.focus();
    });
  }

  // ── Scroll input into view when keyboard opens (iOS fix) ──
  phoneInput.addEventListener('focus', () => {
    setTimeout(() => {
      phoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 320);
  });

  nameInput && nameInput.addEventListener('focus', () => {
    setTimeout(() => {
      nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 320);
  });

  phoneInput.addEventListener('input', async () => {
    phoneError.textContent = '';
    const val = phoneInput.value.replace(/\D/g, '').substring(0, 10);
    phoneInput.value = val;

    if (val.length === 10) {
      const check = await Auth.checkPhone(val);
      if (check.exists) {
        state = 'returning';
        nameGroup.classList.add('hidden');
        welcomeGroup.classList.remove('hidden');
        const u = await DB.getUser(val);
        welcomeName.textContent = u ? u.name : '';
        loginBtn.textContent = 'ENTER →';
      } else {
        state = 'new_user';
        welcomeGroup.classList.add('hidden');
        nameGroup.classList.remove('hidden');
        loginBtn.textContent = 'JOIN & PREDICT →';
        setTimeout(() => nameInput && nameInput.focus(), 50);
      }
    } else {
      state = 'phone';
      nameGroup.classList.add('hidden');
      welcomeGroup.classList.add('hidden');
      loginBtn.textContent = 'START PREDICTING →';
    }
  });

  loginBtn.addEventListener('click', async () => {
    const phone = phoneInput.value.replace(/\D/g, '');
    const check = await Auth.checkPhone(phone);
    if (!check.valid) { phoneError.textContent = check.msg; return; }

    if (state === 'returning') {
      const result = await Auth.login(phone);
      if (result.success) {
        await DB.loadPredictions();
        enterApp();
      } else {
        phoneError.textContent = 'Failed to connect to database. Please refresh the page!';
      }
    } else if (state === 'new_user') {
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name || name.length < 2) {
        if (nameError) nameError.textContent = 'Please enter your name (min 2 chars)';
        return;
      }
      const result = await Auth.register(phone, name);
      if (result.success) {
        await DB.loadPredictions();
        enterApp();
      } else {
        phoneError.textContent = 'Registration failed. Database might be disconnected. Please refresh!';
      }
    }
  });

  phoneInput.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });
  nameInput  && nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });
}

// ─────────────────────────────────────────────
//  Match Cards
// ─────────────────────────────────────────────
function buildMatchCard(match) {
  const status = getMatchStatus(match);
  const hasPredicted = Predictions.hasUserPredicted(match.id);
  const userPred = Predictions.getUserPrediction(match.id);
  const stats = DB.getMatchStats(match.id, match.team1.name, match.team2.name);
  const countdown = timeUntilMatch(match);
  const liveScore = DB.getScore(match.id);

  // Skip TBD knockout matches that haven't been assigned teams yet
  if (match.isKnockout && match.team1.name === 'TBD' && match.team2.name === 'TBD') {
    const card = document.createElement('div');
    card.className = `match-card status-upcoming knockout-tbd`;
    card.innerHTML = `
      <div class="mc-header">
        <span class="mc-group">${match.stage}</span>
        <span class="mc-date">${formatMatchDate(match)} · ${formatMatchTime(match)}</span>
        <span class="status-badge upcoming">⏱ TBD</span>
      </div>
      <div class="mc-teams">
        <div class="mc-team">
          <div class="mc-flag">🏳️</div>
          <div class="mc-name" style="color:var(--text-muted);font-size:11px">${match.fixtureDesc || 'TBD'}</div>
        </div>
      </div>`;
    return card;
  }

  const closesIn = timeUntilPredictionCloses(match);
  const opensIn  = timeUntilPredictionOpens(match);
  const statusLabels = {
    upcoming: `<span class="status-badge upcoming open-ticker" data-match-id="${match.id}">⏱ opens in <span class="badge-opens-in">${opensIn || 'soon'}</span></span>`,
    open:     `<span class="status-badge open pulse-badge close-ticker" data-match-id="${match.id}">🟢 OPEN<span class="badge-close-in">· closes in ${closesIn || '…'}</span></span>`,
    locked:   `<span class="status-badge locked">🔒 CLOSED</span>`,
    live:     `<span class="status-badge live pulse-badge">🔴 LIVE</span>`,
    finished: `<span class="status-badge finished">✓ DONE</span>`
  };

  const canChange = Predictions.canChangePrediction(match.id);
  const pickBadge = hasPredicted
    ? `<span class="pick-chip">${userPred.teamName === match.team1.name ? match.team1.flag : match.team2.flag} ${userPred.teamName}</span>`
    : '';

  const barT1Pct = stats.total > 0 ? stats.team1.pct : 50;

  // Live score row
  let liveScoreHTML = '';
  if (status === 'live' && liveScore) {
    const clock = liveMatchClock(match);
    const min = clock ? `<span class="mc-minute live-minute-ticker" data-match-id="${match.id}">${clock}</span>` : '';
    liveScoreHTML = `
      <div class="mc-live-score">
        <div class="mc-score-team">
          <span>${match.team1.flag}</span>
          <span class="mc-score-num">${liveScore.team1Score}</span>
        </div>
        <span class="mc-score-sep">—</span>
        <div class="mc-score-team">
          <span class="mc-score-num">${liveScore.team2Score}</span>
          <span>${match.team2.flag}</span>
        </div>
        ${min}
      </div>`;
  }

  // Action button
  let actionBtn = '';
  if (status === 'open' && !hasPredicted) {
    actionBtn = `<button class="card-predict-btn" data-match-id="${match.id}">PREDICT →</button>`;
  } else if (status === 'open' && hasPredicted && canChange) {
    actionBtn = `<button class="card-predict-btn card-change-btn" data-match-id="${match.id}">CHANGE ↻</button>`;
  }

  // Winner result badge for finished matches
  let winnerBadge = '';
  if (status === 'finished' && match.winner) {
    const winnerTeam = match.winner === match.team1.name ? match.team1 : match.team2;
    winnerBadge = `<span class="winner-badge">🏆 ${winnerTeam.flag} ${match.winner}</span>`;
  }

  const card = document.createElement('div');
  card.className = `match-card status-${status}`;
  card.dataset.matchId = match.id;
  card.innerHTML = `
    ${liveScoreHTML}
    <div class="mc-header">
      <span class="mc-group">${match.group !== '-' ? match.group : match.stage}</span>
      <span class="mc-date">${formatMatchDate(match)} · ${formatMatchTime(match)}</span>
      ${statusLabels[status] || ''}
    </div>
    <div class="mc-teams">
      <div class="mc-team">
        <div class="mc-flag">${flagImg(match.team1, 'flag-img-card')}</div>
        <div class="mc-name">${match.team1.name}</div>
      </div>
      <div class="mc-vs">
        <span>VS</span>
        ${hasPredicted ? '<span class="mc-predicted-dot">✓</span>' : ''}
      </div>
      <div class="mc-team">
        <div class="mc-flag">${flagImg(match.team2, 'flag-img-card')}</div>
        <div class="mc-name">${match.team2.name}</div>
      </div>
    </div>
    ${winnerBadge}
    <div class="mc-footer">
      <div class="mc-bar-wrap">
        <div class="mc-bar-fill" style="width:${barT1Pct}%; background:${match.team1.color}"></div>
      </div>
      <div class="mc-footer-right">
        ${status === 'upcoming' ? `<span class="mc-kickoff-hint kickoff-ticker" data-match-id="${match.id}">⏱ kicks off in ${countdown || 'soon'}</span>` : ''}
        ${pickBadge}
        ${actionBtn}
      </div>
    </div>
  `;

  card.querySelector('.card-predict-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openPredictScreen(match.id);
  });

  if (status !== 'upcoming') {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => openPredictScreen(match.id));
  }

  return card;
}

// ─────────────────────────────────────────────
//  Home Screen
// ─────────────────────────────────────────────
function renderHomeScreen() {
  const user = Auth.getCurrentUser();
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userInitial').textContent = user.name[0].toUpperCase();

  // Show admin button if admin
  const adminBtn = document.getElementById('adminBtn');
  if (adminBtn) {
    adminBtn.classList.toggle('hidden', !Auth.isAdmin());
  }

  const openList     = document.getElementById('openMatchesList');
  const liveList     = document.getElementById('liveMatchesList');
  const upcomingList = document.getElementById('upcomingMatchesList');
  const pastList     = document.getElementById('pastMatchesList');
  const openSection  = document.getElementById('openMatchesSection');
  const liveSection  = document.getElementById('liveMatchesSection');
  const pastSection  = document.getElementById('pastMatchesSection');

  openList.innerHTML     = '';
  liveList.innerHTML     = '';
  upcomingList.innerHTML = '';
  pastList.innerHTML     = '';

  const open = [], live = [], upcoming = [], past = [];
  MATCHES.forEach(m => {
    const s = getMatchStatus(m);
    if (s === 'open')          open.push(m);
    else if (s === 'locked')   open.push(m);   // form closed, kick-off soon — keep visible at top
    else if (s === 'live')     live.push(m);
    else if (s === 'upcoming') upcoming.push(m);
    else                        past.push(m);
  });

  openSection.style.display = open.length   ? 'block' : 'none';
  liveSection.style.display = live.length   ? 'block' : 'none';
  pastSection.style.display = past.length   ? 'block' : 'none';

  open.forEach(m => openList.appendChild(buildMatchCard(m)));
  live.forEach(m => liveList.appendChild(buildMatchCard(m)));
  // Only show next ~10 upcoming matches to avoid huge lists
  upcoming.slice(0, 10).forEach(m => upcomingList.appendChild(buildMatchCard(m)));
  if (upcoming.length > 10) {
    const more = document.createElement('div');
    more.className = 'show-more-btn';
    more.innerHTML = `<button onclick="showAllUpcoming()">Show all ${upcoming.length} upcoming matches</button>`;
    upcomingList.appendChild(more);
  }
  // Show last 5 past matches (most recent first)
  past.reverse().slice(0, 5).forEach(m => pastList.appendChild(buildMatchCard(m)));
  if (past.length > 5) {
    const more = document.createElement('div');
    more.className = 'show-more-btn';
    more.innerHTML = `<button onclick="showAllPast()">Show all ${past.length} completed matches</button>`;
    pastList.appendChild(more);
  }

}

function showAllUpcoming() {
  const list = document.getElementById('upcomingMatchesList');
  list.innerHTML = '';
  MATCHES.filter(m => getMatchStatus(m) === 'upcoming').forEach(m => list.appendChild(buildMatchCard(m)));
}

function showAllPast() {
  const list = document.getElementById('pastMatchesList');
  list.innerHTML = '';
  MATCHES.filter(m => getMatchStatus(m) === 'finished').reverse().forEach(m => list.appendChild(buildMatchCard(m)));
}

// ─────────────────────────────────────────────
//  Predict Screen
// ─────────────────────────────────────────────
let _predictMatchId = null;
let _selectedTeam   = null;

function openPredictScreen(matchId) {
  _predictMatchId = matchId;
  _selectedTeam   = null;
  const match  = MATCHES.find(m => m.id === matchId);
  const status = getMatchStatus(match);

  document.getElementById('predictGroup').textContent = match.group !== '-' ? match.group : match.stage;
  document.getElementById('predictDate').textContent  = `${formatMatchDate(match)} · ${formatMatchTime(match)}`;
  document.getElementById('vsFlag1').innerHTML = flagImg(match.team1, 'flag-img-vs');
  document.getElementById('vsFlag2').innerHTML = flagImg(match.team2, 'flag-img-vs');
  document.getElementById('vsName1').textContent = match.team1.name.toUpperCase();
  document.getElementById('vsName2').textContent = match.team2.name.toUpperCase();
  document.getElementById('vsTime').textContent  = match.timeIST;

  document.getElementById('tzFlag1').innerHTML = flagImg(match.team1, 'flag-img-tz');
  document.getElementById('tzFlag2').innerHTML = flagImg(match.team2, 'flag-img-tz');
  document.getElementById('tzName1').textContent = match.team1.name.toUpperCase();
  document.getElementById('tzName2').textContent = match.team2.name.toUpperCase();
  document.getElementById('splitFlag1').innerHTML = flagImg(match.team1, 'flag-img-split');
  document.getElementById('splitFlag2').innerHTML = flagImg(match.team2, 'flag-img-split');

  document.getElementById('tzLeft').style.setProperty('--tz-color', match.team1.color);
  document.getElementById('tzRight').style.setProperty('--tz-color', match.team2.color);

  const statusBadgeEl = document.getElementById('predictStatusBadge');
  const badgeMap = {
    open: ['open', 'OPEN'], locked: ['locked', 'CLOSED'], live: ['live', 'LIVE'],
    upcoming: ['upcoming', 'UPCOMING'], finished: ['finished', 'DONE']
  };
  const [cls, label] = badgeMap[status] || ['upcoming', 'UPCOMING'];
  statusBadgeEl.className = `status-badge ${cls}`;
  statusBadgeEl.textContent = label;

  const sliderView = document.getElementById('sliderView');
  const resultView = document.getElementById('resultView');
  const hasPredicted = Predictions.hasUserPredicted(matchId);
  const canChange = Predictions.canChangePrediction(matchId);

  // Form-closure countdown (visible only while open)
  updateCloseCountdown(match, status);

  if (status === 'open' && canChange) {
    // User has predicted but can change — show slider with "change" mode
    sliderView.classList.remove('hidden');
    resultView.classList.add('hidden');
    resetSlider();
    showChangeMode(match);
  } else if (hasPredicted || status === 'locked' || status === 'live' || status === 'finished') {
    sliderView.classList.add('hidden');
    resultView.classList.remove('hidden');
    showResultView(matchId, match);
  } else if (status === 'upcoming') {
    sliderView.classList.remove('hidden');
    resultView.classList.add('hidden');
    showLockedView(match);
  } else {
    sliderView.classList.remove('hidden');
    resultView.classList.add('hidden');
    resetSlider();
  }

  Screens.show('predict');
}

function updateCloseCountdown(match, status) {
  const el = document.getElementById('predCloseCountdown');
  if (!el) return;
  if (status === 'open') {
    const closesIn = timeUntilPredictionCloses(match);
    el.innerHTML = `⏳ Predictions close in <span class="cc-time">${closesIn || '…'}</span>`;
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}

function showChangeMode(match) {
  const userPred = Predictions.getUserPrediction(match.id);
  const hint = document.getElementById('sliderHint');
  hint.innerHTML = `Current pick: <strong>${userPred.teamName}</strong> — slide to change`;
  const btn = document.getElementById('submitPredBtn');
  btn.textContent = 'SLIDE TO CHANGE PICK';
  btn.disabled = true;
}

function showResultView(matchId, match) {
  const userPred = Predictions.getUserPrediction(matchId);
  if (userPred) {
    const pickedTeam = userPred.teamName === match.team1.name ? match.team1 : match.team2;
    document.getElementById('pickedFlag').innerHTML = flagImg(pickedTeam, 'flag-img-pick');
    document.getElementById('pickedName').textContent = userPred.teamName;
    document.getElementById('yourPickDisplay').style.display = 'flex';

    // Show change button if match is still open
    const changeBtn = document.getElementById('changePredBtn');
    if (changeBtn) {
      changeBtn.style.display = Predictions.canChangePrediction(matchId) ? 'block' : 'none';
    }
  } else {
    document.getElementById('yourPickDisplay').style.display = 'none';
  }

  // Show winner result if match is finished
  const winnerDisplay = document.getElementById('winnerDisplay');
  if (winnerDisplay) {
    if (match.winner && (getMatchStatus(match) === 'finished')) {
      const winnerTeam = match.winner === match.team1.name ? match.team1 : match.team2;
      const userWon = userPred && userPred.teamName === match.winner;
      winnerDisplay.innerHTML = `
        <div class="result-winner ${userWon ? 'result-correct' : 'result-wrong'}">
          <span class="result-icon">${userWon ? '🎉' : '😔'}</span>
          <span class="result-text">${userWon ? 'YOU GOT IT RIGHT!' : 'Better luck next time!'}</span>
          <span class="result-team">🏆 ${winnerTeam.flag} ${match.winner} won</span>
        </div>`;
      winnerDisplay.style.display = 'block';
    } else {
      winnerDisplay.style.display = 'none';
    }
  }

  const stats = Predictions.getStats(matchId);
  document.getElementById('splitBar1').style.width      = stats.team1.pct + '%';
  document.getElementById('splitBar2').style.width      = stats.team2.pct + '%';
  document.getElementById('splitPct1').textContent      = stats.team1.pct + '%';
  document.getElementById('splitPct2').textContent      = stats.team2.pct + '%';
  document.getElementById('splitBar1').style.background = match.team1.color;
  document.getElementById('splitBar2').style.background = match.team2.color;
  document.getElementById('totalPreds').textContent     = `${stats.total} prediction${stats.total !== 1 ? 's' : ''} made`;
}

function showLockedView(match) {
  const predOpens = timeUntilPredictionOpens(match);
  const countdown = timeUntilMatch(match);
  document.getElementById('sliderHint').textContent = predOpens
    ? `Predictions open in ${predOpens}`
    : `Predictions open in ${countdown || 'soon'}`;
  document.getElementById('submitPredBtn').textContent = 'NOT OPEN YET';
  document.getElementById('submitPredBtn').disabled = true;
  document.getElementById('predSlider').disabled = true;
}

function resetSlider() {
  const slider = document.getElementById('predSlider');
  const ball   = document.getElementById('footballBall');
  slider.value = 50;
  slider.disabled = false;
  ball.style.left = '50%';
  document.getElementById('tzLeft').classList.remove('tz-selected');
  document.getElementById('tzRight').classList.remove('tz-selected');
  document.getElementById('sliderHint').textContent = 'Slide towards your pick';
  const btn = document.getElementById('submitPredBtn');
  btn.textContent = 'SELECT A TEAM FIRST';
  btn.disabled = true;
  _selectedTeam = null;
}

function initPredictSlider() {
  const slider    = document.getElementById('predSlider');
  const ball      = document.getElementById('footballBall');
  const tzLeft    = document.getElementById('tzLeft');
  const tzRight   = document.getElementById('tzRight');
  const hint      = document.getElementById('sliderHint');
  const submitBtn = document.getElementById('submitPredBtn');

  slider.addEventListener('input', () => {
    const val = parseInt(slider.value);
    const pct = val / 100;
    const thumbOffset = (1 - pct) * 28;
    ball.style.left = `calc(${val}% - ${thumbOffset - 14}px)`;

    if (val < 38) {
      const match = MATCHES.find(m => m.id === _predictMatchId);
      tzLeft.classList.add('tz-selected');
      tzRight.classList.remove('tz-selected');
      _selectedTeam = match ? match.team1.name : null;
      hint.textContent = `You pick ${match ? match.team1.name : '...'} 🏆`;
      const isChange = Predictions.canChangePrediction(_predictMatchId);
      submitBtn.textContent = isChange
        ? `CHANGE TO ${match ? match.team1.name.toUpperCase() : ''}`
        : `PREDICT ${match ? match.team1.name.toUpperCase() : ''}`;
      submitBtn.disabled = false;
    } else if (val > 62) {
      const match = MATCHES.find(m => m.id === _predictMatchId);
      tzRight.classList.add('tz-selected');
      tzLeft.classList.remove('tz-selected');
      _selectedTeam = match ? match.team2.name : null;
      hint.textContent = `You pick ${match ? match.team2.name : '...'} 🏆`;
      const isChange = Predictions.canChangePrediction(_predictMatchId);
      submitBtn.textContent = isChange
        ? `CHANGE TO ${match ? match.team2.name.toUpperCase() : ''}`
        : `PREDICT ${match ? match.team2.name.toUpperCase() : ''}`;
      submitBtn.disabled = false;
    } else {
      tzLeft.classList.remove('tz-selected');
      tzRight.classList.remove('tz-selected');
      _selectedTeam = null;
      hint.textContent = 'Slide towards your pick';
      submitBtn.textContent = 'SELECT A TEAM FIRST';
      submitBtn.disabled = true;
    }
  });

  submitBtn.addEventListener('click', async () => {
    if (!_selectedTeam || !_predictMatchId) return;
    const result = await Predictions.submitPrediction(_predictMatchId, _selectedTeam);
    if (result.success) {
      const match = MATCHES.find(m => m.id === _predictMatchId);
      const animText = result.updated ? 'PICK CHANGED!' : 'LOCKED IN!';
      showGoalAnimation(_selectedTeam, animText, () => {
        document.getElementById('sliderView').classList.add('hidden');
        document.getElementById('resultView').classList.remove('hidden');
        showResultView(_predictMatchId, match);
      });
    }
  });

  document.getElementById('backBtn').addEventListener('click', () => {
    Screens.show('home', 'left');
    setTimeout(renderHomeScreen, 100);
  });
}

// ─────────────────────────────────────────────
//  Goal Animation — Premium 3D
// ─────────────────────────────────────────────
function showGoalAnimation(teamName, titleText, callback) {
  const overlay = document.createElement('div');
  overlay.className = 'goal-overlay';
  overlay.innerHTML = `
    <div class="goal-stage">
      <div class="goal-lights">
        <div class="gl gl-1"></div>
        <div class="gl gl-2"></div>
        <div class="gl gl-3"></div>
        <div class="gl gl-4"></div>
        <div class="gl gl-5"></div>
      </div>
      <div class="goal-content">
        <div class="goal-ball-wrap">
          <div class="goal-ball-shadow"></div>
          <div class="goal-ball">⚽</div>
        </div>
        <div class="goal-text">${titleText || 'LOCKED IN!'}</div>
        <div class="goal-team">${teamName.toUpperCase()}</div>
        <div class="goal-subtitle">Your prediction is confirmed</div>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  // Premium confetti burst
  const colors = ['#f0c850','#3ee888','#ff4d5e','#4a9eff','#ffffff','#d4a810','#ff6b00','#a855f7'];
  const shapes = ['rect','circle'];
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('div');
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    p.className = `confetti-particle shape-${shape}`;
    p.style.cssText = `
      left: ${Math.random() * 100}vw;
      top: -12px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${Math.random() * 10 + 4}px;
      height: ${Math.random() * 12 + 4}px;
      --fall-duration: ${(Math.random() * 2 + 1.5).toFixed(2)}s;
      --fall-delay: ${(Math.random() * 0.7).toFixed(2)}s;
      --x-drift: ${(Math.random() * 280 - 140).toFixed(0)}px;
      --rotation: ${(Math.random() * 1440 - 720).toFixed(0)}deg;
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 4000);
  }

  setTimeout(() => overlay.classList.add('goal-fade'), 1900);
  setTimeout(() => { overlay.remove(); callback(); }, 2450);
}

// ─────────────────────────────────────────────
//  My Picks Screen
// ─────────────────────────────────────────────
function renderPicksScreen() {
  const preds = Predictions.getUserAllPredictions();
  const list  = document.getElementById('picksList');
  list.innerHTML = '';
  document.getElementById('totalPicksNum').textContent = preds.length;

  let correctCount = 0;

  if (!preds.length) {
    list.innerHTML = '<p class="empty-state">No predictions yet.<br>Go pick some winners! 🏆</p>';
    document.getElementById('correctPicksNum').textContent = '—';
    return;
  }

  preds.forEach(pred => {
    const match  = pred.match;
    if (!match) return;
    const isT1   = pred.teamName === match.team1.name;
    const picked = isT1 ? match.team1 : match.team2;
    const status = getMatchStatus(match);

    let isCorrect = false;
    if (status === 'finished' && match.winner) {
      if (match.winner === pred.teamName) { correctCount++; isCorrect = true; }
    }

    const item = document.createElement('div');
    item.className = 'pick-item';

    let statusHTML = `<span class="status-badge ${status}" style="font-size:10px">${status.toUpperCase()}</span>`;
    if (status === 'finished' && match.winner) {
      statusHTML = isCorrect
        ? `<span class="status-badge" style="font-size:10px;background:rgba(62,232,136,0.12);color:var(--green-light);border:1px solid rgba(62,232,136,0.3)">✓ WIN</span>`
        : `<span class="status-badge" style="font-size:10px;background:rgba(255,77,94,0.1);color:var(--red-live);border:1px solid rgba(255,77,94,0.25)">✗ LOSS</span>`;
    }

    // Show change indicator
    const changedNote = pred.changedAt ? `<span style="font-size:9px;color:var(--text-dim)">↻ changed</span>` : '';

    item.innerHTML = `
      <div class="pick-item-left">
        <div class="pick-item-match">${match.team1.name} vs ${match.team2.name}</div>
        <div class="pick-item-meta">${formatMatchDate(match)} · ${match.group !== '-' ? match.group : match.stage} ${changedNote}</div>
      </div>
      <div class="pick-item-right">
        <div class="pick-item-pick">${picked.flag} ${picked.name}</div>
        ${statusHTML}
      </div>`;
    list.appendChild(item);
  });

  const hasFinished = preds.some(p => getMatchStatus(p.match) === 'finished');
  document.getElementById('correctPicksNum').textContent = hasFinished ? correctCount : '—';
}

// ─────────────────────────────────────────────
//  Nav
// ─────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll(`.nav-item[data-screen="${target}"]`).forEach(b => b.classList.add('active'));
      if (target === 'home')  { Screens.show('home');  setTimeout(renderHomeScreen, 50); }
      if (target === 'picks') { Screens.show('picks'); setTimeout(renderPicksScreen, 50); }
    });
  });
}

// ─────────────────────────────────────────────
//  Boot
// ─────────────────────────────────────────────
function enterApp() {
  try {
    renderHomeScreen();
    Screens.show('home');
  } catch (err) {
    console.error('enterApp crash:', err);
    Screens.show('home');
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  ['splash','login','home','predict','picks'].forEach(id => {
    const el = document.getElementById(`screen-${id}`);
    if (el) Screens.register(id, el);
  });

  try {
    await fetchMatches();
  } catch (err) { console.error('fetchMatches failed:', err); }

  try {
    await DB.loadPredictions();
  } catch (err) { console.error('loadPredictions failed:', err); }

  let user = null;
  try {
    user = await Auth.init();
  } catch (err) { console.error('Auth.init failed:', err); }
  
  initLoginScreen();
  initPredictSlider();
  initNav();

  setTimeout(() => {
    if (user) enterApp();
    else Screens.show('login');
  }, 2400);

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    Auth.logout();
    window.location.reload();
  });

  // ── Polling loop: live scores + countdowns ──────────
  let tickCount = 0;
  let lastScoreHash = '';

  setInterval(async () => {
    tickCount++;

    // ── Live-aware refresh: every 15s while a match is live, else 30s ─────
    // While live we ping /api/live (ESPN→Redis) right before re-fetching, so
    // goals and the minute land within ~15s. The client is the cron — no paid
    // Vercel plan needed. GET is throttled server-side (12s shared lock), so
    // any number of open browsers cap ESPN at ~5 requests/min.
    const hasLiveMatch = MATCHES.some(m => getMatchStatus(m) === 'live');
    const refreshEvery = hasLiveMatch ? 15 : 30;
    if (tickCount % refreshEvery === 0) {
      if (hasLiveMatch) {
        try { await fetch('/api/live'); } catch (e) { /* silent — admin can force-sync */ }
      }
      await fetchMatches();
      if (Screens.getCurrent() === 'home')  renderHomeScreen();
      if (Screens.getCurrent() === 'picks') renderPicksScreen();
    }

    // Poll live scores from localStorage every 5s
    if (tickCount % 5 === 0) {
      const scores = DB.getAllScores();
      const hash = JSON.stringify(scores);
      if (hash !== lastScoreHash) {
        lastScoreHash = hash;
        if (Screens.getCurrent() === 'home') renderHomeScreen();
      }
    }

    // Live match clock — smooth-tick the minute every second on live cards
    document.querySelectorAll('.live-minute-ticker').forEach(el => {
      const matchId = parseInt(el.dataset.matchId);
      const match = MATCHES.find(m => m.id === matchId);
      if (!match) return;
      const clock = liveMatchClock(match);
      if (clock) el.textContent = clock;
    });

    // Prediction-open tickers — "opens in" on upcoming cards
    document.querySelectorAll('.open-ticker').forEach(el => {
      const matchId = parseInt(el.dataset.matchId);
      const match = MATCHES.find(m => m.id === matchId);
      if (!match) return;
      if (getMatchStatus(match) === 'upcoming') {
        const span = el.querySelector('.badge-opens-in');
        if (span) span.textContent = timeUntilPredictionOpens(match) || 'soon';
      } else if (Screens.getCurrent() === 'home') {
        renderHomeScreen();   // window just opened → re-render so the card flips to OPEN
      }
    });

    // Kickoff tickers — "kicks off in" on upcoming cards
    document.querySelectorAll('.kickoff-ticker').forEach(el => {
      const matchId = parseInt(el.dataset.matchId);
      const match = MATCHES.find(m => m.id === matchId);
      if (match && getMatchStatus(match) === 'upcoming') {
        el.textContent = `⏱ kicks off in ${timeUntilMatch(match) || 'soon'}`;
      }
    });

    // Form-closure tickers — "closes in" on open cards
    document.querySelectorAll('.close-ticker').forEach(el => {
      const matchId = parseInt(el.dataset.matchId);
      const match = MATCHES.find(m => m.id === matchId);
      if (!match) return;
      const status = getMatchStatus(match);
      if (status === 'open') {
        const closesIn = timeUntilPredictionCloses(match);
        const span = el.querySelector('.badge-close-in');
        if (span) span.textContent = `· closes in ${closesIn || '…'}`;
      } else if (Screens.getCurrent() === 'home') {
        renderHomeScreen();
      }
    });

    // Predict screen countdowns
    if (Screens.getCurrent() === 'predict' && _predictMatchId) {
      const match = MATCHES.find(m => m.id === _predictMatchId);
      if (match) {
        const status = getMatchStatus(match);
        const sliderHint = document.getElementById('sliderHint');

        updateCloseCountdown(match, status);

        if (status === 'upcoming' && sliderHint) {
          const predOpens = timeUntilPredictionOpens(match);
          sliderHint.textContent = predOpens
            ? `Predictions open in ${predOpens}`
            : `Predictions open in ${timeUntilMatch(match) || 'soon'}`;
        } else if (status === 'open' && sliderHint) {
          const btn = document.getElementById('submitPredBtn');
          if (btn && btn.disabled && sliderHint.textContent.includes('open in')) {
            openPredictScreen(_predictMatchId);
          }
        } else if (status === 'locked') {
          const sliderView = document.getElementById('sliderView');
          if (sliderView && !sliderView.classList.contains('hidden')) {
            openPredictScreen(_predictMatchId);
          }
        }
      }
    }
  }, 1000);
});
