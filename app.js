/* ─────────────────────────────────────────────
   Source Access — app.js
───────────────────────────────────────────── */

const $ = id => document.getElementById(id);

const WEBHOOK_URL = 'https://discord.com/api/v10/webhooks/1491969328889860297/E2eVMVa8vyI9uQ-cJOtbjMZhpPZ7feqPr5CXUXMbc4ZxTbffmzC8ilbnMCsuxKAm0QUp';
const ADMIN_PASSWORD = 'sourceadmin2024'; // Change this to your password

const PLAN_PRICES = { day: 35, week: 200, month: 400, lifetime: 650 };
const PLAN_LABELS = { day: '1 Day', week: '1 Week', month: '1 Month', lifetime: 'Lifetime' };

const state = {
  robloxUsername: '',
  discordId: '',
  selectedPlan: null,
  accessCode: '',
};

// ── Dates ──────────────────────────────────
function formatDate() { return new Date().toISOString().slice(0, 10); }
['footerDate','footerDate2','footerDate3','footerDate4'].forEach(id => {
  const el = $(id); if (el) el.textContent = formatDate();
});

// ── Card tilt ──────────────────────────────
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

// ── Scan transition ────────────────────────
function scanTransition(cb) {
  const line = $('scanLine');
  line.classList.remove('scanning');
  void line.offsetWidth;
  line.classList.add('scanning');
  setTimeout(cb, 260);
}

// ── Show screen ────────────────────────────
function show(id) {
  scanTransition(() => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
  });
}

// ── Error ──────────────────────────────────
function setError(msg) {
  const el = $('errMsg'), txt = $('errTxt');
  txt.textContent = msg;
  el.classList.toggle('visible', !!msg);
}

// ── Avatar initials ────────────────────────
function setAvatar(username) {
  const el = $('avatarImg');
  el.textContent = username.slice(0, 2).toUpperCase();
  el.style.display = 'flex';
  $('avatarSkeleton').style.display = 'none';
}

// ── Webhook ────────────────────────────────
async function sendWebhook(roblox, discordId, plan) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', timeZoneName:'short' });
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          author: { name: '🔐  Source Access  ·  New Purchase Request' },
          color: 0xffffff,
          fields: [
            { name: '🎮  Roblox Username', value: `\`\`\`${roblox}\`\`\``, inline: true },
            { name: '💬  Discord',         value: `<@${discordId}>\n\`${discordId}\``, inline: true },
            { name: '\u200b', value: '\u200b', inline: false },
            { name: '📦  Plan Selected',   value: `**${PLAN_LABELS[plan]}** — \`${PLAN_PRICES[plan]} R$\``, inline: true },
            { name: '🕐  Submitted',       value: `${dateStr}\n${timeStr}`, inline: true },
          ],
          footer: { text: 'Source Access Portal · v2.4' },
          timestamp: now.toISOString(),
        }],
      }),
    });
  } catch(e) { console.error('[Webhook]', e); }
}

// ── Validation ─────────────────────────────
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

// ── Particles ─────────────────────────────
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

// ── Login ──────────────────────────────────
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
    setError('Discord ID must be a 17–19 digit number. Enable Developer Mode in Discord settings.'); return;
  }

  state.robloxUsername = robloxEl.value.trim();
  state.discordId      = discordEl.value.trim();

  $('confirmName').textContent    = state.robloxUsername;
  $('summaryRoblox').textContent  = state.robloxUsername;
  $('summaryDiscord').textContent = state.discordId;
  $('summaryId').textContent      = 'Self-reported';

  setAvatar(state.robloxUsername);
  show('s-confirm');
}

// ── Confirm → pricing ─────────────────────
function grantAccess() {
  burst();
  show('s-pricing');
}

// ── Go back (confirm → login) ──────────────
function goBack() {
  setError('');
  show('s-login');
}

// ── Go back (pricing → confirm) ────────────
function goBackToConfirm() {
  show('s-confirm');
}

// ── Select plan ───────────────────────────
function selectPlan(planKey) {
  state.selectedPlan = planKey;
  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`.plan-card[data-plan="${planKey}"]`)?.classList.add('selected');
  // Also support id-based selection (index.html uses id="plan-day" etc.)
  document.querySelectorAll('.plan-card').forEach(c => {
    const id = c.id; // e.g. "plan-day"
    if (id && id === `plan-${planKey}`) c.classList.add('selected');
  });

  const btn = $('purchaseBtn');
  if (btn) {
    btn.textContent = `Purchase · ${PLAN_PRICES[planKey]} R$`;
    btn.disabled = false;
  }
}

// ── Countdown on granted screen ────────────
let _countdownTimer = null;
function startCountdown(seconds, redirectFn) {
  clearInterval(_countdownTimer);
  const numEl  = $('countNum');
  const ringEl = $('countRing');
  const total  = 50.265; // circumference approx for r=8 (2πr)
  const circ   = 50.265;
  let remaining = seconds;

  function tick() {
    if (numEl) numEl.textContent = remaining;
    if (ringEl) ringEl.style.strokeDashoffset = circ * (1 - remaining / seconds);
    if (remaining <= 0) {
      clearInterval(_countdownTimer);
      if (redirectFn) redirectFn();
    }
    remaining--;
  }
  tick();
  _countdownTimer = setInterval(tick, 1000);
}

