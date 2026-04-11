/* ───────────────────────────────────────────────
   Source Access — app.js
   Fixed Roblox lookup using cors-anywhere / proxy
   ─────────────────────────────────────────────── */

// ── State ──────────────────────────────────────
const state = {
  userId: null,
  username: null,
  displayName: null,
  avatarUrl: null,
};

// ── DOM helpers ────────────────────────────────
const $ = (id) => document.getElementById(id);
const setError = (msg) => {
  const el = $('errMsg');
  el.textContent = msg;
  el.classList.toggle('visible', !!msg);
};

// ── Screen transitions ─────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

// ── Button loading state ───────────────────────
function setLoading(loading) {
  const btn = $('loginBtn');
  btn.disabled = loading;
  $('spinner').style.display   = loading ? 'block' : 'none';
  $('btnIcon').style.display   = loading ? 'none'  : 'block';
  $('btnText').textContent     = loading ? 'Looking up…' : 'Continue';
}

// ── Roblox API helpers ─────────────────────────

/**
 * Try multiple proxy strategies to resolve a Roblox username to an ID.
 * Roblox blocks direct browser requests (no CORS), so we use public proxies.
 */
async function resolveUsername(username) {
  const encoded = encodeURIComponent(username);

  // Strategy 1: allorigins GET proxy → legacy username endpoint
  try {
    const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(
      `https://api.roblox.com/users/get-by-username?username=${encoded}`
    )}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.Id && !data.errorMessage) {
        return { id: data.Id, username: data.Username || username };
      }
    }
  } catch (_) { /* fall through */ }

  // Strategy 2: corsproxy.io → legacy endpoint
  try {
    const target = `https://api.roblox.com/users/get-by-username?username=${encoded}`;
    const url    = `https://corsproxy.io/?${encodeURIComponent(target)}`;
    const res    = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.Id && !data.errorMessage) {
        return { id: data.Id, username: data.Username || username };
      }
    }
  } catch (_) { /* fall through */ }

  // Strategy 3: allorigins POST proxy → /v1/usernames/users
  try {
    const body   = JSON.stringify({ usernames: [username], excludeBannedUsers: false });
    const target = `https://users.roblox.com/v1/usernames/users`;
    // allorigins wraps POST differently — use thingproxy
    const url    = `https://thingproxy.freeboard.io/fetch/${target}`;
    const res    = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      const user = data?.data?.[0];
      if (user && user.id) {
        return { id: user.id, username: user.name || username };
      }
    }
  } catch (_) { /* fall through */ }

  return null;
}

/**
 * Fetch the avatar headshot URL for a given userId.
 */
async function fetchAvatar(userId) {
  const target  = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`;
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    `https://corsproxy.io/?${encodeURIComponent(target)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      const url  = data?.data?.[0]?.imageUrl;
      if (url) return url;
    } catch (_) { /* try next */ }
  }
  return null;
}

// ── Login handler ──────────────────────────────
async function handleLogin() {
  const robloxEl  = $('robloxInput');
  const discordEl = $('discordInput');
  setError('');

  // Validate
  let valid = true;
  [robloxEl, discordEl].forEach(el => {
    el.classList.remove('shake');
    if (!el.value.trim()) {
      void el.offsetWidth;           // reflow to restart animation
      el.classList.add('shake');
      valid = false;
      setTimeout(() => el.classList.remove('shake'), 600);
    }
  });
  if (!valid) return;

  const username = robloxEl.value.trim();
  setLoading(true);

  try {
    // ── Resolve username → ID ──
    const user = await resolveUsername(username);
    if (!user) {
      setError('Roblox username not found. Double-check your spelling.');
      setLoading(false);
      return;
    }

    state.userId      = user.id;
    state.username    = user.username;
    state.displayName = user.username;

    // ── Fetch avatar ──
    const avatarUrl = await fetchAvatar(user.id);
    state.avatarUrl = avatarUrl;

    // ── Populate confirm screen ──
    $('confirmName').textContent = state.displayName;

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
        // If CDN URL fails, proxy it
        const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(avatarUrl)}`;
        img.onerror = () => {
          skeleton.style.display = 'none';
          img.style.display      = 'none';
        };
        img.src = proxied;
      };
      img.src = avatarUrl;
    } else {
      // No avatar — just hide skeleton, show placeholder state
      skeleton.style.display = 'none';
      img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(state.displayName)}&background=1a1a1a&color=7effa2&size=150&font-size=0.4&rounded=true&bold=true`;
      img.style.display = 'block';
    }

  } catch (err) {
    console.error('[Source Access] Error:', err);
    setError('Could not connect. Check your connection and try again.');
    setLoading(false);
  }
}

// ── Confirm / Back ─────────────────────────────
function goBack() {
  setError('');
  $('robloxInput').value = '';
  $('discordInput').value = '';

  const img = $('avatarImg');
  img.src = '';
  img.style.display = 'none';
  $('avatarSkeleton').style.display = 'none';

  show('s-login');
}

function grantAccess() {
  show('s-granted');
}

// ── Enter key support ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ['robloxInput', 'discordInput'].forEach(id => {
    $(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  });
});
