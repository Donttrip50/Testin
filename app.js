/* ───────────────────────────────────────────────
   Source Access — app.js
   Uses roproxy.com: a dedicated CORS proxy that
   mirrors the entire Roblox API for browser use.
   ─────────────────────────────────────────────── */

// ── DOM helpers ────────────────────────────────
const $ = (id) => document.getElementById(id);

const setError = (msg) => {
  const el  = $('errMsg');
  const txt = el.querySelector('span');
  if (txt) txt.textContent = msg;
  else el.textContent = msg;
  el.classList.toggle('visible', !!msg);
};

// ── Screen transitions ─────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

// ── Button loading state ───────────────────────
function setLoading(loading) {
  const btn    = $('loginBtn');
  btn.disabled = loading;
  $('spinner').style.display = loading ? 'block' : 'none';
  $('btnIcon').style.display = loading ? 'none'  : 'block';
  $('btnText').textContent   = loading ? 'Looking up…' : 'Continue';
}

// ── Roblox API via roproxy.com ─────────────────
// roproxy.com mirrors Roblox's API with proper CORS headers.
// users.roblox.com  →  users.roproxy.com
// thumbnails.roblox.com  →  thumbnails.roproxy.com

async function resolveUsername(username) {
  const res = await fetch('https://users.roproxy.com/v1/usernames/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  const user = data?.data?.[0];
  if (!user) return null;

  return {
    id:          user.id,
    username:    user.name,
    displayName: user.displayName || user.name,
  };
}

async function fetchAvatar(userId) {
  const res = await fetch(
    `https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`,
    { signal: AbortSignal.timeout(6000) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.[0]?.imageUrl ?? null;
}

// ── Login handler ──────────────────────────────
async function handleLogin() {
  const robloxEl  = $('robloxInput');
  const discordEl = $('discordInput');
  setError('');

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

  const username = robloxEl.value.trim();
  setLoading(true);

  try {
    const user = await resolveUsername(username);

    if (!user) {
      setError('Roblox username not found. Double-check your spelling.');
      setLoading(false);
      return;
    }

    const avatarUrl = await fetchAvatar(user.id);

    $('confirmName').textContent = user.displayName;

    const skeleton = $('avatarSkeleton');
    const img      = $('avatarImg');
    skeleton.style.display = 'block';
    img.style.display      = 'none';

    setLoading(false);
    show('s-confirm');

    if (avatarUrl) {
      img.onload = () => {
        skeleton.style.display = 'none';
        img.style.display      = 'block';
      };
      img.onerror = () => {
        skeleton.style.display = 'none';
        img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=111&color=7effa2&size=150&rounded=true&bold=true`;
        img.style.display = 'block';
      };
      img.src = avatarUrl;
    } else {
      skeleton.style.display = 'none';
      img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=111&color=7effa2&size=150&rounded=true&bold=true`;
      img.style.display = 'block';
    }

  } catch (err) {
    console.error('[Source Access]', err);
    if (err.name === 'TimeoutError') {
      setError('Request timed out. Check your connection and try again.');
    } else {
      setError('Could not connect to Roblox. Try again in a moment.');
    }
    setLoading(false);
  }
}

// ── Navigation ─────────────────────────────────
function goBack() {
  setError('');
  $('robloxInput').value  = '';
  $('discordInput').value = '';
  const img = $('avatarImg');
  img.src           = '';
  img.style.display = 'none';
  $('avatarSkeleton').style.display = 'none';
  show('s-login');
}

function grantAccess() {
  show('s-granted');
}

// ── Enter key ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ['robloxInput', 'discordInput'].forEach(id => {
    $(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleLogin();
    });
  });
});
