/* ─────────────────────────────────────────────
   Source Access — app.js  (client)
   All sensitive ops go through /api/* backend.
   Webhook URL & admin key never touch this file.
───────────────────────────────────────────── */

const $ = id => document.getElementById(id);

const PLAN_PRICES = { day: 35, week: 200, month: 400, lifetime: 650 };
const PLAN_LABELS = { day: '1 Day', week: '1 Week', month: '1 Month', lifetime: 'Lifetime' };

const state = {
  robloxUsername: '',
  discordId: '',
  selectedPlan: null,
};

// ── Dates ──────────────────────────────────────────────────────────────────
function formatDate() { return new Date().toISOString().slice(0, 10); }
['footerDate','footerDate2','footerDate3','footerDate4'].forEach(id => {
  const el = $(id); if (el) el.textContent = formatDate();
});

// ── Remember-me / saved user ───────────────────────────────────────────────
async function loadSavedUser() {
  try {
    const res  = await fetch('/api/saved-user');
    const data = await res.json();
    if (data.ok && data.user) {
      $('robloxInput').value  = data.user.roblox;
      $('discordInput').value = data.user.discordId;
      $('rememberMe').checked = true;
      $('clearSaved').style.display = 'inline';
      // Trigger counters/validation
      const ev = new Event('input');
      $('robloxInput').dispatchEvent(ev);
    }
  } catch(e) { /* no saved user */ }
}

async function clearSavedUser() {
  await fetch('/api/clear-user', { method: 'POST' });
  $('robloxInput').value  = '';
  $('discordInput').value = '';
  $('rememberMe').checked = false;
  $('clearSaved').style.display = 'none';
}

loadSavedUser();

// ── Card tilt ──────────────────────────────────────────────────────────────
(function() {
  const wrapper = $('cardWrapper');
  document.addEventListener('mousemove', e => {
    const card = wrapper?.querySelector('.card');
    if (!card) return;
    const r  = card.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
    const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
    card.style.transform = `rotateY(${dx * 4}deg) rotateX(${-dy * 4}deg)`;
  });
  document.addEventListener('mouseleave', () => {
    const card = wrapper?.querySelector('.card');
    if (card) card.style.transform = '';
  });
})();

// ── Scan transition ────────────────────────────────────────────────────────
function scanTransition(cb) {
  const line = $('scanLine');
  line.classList.remove('scanning');
  void line.offsetWidth;
  line.classList.add('scanning');
  setTimeout(cb, 260);
}

// ── Show screen ────────────────────────────────────────────────────────────
function show(id) {
  scanTransition(() => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
  });
}

// ── Errors ─────────────────────────────────────────────────────────────────
function setError(msg) {
  const el = $('errMsg'), txt = $('errTxt');
  txt.textContent = msg;
  el.classList.toggle('visible', !!msg);
}

function setPurchaseError(msg) {
  const el = $('purchaseErr'), txt = $('purchaseErrTxt');
  if (!el || !txt) return;
  txt.textContent = msg;
  el.classList.toggle('visible', !!msg);
}

// ── Avatar initials ────────────────────────────────────────────────────────
function setAvatar(username) {
  const el = $('avatarImg');
  el.textContent = username.slice(0, 2).toUpperCase();
  el.style.display = 'flex';
  $('avatarSkeleton').style.display = 'none';
}

// ── Validation ─────────────────────────────────────────────────────────────
function validateField(input, wrap, isValid) {
  input.classList.remove('valid', 'invalid');
  wrap.classList.remove('show-valid', 'show-invalid');
  if (input.value.trim()) {
    input.classList.add(isValid ? 'valid' : 'invalid');
    wrap.classList.add(isValid ? 'show-valid' : 'show-invalid');
  }
}
const robloxRe  = /^[A-Za-z0-9_]{3,20}$/;
const discordRe = /^\d{17,19}$/;

$('robloxInput').addEventListener('blur', e =>
  validateField(e.target, $('robloxWrap'), robloxRe.test(e.target.value.trim())));
$('discordInput').addEventListener('blur', e =>
  validateField(e.target, $('discordWrap'), discordRe.test(e.target.value.trim())));
$('robloxInput').addEventListener('input', e => {
  const len = e.target.value.length;
  const c = $('robloxCounter');
  c.textContent = `${len}/20`;
  c.classList.toggle('visible', len > 0);
});

// ── Particles ──────────────────────────────────────────────────────────────
function burst() {
  const container = $('particles');
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (i / 22) * Math.PI * 2;
    const dist  = 60 + Math.random() * 90;
    const sz    = 2 + Math.random() * 4;
    p.style.cssText = `left:${cx}px;top:${cy}px;--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;--dur:${0.7+Math.random()*0.5}s;--delay:${Math.random()*0.15}s;--sz:${sz}px;--op:${0.4+Math.random()*0.6}`;
    container.appendChild(p);
    setTimeout(() => p.remove(), 1600);
  }
}