// ── Copy access code ───────────────────────
function copyCode() {
  const val = $('accessCodeVal')?.textContent;
  if (!val || val === '-') return;
  navigator.clipboard.writeText(val).then(() => {
    const btn = $('copyBtn');
    if (btn) {
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    }
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = val;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const btn = $('copyBtn');
    if (btn) {
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    }
  });
}

// ── Purchase ──────────────────────────────
function handlePurchase() {
  if (!state.selectedPlan) return;

  // Generate access code
  state.accessCode = 'SA-' + Math.random().toString(36).slice(2,6).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

  // Fire webhook
  sendWebhook(state.robloxUsername, state.discordId, state.selectedPlan);

  // Save to localStorage for admin panel
  try {
    const entry = {
      id:        Math.random().toString(36).slice(2) + Date.now().toString(36),
      roblox:    state.robloxUsername,
      discordId: state.discordId,
      plan:      state.selectedPlan,
      status:    'pending',
      timestamp: Date.now(),
      accessCode: state.accessCode,
    };
    const existing = JSON.parse(localStorage.getItem('sa_submissions') || '[]');
    existing.push(entry);
    localStorage.setItem('sa_submissions', JSON.stringify(existing));
  } catch(e) { console.warn('[Admin storage]', e); }

  // Populate granted screen
  const planLabel = $('grantedPlan');
  const planPrice = $('grantedPrice');
  const codeVal   = $('accessCodeVal');
  if (planLabel) planLabel.textContent = PLAN_LABELS[state.selectedPlan];
  if (planPrice) planPrice.textContent = PLAN_PRICES[state.selectedPlan] + ' R$';
  if (codeVal)   codeVal.textContent   = state.accessCode;

  burst();
  show('s-granted');

  // Start countdown — redirect back to login after 5s
  setTimeout(() => {
    startCountdown(5, () => show('s-login'));
  }, 600);
}

// ── Admin: show login ──────────────────────
function showAdmin() {
  const pwInput = $('adminPwInput');
  if (pwInput) pwInput.value = '';
  const errEl = $('adminPwError');
  if (errEl) errEl.style.display = 'none';
  show('s-admin-login');
}

// ── Admin: authenticate ────────────────────
function handleAdminLogin() {
  const pw = $('adminPwInput')?.value || '';
  const errEl = $('adminPwError');
  if (pw === ADMIN_PASSWORD) {
    if (errEl) errEl.style.display = 'none';
    loadAdminPanel();
    show('s-admin');
  } else {
    if (errEl) errEl.style.display = 'flex';
    const inp = $('adminPwInput');
    inp?.classList.remove('shake');
    void inp?.offsetWidth;
    inp?.classList.add('shake');
    setTimeout(() => inp?.classList.remove('shake'), 600);
  }
}

// ── Admin: load data ───────────────────────
function loadAdminPanel() {
  let submissions = [];
  try {
    submissions = JSON.parse(localStorage.getItem('sa_submissions') || '[]');
  } catch(e) {}

  // Stats
  const total   = submissions.length;
  const revenue = submissions.reduce((sum, s) => sum + (PLAN_PRICES[s.plan] || 0), 0);

  const planCounts = {};
  submissions.forEach(s => { planCounts[s.plan] = (planCounts[s.plan] || 0) + 1; });
  const topPlan = Object.entries(planCounts).sort((a,b) => b[1]-a[1])[0]?.[0];

  const totalEl   = $('adminTotal');
  const revenueEl = $('adminRevenue');
  const topEl     = $('adminTopPlan');
  if (totalEl)   totalEl.textContent   = total;
  if (revenueEl) revenueEl.textContent = revenue + ' R$';
  if (topEl)     topEl.textContent     = topPlan ? PLAN_LABELS[topPlan] : '-';

  // List
  const list = $('submissionList');
  if (!list) return;
  if (submissions.length === 0) {
    list.innerHTML = '<div class="admin-empty">No submissions yet.</div>';
    return;
  }
  list.innerHTML = [...submissions].reverse().map(s => {
    const initials = (s.roblox || '??').slice(0, 2).toUpperCase();
    const date = new Date(s.timestamp).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    return `
      <div class="admin-row">
        <div class="admin-row-left">
          <div class="admin-row-avatar">${initials}</div>
          <div>
            <div class="admin-row-name">${s.roblox}</div>
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
}

// ── Admin: clear submissions ───────────────
function clearSubmissions() {
  if (!confirm('Clear all submissions? This cannot be undone.')) return;
  localStorage.removeItem('sa_submissions');
  loadAdminPanel();
}

// ── Admin: logout ──────────────────────────
function adminLogout() {
  show('s-login');
}

// ── Enter key ─────────────────────────────
['robloxInput','discordInput'].forEach(id => {
  $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
});
$('adminPwInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdminLogin(); });

// ── Focus management ───────────────────────
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
