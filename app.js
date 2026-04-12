/* ─────────────────────────────────────────────
   Source Access — app.js
───────────────────────────────────────────── */

const $ = id => document.getElementById(id);

const WEBHOOK_URL = 'https://discord.com/api/v10/webhooks/1491969328889860297/E2eVMVa8vyI9uQ-cJOtbjMZhpPZ7feqPr5CXUXMbc4ZxTbffmzC8ilbnMCsuxKAm0QUp';

const PLAN_PRICES = { day: 35, week: 200, month: 400, lifetime: 650 };
const PLAN_LABELS = { day: '1 Day', week: '1 Week', month: '1 Month', lifetime: 'Lifetime' };

const state = {
  robloxUsername: '',
  discordId: '',
  selectedPlan: null,
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

// ── Select plan ───────────────────────────
function selectPlan(planKey) {
  state.selectedPlan = planKey;
  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`.plan-card[data-plan="${planKey}"]`)?.classList.add('selected');
  const btn = $('buyBtn');
  btn.textContent = `Purchase · ${PLAN_PRICES[planKey]} R$`;
  btn.disabled = false;
}

// ── Purchase ──────────────────────────────
function purchase() {
  if (!state.selectedPlan) return;

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
    };
    const existing = JSON.parse(localStorage.getItem('sa_submissions') || '[]');
    existing.push(entry);
    localStorage.setItem('sa_submissions', JSON.stringify(existing));
  } catch(e) { console.warn('[Admin storage]', e); }

  show('s-purchased');
}

// ── Go back ────────────────────────────────
function goBack() { setError(''); show('s-login'); }

// ── Enter key ─────────────────────────────
['robloxInput','discordInput'].forEach(id => {
  $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
});

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