// ── Login ──────────────────────────────────────────────────────────────────
function handleLogin() {
  const robloxEl = $('robloxInput'), discordEl = $('discordInput');
  setError('');
  let valid = true;
  [robloxEl, discordEl].forEach(el => {
    el.classList.remove('shake');
    if (!el.value.trim()) {
      void el.offsetWidth; el.classList.add('shake'); valid = false;
      setTimeout(() => el.classList.remove('shake'), 600);
    }
  });
  if (!valid) return;
  if (!robloxRe.test(robloxEl.value.trim())) {
    setError('Roblox username must be 3–20 chars (letters, numbers, underscores).'); return;
  }
  if (!discordRe.test(discordEl.value.trim())) {
    setError('Discord ID must be a 17–19 digit number.'); return;
  }

  state.robloxUsername = robloxEl.value.trim();
  state.discordId      = discordEl.value.trim();

  // Save to session cookie if remember me is checked
  if ($('rememberMe').checked) {
    fetch('/api/save-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roblox: state.robloxUsername, discordId: state.discordId })
    });
    $('clearSaved').style.display = 'inline';
  }

  $('confirmName').textContent    = state.robloxUsername;
  $('summaryRoblox').textContent  = state.robloxUsername;
  $('summaryDiscord').textContent = state.discordId;

  setAvatar(state.robloxUsername);
  show('s-confirm');
}

// ── Confirm → pricing ──────────────────────────────────────────────────────
function grantAccess() {
  burst();
  // Load gamepass links from backend to populate buy buttons
  loadGamepassLinks();
  show('s-pricing');
}

async function loadGamepassLinks() {
  try {
    const res   = await fetch('/api/gamepass-links');
    const links = await res.json();
    // We could attach links to plan cards here if needed
    state.gamepassLinks = links;
  } catch(e) {}
}

// ── Go back ────────────────────────────────────────────────────────────────
function goBack()          { setError(''); show('s-login'); }
function goBackToConfirm() { show('s-confirm'); }

// ── Select plan ────────────────────────────────────────────────────────────
function selectPlan(planKey) {
  state.selectedPlan = planKey;
  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`.plan-card[data-plan="${planKey}"]`)?.classList.add('selected');
  const btn = $('purchaseBtn');
  if (btn) {
    btn.textContent = `Purchase · ${PLAN_PRICES[planKey]} R$`;
    btn.disabled = false;
  }
  setPurchaseError('');
}

// ── Countdown ──────────────────────────────────────────────────────────────
let _countdownTimer = null;
function startCountdown(seconds, redirectFn) {
  clearInterval(_countdownTimer);
  const numEl  = $('countNum');
  const ringEl = $('countRing');
  const circ   = 50.265;
  let remaining = seconds;
  function tick() {
    if (numEl)  numEl.textContent = remaining;
    if (ringEl) ringEl.style.strokeDashoffset = circ * (1 - remaining / seconds);
    if (remaining <= 0) { clearInterval(_countdownTimer); if (redirectFn) redirectFn(); }
    remaining--;
  }
  tick();
  _countdownTimer = setInterval(tick, 1000);
}

// ── Copy access code ───────────────────────────────────────────────────────
function copyCode() {
  const val = $('accessCodeVal')?.textContent;
  if (!val || val === '-') return;
  navigator.clipboard.writeText(val).then(() => {
    const btn = $('copyBtn');
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 2000); }
  });
}

// ── Purchase — calls backend to verify gamepass + fire webhook ─────────────
async function handlePurchase() {
  if (!state.selectedPlan) return;

  const btn = $('purchaseBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="display:block;margin:auto;"></div>';
  setPurchaseError('');

  try {
    const res  = await fetch('/api/verify-purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roblox:    state.robloxUsername,
        discordId: state.discordId,
        plan:      state.selectedPlan,
      })
    });
    const data = await res.json();

    if (!res.ok) {
      if (data.error === 'blacklisted') {
        setPurchaseError('Access denied: ' + (data.reason || 'You have been blocked.'));
      } else if (data.error === 'not_purchased') {
        // Show buy link if available
        const link = data.gamepassLink ? ` <a href="${data.gamepassLink}" target="_blank" style="color:rgba(255,255,255,0.7);text-decoration:underline;">Buy gamepass →</a>` : '';
        $('purchaseErrTxt').innerHTML = (data.message || 'Gamepass not found.') + link;
        $('purchaseErr').classList.add('visible');
      } else {
        setPurchaseError(data.error || 'Something went wrong. Try again.');
      }
      btn.disabled = false;
      btn.textContent = `Purchase · ${PLAN_PRICES[state.selectedPlan]} R$`;
      return;
    }

    // Success
    const planLabel = $('grantedPlan');
    const planPrice = $('grantedPrice');
    const codeVal   = $('accessCodeVal');
    if (planLabel) planLabel.textContent = data.plan;
    if (planPrice) planPrice.textContent = data.price + ' R$';
    if (codeVal)   codeVal.textContent   = data.accessCode;

    burst();
    show('s-granted');
    setTimeout(() => startCountdown(5, () => show('s-login')), 600);

  } catch(e) {
    setPurchaseError('Network error. Check your connection and try again.');
    btn.disabled = false;
    btn.textContent = `Purchase · ${PLAN_PRICES[state.selectedPlan]} R$`;
  }
}

