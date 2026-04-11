/* ─────────────────────────────────────────────
   Source Access — app.js
───────────────────────────────────────────── */

const $ = id => document.getElementById(id);

// ── Webhook ────────────────────────────────
const WEBHOOK_URL = 'https://discord.com/api/v10/webhooks/1491969328889860297/E2eVMVa8vyI9uQ-cJOtbjMZhpPZ7feqPr5CXUXMbc4ZxTbffmzC8ilbnMCsuxKAm0QUp';

// ── State ──────────────────────────────────
const state = {
  robloxUsername: '',
  discordId: '',
  accessCode: '',
  countdownTimer: null,
};

// ── Dates ──────────────────────────────────
function formatDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
['footerDate','footerDate2','footerDate3'].forEach(id => {
  const el = $(id);
  if (el) el.textContent = formatDate();
});

// ── Card 3D tilt ───────────────────────────
(function initTilt() {
  const wrapper = $('cardWrapper');
  document.addEventListener('mousemove', e => {
    const card = wrapper?.querySelector('.card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width  / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    const maxTilt = 4;
    card.style.transform = `rotateY(${dx * maxTilt}deg) rotateX(${-dy * maxTilt}deg)`;
  });
  document.addEventListener('mouseleave', () => {
    const card = wrapper?.querySelector('.card');
    if (card) card.style.transform = '';
  });
})();

// ── Scan line transition ───────────────────
function scanTransition(cb) {
  const line = $('scanLine');
  line.classList.remove('scanning');
  void line.offsetWidth;
  line.classList.add('scanning');
  setTimeout(cb, 260);
}

// ── Screen switch ──────────────────────────
function show(id) {
  scanTransition(() => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
  });
}

// ── Error ──────────────────────────────────
function setError(msg) {
  const el  = $('errMsg');
  const txt = $('errTxt');
  txt.textContent = msg;
  el.classList.toggle('visible', !!msg);
}

// ── Initials avatar ────────────────────────
function setAvatar(username) {
  const el       = $('avatarImg');
  const initials = username.slice(0, 2).toUpperCase();
  el.textContent = initials;
  el.style.display = 'flex';
  $('avatarSkeleton').style.display = 'none';
}

// ── Generate access code ───────────────────
function genCode(username) {
  const ts   = Date.now().toString(36).toUpperCase();
  const hash = Array.from(username)
    .reduce((a, c) => a + c.charCodeAt(0), 0)
    .toString(16).toUpperCase().padStart(4, '0');
  return `SA-${hash}-${ts}`;
}

// ── Send to Discord webhook ────────────────
async function sendWebhook(robloxUsername, discordId) {
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '🔐 New Source Access Submission',
          color: 0x2b2d31,
          fields: [
            {
              name: '🎮 Roblox Username',
              value: `\`${robloxUsername}\``,
              inline: true,
            },
            {
              name: '💬 Discord ID',
              value: `\`${discordId}\` (<@${discordId}>)`,
              inline: true,
            },
          ],
          footer: { text: `Source Access · ${new Date().toISOString()}` },
          timestamp: new Date().toISOString(),
        }],
      }),
    });
  } catch (err) {
    console.error('[Webhook]', err);
  }
}

// ── Field validation (on blur) ─────────────
function validateField(input, wrap, isValid) {
  input.classList.remove('valid', 'invalid');
  wrap.classList.remove('show-valid', 'show-invalid');
  if (input.value.trim()) {
    input.classList.add(isValid ? 'valid' : 'invalid');
    wrap.classList.add(isValid ? 'show-valid' : 'show-invalid');
  }
}

// Roblox: 3–20 chars, alphanumeric + underscore
const robloxRe = /^[A-Za-z0-9_]{3,20}$/;
// Discord ID: 17–19 digit snowflake
const discordRe = /^\d{17,19}$/;

$('robloxInput').addEventListener('blur', e => {
  validateField(e.target, $('robloxWrap'), robloxRe.test(e.target.value.trim()));
});
$('discordInput').addEventListener('blur', e => {
  validateField(e.target, $('discordWrap'), discordRe.test(e.target.value.trim()));
});