// ── Admin: show login ──────────────────────────────────────────────────────
function showAdmin() {
  // If already authed via session cookie, go straight in
  fetch('/api/admin/check').then(r => r.json()).then(data => {
    if (data.authed) {
      loadAdminPanel();
      show('s-admin');
    } else {
      const inp = $('adminPwInput');
      if (inp) inp.value = '';
      const errEl = $('adminPwError');
      if (errEl) errEl.style.display = 'none';
      show('s-admin-login');
    }
  });
}

// ── Admin: authenticate ────────────────────────────────────────────────────
async function handleAdminLogin() {
  const key    = $('adminPwInput')?.value || '';
  const errEl  = $('adminPwError');
  const inp    = $('adminPwInput');

  try {
    const res  = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    if (res.ok) {
      if (errEl) errEl.style.display = 'none';
      loadAdminPanel();
      show('s-admin');
    } else {
      if (errEl) errEl.style.display = 'flex';
      inp?.classList.remove('shake');
      void inp?.offsetWidth;
      inp?.classList.add('shake');
      setTimeout(() => inp?.classList.remove('shake'), 600);
    }
  } catch(e) {
    if (errEl) errEl.style.display = 'flex';
  }
}

// ── Admin: logout ──────────────────────────────────────────────────────────
async function adminLogout() {
  await fetch('/api/admin/logout', { method: 'POST' });
  show('s-login');
}

// ── Admin: load all data ───────────────────────────────────────────────────
async function loadAdminPanel() {
  await Promise.all([
    loadAdminStats(),
    loadAdminOrders(),
    loadAdminBlacklist(),
    loadAdminGamepassLinks(),
  ]);
}

async function loadAdminStats() {
  try {
    const res  = await fetch('/api/admin/stats');
    const data = await res.json();
    const el = id => $(id);
    if (el('adminTotal'))   el('adminTotal').textContent   = data.total;
    if (el('adminRevenue')) el('adminRevenue').textContent = data.revenue + ' R$';
    if (el('adminTopPlan')) el('adminTopPlan').textContent = data.topPlan || '-';
  } catch(e) {}
}

async function loadAdminOrders() {
  try {
    const res  = await fetch('/api/admin/orders');
    const data = await res.json();
    const list = $('submissionList');
    if (!list) return;
    if (!data.orders || data.orders.length === 0) {
      list.innerHTML = '<div class="admin-empty">No orders yet.</div>'; return;
    }
    list.innerHTML = data.orders.map(s => {
      const initials = (s.roblox || '??').slice(0, 2).toUpperCase();
      const date     = new Date(s.timestamp).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
      const verified = s.verified
        ? '<span class="bl-tag" style="background:rgba(100,255,150,0.08);color:rgba(100,255,150,0.7);border-color:rgba(100,255,150,0.15);">✓ verified</span>'
        : '<span class="bl-tag">pending</span>';
      return `
        <div class="admin-row">
          <div class="admin-row-left">
            <div class="admin-row-avatar">${initials}</div>
            <div>
              <div class="admin-row-name">${s.roblox} ${verified}</div>
              <div class="admin-row-discord">${s.discordId}</div>
            </div>
          </div>
          <div class="admin-row-right">
            <div class="admin-row-plan">${PLAN_LABELS[s.plan] || s.plan}</div>
            <div class="admin-row-price">${PLAN_PRICES[s.plan] || '?'} R$</div>
            <div class="admin-row-date">${date}</div>
          </div>
        </div>`;
    }).join('');
  } catch(e) {}
}

async function clearOrders() {
  if (!confirm('Clear all orders? This cannot be undone.')) return;
  await fetch('/api/admin/orders', { method: 'DELETE' });
  loadAdminPanel();
}

// ── Admin: blacklist ───────────────────────────────────────────────────────
async function loadAdminBlacklist() {
  try {
    const res  = await fetch('/api/admin/blacklist');
    const data = await res.json();
    const list = $('blacklistEntries');
    if (!list) return;
    if (!data.blacklist || data.blacklist.length === 0) {
      list.innerHTML = '<div class="admin-empty">No blacklisted users.</div>'; return;
    }
    list.innerHTML = data.blacklist.map(b => {
      const typeLabel = { username:'Roblox', discordId:'Discord ID', ip:'IP' }[b.type] || b.type;
      const date = new Date(b.addedAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
      return `
        <div class="admin-row">
          <div class="admin-row-left">
            <div class="admin-row-avatar" style="font-size:8px;color:rgba(255,100,100,0.6);">BAN</div>
            <div>
              <div class="admin-row-name">${b.value} <span class="bl-tag">${typeLabel}</span></div>
              <div class="admin-row-discord">${b.reason || 'No reason given'}</div>
            </div>
          </div>
          <div class="admin-row-right">
            <div class="admin-row-date">${date}</div>
            <button class="bl-remove-btn" onclick="removeBlacklist('${b.id}')">Remove</button>
          </div>
        </div>`;
    }).join('');
  } catch(e) {}
}

function showAddBlacklist()  { $('addBlForm').style.display = 'block'; }
function hideAddBlacklist()  { $('addBlForm').style.display = 'none'; }

async function submitBlacklist() {
  const type   = $('blType').value;
  const value  = $('blValue').value.trim();
  const reason = $('blReason').value.trim();
  if (!value) return;
  try {
    const res = await fetch('/api/admin/blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, value, reason })
    });
    if (res.ok) {
      $('blValue').value = '';
      $('blReason').value = '';
      hideAddBlacklist();
      loadAdminBlacklist();
      loadAdminStats();
    } else {
      const d = await res.json();
      alert(d.error || 'Error adding to blacklist');
    }
  } catch(e) { alert('Network error'); }
}

async function removeBlacklist(id) {
  await fetch('/api/admin/blacklist/' + id, { method: 'DELETE' });
  loadAdminBlacklist();
}

// ── Admin: gamepass links ──────────────────────────────────────────────────
async function loadAdminGamepassLinks() {
  try {
    const res   = await fetch('/api/admin/gamepass-links');
    const links = await res.json();
    ['day','week','month','lifetime'].forEach(plan => {
      const input = $('gp-' + plan);
      const link  = $('gp-' + plan + '-link');
      if (input) input.value = links[plan] || '';
      if (link && links[plan]) {
        link.href = links[plan].startsWith('http') ? links[plan] : `https://www.roblox.com/game-pass/${links[plan]}`;
        link.style.display = 'inline-flex';
      } else if (link) {
        link.style.display = 'none';
      }
    });
  } catch(e) {}
}

async function saveGamepassLinks() {
  const links = {
    day:      $('gp-day')?.value.trim()      || '',
    week:     $('gp-week')?.value.trim()     || '',
    month:    $('gp-month')?.value.trim()    || '',
    lifetime: $('gp-lifetime')?.value.trim() || '',
  };
  try {
    const res = await fetch('/api/admin/gamepass-links', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(links)
    });
    if (res.ok) {
      const msg = $('gpSaveMsg');
      msg.style.display = 'block';
      setTimeout(() => msg.style.display = 'none', 3000);
      loadAdminGamepassLinks();
    }
  } catch(e) { alert('Failed to save links'); }
}

// ── Admin: regen key ───────────────────────────────────────────────────────
async function regenAdminKey() {
  if (!confirm('Regenerate admin key? You will be logged out and the new key will be sent to your Discord webhook.')) return;
  const res  = await fetch('/api/admin/regen-key', { method: 'POST' });
  const data = await res.json();
  alert(data.message || 'Key regenerated. Check your webhook.');
  show('s-login');
}

// ── Admin tabs ─────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.admin-tab[onclick="switchTab('${name}')"]`)?.classList.add('active');
  $('tab-' + name)?.classList.add('active');
}

// ── Enter key shortcuts ────────────────────────────────────────────────────
['robloxInput','discordInput'].forEach(id => {
  $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
});
$('adminPwInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdminLogin(); });

// ── Focus management ───────────────────────────────────────────────────────
const observer = new MutationObserver(mutations => {
  for (const m of mutations) {
    if (m.type === 'attributes' && m.attributeName === 'class') {
      const el = m.target;
      if (el.classList.contains('active')) {
        const f = el.querySelector('input, button');
        if (f) setTimeout(() => f.focus(), 650);
      }
    }
  }
});
document.querySelectorAll('.screen').forEach(s => observer.observe(s, { attributes: true }));