// ── Character counter (Roblox only) ────────
$('robloxInput').addEventListener('input', e => {
  const len = e.target.value.length;
  const counter = $('robloxCounter');
  counter.textContent = `${len}/20`;
  counter.classList.toggle('visible', len > 0);
});

// ── Particles ─────────────────────────────
function burst() {
  const container = $('particles');
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;
  const count = 22;
  for (let i = 0; i < count; i++) {
    const p    = document.createElement('div');
    p.className = 'particle';
    const angle = (i / count) * Math.PI * 2;
    const dist  = 60 + Math.random() * 90;
    const tx    = Math.cos(angle) * dist;
    const ty    = Math.sin(angle) * dist;
    const sz    = 2 + Math.random() * 4;
    p.style.cssText = `
      left:${cx}px; top:${cy}px;
      --tx:${tx}px; --ty:${ty}px;
      --dur:${0.7 + Math.random() * 0.5}s;
      --delay:${Math.random() * 0.15}s;
      --sz:${sz}px; --op:${0.4 + Math.random() * 0.6};
    `;
    container.appendChild(p);
    setTimeout(() => p.remove(), 1600);
  }
}

// ── Countdown ─────────────────────────────
function startCountdown(seconds = 5) {
  const numEl  = $('countNum');
  const ring   = $('countRing');
  const total  = 88;
  let   left   = seconds;

  ring.style.strokeDashoffset = '0';

  state.countdownTimer = setInterval(() => {
    left--;
    numEl.textContent = left;
    ring.style.strokeDashoffset = String(total * (1 - left / seconds));
    if (left <= 0) {
      clearInterval(state.countdownTimer);
    }
  }, 1000);
}

// ── Copy access code ───────────────────────
function copyCode() {
  const btn = $('copyBtn');
  navigator.clipboard.writeText(state.accessCode).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 2000);
  });
}

// ── Login handler ──────────────────────────
function handleLogin() {
  const robloxEl  = $('robloxInput');
  const discordEl = $('discordInput');
  setError('');

  // Shake empty fields
  let valid = true;
  [robloxEl, discordEl].forEach(el => {
    el.classList.remove('shake');
    if (!el.value.trim()) {
      void el.offsetWidth;
      el.classList.add('shake');
      valid = false;
      setTimeout(() => el.classList.remove('shake'), 600);
    }
  });
  if (!valid) return;

  if (!robloxRe.test(robloxEl.value.trim())) {
    setError('Roblox username must be 3–20 characters (letters, numbers, underscores).');
    return;
  }

  if (!discordRe.test(discordEl.value.trim())) {
    setError('Discord ID must be a 17–19 digit number. Enable Developer Mode in Discord settings to find it.');
    return;
  }

  state.robloxUsername = robloxEl.value.trim();
  state.discordId      = discordEl.value.trim();

  // Populate confirm screen directly — no API call
  $('confirmName').textContent    = state.robloxUsername;
  $('summaryRoblox').textContent  = state.robloxUsername;
  $('summaryDiscord').textContent = state.discordId;
  $('summaryId').textContent      = 'Unverified';

  setAvatar(state.robloxUsername);

  show('s-confirm');
}

// ── Grant access ───────────────────────────
function grantAccess() {
  burst();

  state.accessCode = genCode(state.robloxUsername);
  $('accessCodeVal').textContent = state.accessCode;

  // Send to webhook
  sendWebhook(state.robloxUsername, state.discordId);

  show('s-granted');
  setTimeout(() => startCountdown(5), 650);
}

// ── Go back ────────────────────────────────
function goBack() {
  setError('');
  show('s-login');
}

// ── Keyboard: Enter to submit ──────────────
['robloxInput','discordInput'].forEach(id => {
  $(id)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
});

// ── Focus management ───────────────────────
const observer = new MutationObserver(mutations => {
  for (const m of mutations) {
    if (m.type === 'attributes' && m.attributeName === 'class') {
      const el = m.target;
      if (el.classList.contains('active')) {
        const focusable = el.querySelector('input, button');
        if (focusable) setTimeout(() => focusable.focus(), 650);
      }
    }
  }
});
document.querySelectorAll('.screen').forEach(s =>
  observer.observe(s, { attributes: true })
);
