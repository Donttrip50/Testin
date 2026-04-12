/* ─────────────────────────────────────────────
   Source Access — app.js
   Shared by index.html and Admin.html
───────────────────────────────────────────── */

const $ = id => document.getElementById(id);

const WEBHOOK_URL = 'https://discord.com/api/v10/webhooks/1491969328889860297/E2eVMVa8vyI9uQ-cJOtbjMZhpPZ7feqPr5CXUXMbc4ZxTbffmzC8ilbnMCsuxKAm0QUp';

/* ─── App State (purchase flow) ─── */
const state = {
  robloxUsername: '',
  discordId:      '',
  selectedPlan:   '',
  selectedPrice:  0,
};

/* ═══════════════════════════════════════════
   SETTINGS  (localStorage)
═══════════════════════════════════════════ */
function getSettings() {
  try { return JSON.parse(localStorage.getItem('sa_settings') || '{}'); } catch { return {}; }
}
function saveSettings(patch) {
  localStorage.setItem('sa_settings', JSON.stringify({ ...getSettings(), ...patch }));
}
function getAdminPw()      { return getSettings().adminPw      || 'admin123'; }
function getGamepassLink() { return getSettings().gamepassLink  || 'https://www.roblox.com/game-pass/12345'; }
function getPrices() {
  const s = getSettings();
  return {
    day:      s.priceDay      || 35,
    week:     s.priceWeek     || 200,
    month:    s.priceMonth    || 400,
    lifetime: s.priceLifetime || 650,
  };
}

/* ═══════════════════════════════════════════
   ORDER STORAGE  (localStorage)
═══════════════════════════════════════════ */
function getOrders() {
  try { return JSON.parse(localStorage.getItem('sa_orders') || '[]'); } catch { return []; }
}
function saveOrderLocally(plan, price) {
  try {
    const orders = getOrders();
    orders.unshift({
      id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      roblox:    state.robloxUsername,
      discordId: state.discordId,
      plan, price,
      status:    'pending',
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('sa_orders', JSON.stringify(orders));
  } catch(e) { console.error('[Storage]', e); }
}

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
let _toastTimer;
function showToast(msg, dur = 2600) {
  const t = $('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), dur);
}

/* ═══════════════════════════════════════════
   UTILS
═══════════════════════════════════════════ */
function formatDate() { return new Date().toISOString().slice(0, 10); }
function esc(s) {
  const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML;
}
['footerDate','footerDate2','footerDate3','footerDate4'].forEach(id => {
  const el = $(id); if (el) el.textContent = formatDate();
});

/* ─── Particles ─── */
function burst() {
  const container = $('particles'), cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div'); p.className = 'particle';
    const angle = (i / 22) * Math.PI * 2, dist = 60 + Math.random() * 90, sz = 2 + Math.random() * 4;
    p.style.cssText = `left:${cx}px;top:${cy}px;--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;--dur:${0.7+Math.random()*0.5}s;--delay:${Math.random()*0.15}s;--sz:${sz}px;--op:${0.4+Math.random()*0.6};`;
    container.appendChild(p); setTimeout(() => p.remove(), 1600);
  }
}

/* ═══════════════════════════════════════════
   PURCHASE FLOW  (index.html)
═══════════════════════════════════════════ */

/* ─── Tilt card on mouse move ─── */
(function initTilt() {
  const wrapper = $('cardWrapper');
  if (!wrapper) return;
  document.addEventListener('mousemove', e => {
    const card = wrapper.querySelector('.card'); if (!card) return;
    const rect = card.getBoundingClientRect();
    const dx = (e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2);
    const dy = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2);
    card.style.transform = `rotateY(${dx * 4}deg) rotateX(${-dy * 4}deg)`;
  });
  document.addEventListener('mouseleave', () => {
    const card = wrapper.querySelector('.card'); if (card) card.style.transform = '';
  });
})();

/* ─── Screen transitions ─── */
function scanTransition(cb) {
  const line = $('scanLine'); if (!line) { cb(); return; }
  line.classList.remove('scanning'); void line.offsetWidth;
  line.classList.add('scanning'); setTimeout(cb, 260);
}
function show(id) {
  scanTransition(() => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = $(id); if (el) el.classList.add('active');
  });
}

/* ─── Field validation helpers ─── */
function setError(msg) {
  const el = $('errMsg'), txt = $('errTxt'); if (!el) return;
  txt.textContent = msg; el.classList.toggle('visible', !!msg);
}
function setAvatar(username) {
  const el = $('avatarImg'); if (el) el.textContent = username.slice(0, 2).toUpperCase();
}
function validateField(input, wrap, isValid) {
  input.classList.remove('valid', 'invalid'); wrap.classList.remove('show-valid', 'show-invalid');
  if (input.value.trim()) {
    input.classList.add(isValid ? 'valid' : 'invalid');
    wrap.classList.add(isValid ? 'show-valid' : 'show-invalid');
  }
}

const robloxRe = /^[A-Za-z0-9_]{3,20}$/;
const discordRe = /^\d{17,19}$/;

/* ─── Input listeners (only bind if elements exist) ─── */
const rIn = $('robloxInput'), dIn = $('discordInput');
if (rIn) {
  rIn.addEventListener('blur',  e => validateField(e.target, $('robloxWrap'),  robloxRe.test(e.target.value.trim())));
  rIn.addEventListener('input', e => {
    const len = e.target.value.length, c = $('robloxCounter');
    c.textContent = `${len}/20`; c.classList.toggle('visible', len > 0);
  });
  rIn.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
}
if (dIn) {
  dIn.addEventListener('blur',    e => validateField(e.target, $('discordWrap'), discordRe.test(e.target.value.trim())));
  dIn.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
}

/* ─── Login ─── */
function handleLogin() {
  const rEl = $('robloxInput'), dEl = $('discordInput'); setError('');
  let valid = true;
  [rEl, dEl].forEach(el => {
    el.classList.remove('shake');
    if (!el.value.trim()) { void el.offsetWidth; el.classList.add('shake'); valid = false; setTimeout(() => el.classList.remove('shake'), 600); }
  });
  if (!valid) return;
  if (!robloxRe.test(rEl.value.trim()))  { setError('Roblox username must be 3–20 chars (letters, numbers, underscores).'); return; }
  if (!discordRe.test(dEl.value.trim())) { setError('Discord ID must be a 17–19 digit number.'); return; }

  state.robloxUsername = rEl.value.trim();
  state.discordId      = dEl.value.trim();
  $('confirmName').textContent    = state.robloxUsername;
  $('summaryRoblox').textContent  = state.robloxUsername;
  $('summaryDiscord').textContent = state.discordId;
  setAvatar(state.robloxUsername);
  show('s-confirm');
}
function goBack() { setError(''); show('s-login'); }

/* ─── Confirm → Pricing ─── */
function grantAccess() {
  burst();
  sendWebhook('identity', { robloxUsername: state.robloxUsername, discordId: state.discordId });
  renderPlans();
  show('s-pricing');
}

/* ─── Render plan cards from saved prices ─── */
function renderPlans() {
  const prices = getPrices();
  const plans = [
    { id: 'day',      badge: 'Starter',    label: '1 Day',    price: prices.day,      desc: 'Try before you commit. Full access for 24 hours.' },
    { id: 'week',     badge: 'Popular',    label: '1 Week',   price: prices.week,     desc: 'A full week of unrestricted source access.' },
    { id: 'month',    badge: 'Best Value', label: '1 Month',  price: prices.month,    desc: '30 days of access. Most popular choice.' },
    { id: 'lifetime', badge: 'Forever',    label: 'Lifetime', price: prices.lifetime, desc: 'One-time payment. Never pay again. Forever yours.', wide: true },
  ];
  const grid = $('plansGrid'); if (!grid) return;
  grid.innerHTML = plans.map(p => `
    <div class="plan-card${p.wide ? ' plan-lifetime' : ''}" id="plan-${p.id}" onclick="selectPlan('${p.id}','${p.label}',${p.price})">
      <div class="plan-badge">${p.badge}</div>
      <div class="plan-duration">${p.label}</div>
      <div class="plan-price">${p.price} <span class="plan-currency">R$</span></div>
      <div class="plan-desc">${p.desc}</div>
      <div class="plan-select-indicator">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    </div>
  `).join('');
}

/* ─── Select a plan ─── */
function selectPlan(id, label, price) {
  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
  $('plan-' + id)?.classList.add('selected');
  state.selectedPlan  = label;
  state.selectedPrice = price;
  const btn = $('purchaseBtn'); if (!btn) return;
  btn.disabled = false;
  btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Buy ${label} — R$ ${price}`;
}

/* ─── Handle Purchase (redirect to Roblox gamepass) ─── */
function handlePurchase() {
  if (!state.selectedPlan) return;
  saveOrderLocally(state.selectedPlan, state.selectedPrice);
  sendWebhook('order', {
    robloxUsername: state.robloxUsername,
    discordId:      state.discordId,
    plan:           state.selectedPlan,
    price:          state.selectedPrice,
  });
  // Populate success screen
  $('orderedRoblox').textContent  = state.robloxUsername;
  $('orderedDiscord').textContent = state.discordId;
  $('orderedPlan').textContent    = state.selectedPlan;
  $('orderedPrice').textContent   = `R$ ${state.selectedPrice}`;
  const fd4 = $('footerDate4'); if (fd4) fd4.textContent = formatDate();
  burst();
  show('s-ordered');
  // Open gamepass after short delay so transition plays first
  setTimeout(() => { window.open(getGamepassLink(), '_blank'); }, 800);
  startCountdown();
}

/* ─── Countdown ring on success screen ─── */
function startCountdown() {
  let t = 5;
  const ring = $('countRing'), num = $('countNum');
  const circumference = 88;
  if (ring) ring.style.strokeDashoffset = 0;
  const iv = setInterval(() => {
    t--;
    if (num)  num.textContent = t;
    if (ring) ring.style.strokeDashoffset = circumference * (1 - t / 5);
    if (t <= 0) clearInterval(iv);
  }, 1000);
}

/* ═══════════════════════════════════════════
   WEBHOOK
═══════════════════════════════════════════ */
async function sendWebhook(type, data) {
  const now = new Date(), timestamp = now.toISOString();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  let embed = {};
  if (type === 'identity') {
    embed = {
      title: '🔐  Identity Confirmed',
      description: 'A user has verified their identity and is viewing purchase options.',
      color: 0x5865F2,
      fields: [
        { name: '👤  Roblox Username', value: `\`\`\`${data.robloxUsername}\`\`\``, inline: true },
        { name: '🪪  Discord',         value: `<@${data.discordId}>\n\`${data.discordId}\``, inline: true },
      ],
      footer: { text: `Source Access · ${dateStr} · ${timeStr}` }, timestamp,
    };
  } else if (type === 'order') {
    const planEmoji = { 'Lifetime': '⭐', '1 Month': '📅', '1 Week': '🗓️', '1 Day': '🕐' }[data.plan] || '📦';
    embed = {
      title: `${planEmoji}  New Purchase — ${data.plan}`,
      description: 'User has paid via Roblox gamepass.',
      color: data.plan === 'Lifetime' ? 0xFFD700 : 0x57F287,
      fields: [
        { name: '👤  Roblox',  value: `\`\`\`${data.robloxUsername}\`\`\``, inline: true },
        { name: '🪪  Discord', value: `<@${data.discordId}>\n\`${data.discordId}\``, inline: true },
        { name: '\u200b', value: '\u200b', inline: false },
        { name: '📦  Plan',  value: `**${data.plan}**`,       inline: true },
        { name: '💰  Price', value: `**R$ ${data.price}**`,   inline: true },
      ],
      footer: { text: `Source Access · ${dateStr} · ${timeStr}` }, timestamp,
    };
  }
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (err) { console.error('[Webhook]', err); }
}

/* ═══════════════════════════════════════════
   ADMIN PANEL  (Admin.html)
═══════════════════════════════════════════ */

/* ─── Login ─── */
function handleAdminLogin() {
  const pw = $('adminPwInput')?.value || '';
  if (pw === getAdminPw()) {
    $('adminPwError')?.classList.remove('visible');
    if ($('adminPwInput')) $('adminPwInput').value = '';
    $('view-login').style.display  = 'none';
    $('view-panel').style.display  = 'block';
    loadPanel();
  } else {
    $('adminPwError')?.classList.add('visible');
    const inp = $('adminPwInput');
    if (inp) { inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 600); }
  }
}
document.getElementById('adminPwInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAdminLogin();
});

function adminLogout() {
  $('view-panel').style.display = 'none';
  $('view-login').style.display = 'block';
}

/* ─── Load / Refresh Panel ─── */
function loadPanel() {
  const orders = getOrders();
  // Stats
  const el = id => $(id);
  if (el('statTotal'))   el('statTotal').textContent   = orders.length;
  if (el('statRevenue')) el('statRevenue').textContent = orders.reduce((a, o) => a + Number(o.price || 0), 0) + ' R$';
  if (el('statPending')) el('statPending').textContent = orders.filter(o => o.status === 'pending').length;
  // Settings inputs
  const s = getSettings(), prices = getPrices();
  if (el('gpLinkInput'))    el('gpLinkInput').value    = s.gamepassLink || '';
  if (el('price-day'))      el('price-day').value      = prices.day;
  if (el('price-week'))     el('price-week').value     = prices.week;
  if (el('price-month'))    el('price-month').value    = prices.month;
  if (el('price-lifetime')) el('price-lifetime').value = prices.lifetime;
  // Lists
  renderOrderList(orders);
  renderUserList(orders);
}

/* ─── Order list ─── */
function renderOrderList(orders) {
  const list = $('orderList'); if (!list) return;
  if (!orders.length) { list.innerHTML = '<div class="admin-empty">No orders yet.</div>'; return; }
  list.innerHTML = orders.map((o, i) => `
    <div class="admin-row" style="animation-delay:${i * 0.035}s">
      <div class="admin-row-left">
        <div class="admin-row-avatar">${esc((o.roblox || '?').slice(0, 2).toUpperCase())}</div>
        <div class="admin-row-info">
          <div class="admin-row-name">${esc(o.roblox)}</div>
          <div class="admin-row-discord">${esc(o.discordId)}</div>
          <div class="status-pill ${o.status || 'pending'}">
            <div class="status-pill-dot"></div>${o.status || 'pending'}
          </div>
          <div class="row-actions">
            <button class="btn-approve" onclick="setOrderStatus('${o.id}','approved')">✓ Approve</button>
            <button class="btn-reject"  onclick="setOrderStatus('${o.id}','rejected')">✕ Reject</button>
          </div>
        </div>
      </div>
      <div class="admin-row-right">
        <div class="admin-row-plan">${esc(o.plan)}</div>
        <div class="admin-row-price">R$ ${o.price}</div>
        <div class="admin-row-date">${new Date(o.timestamp).toLocaleDateString()}</div>
        <button class="btn-danger" style="margin-top:6px;font-size:8px;padding:3px 8px;" onclick="deleteOrder('${o.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

/* ─── User list (deduplicated) ─── */
function renderUserList(orders) {
  const list = $('userList'); if (!list) return;
  const seen = new Set(), users = [];
  for (const o of orders) { if (!seen.has(o.roblox)) { seen.add(o.roblox); users.push(o); } }
  const uc = $('userCount'); if (uc) uc.textContent = `${users.length} unique`;
  if (!users.length) { list.innerHTML = '<div class="admin-empty">No users yet.</div>'; return; }
  list.innerHTML = users.map((o, i) => {
    const orderCount = orders.filter(x => x.roblox === o.roblox).length;
    const totalSpent = orders.filter(x => x.roblox === o.roblox).reduce((a, x) => a + Number(x.price || 0), 0);
    return `
    <div class="admin-row" style="animation-delay:${i * 0.035}s">
      <div class="admin-row-left">
        <div class="admin-row-avatar">${esc((o.roblox || '?').slice(0, 2).toUpperCase())}</div>
        <div class="admin-row-info">
          <div class="admin-row-name">${esc(o.roblox)}</div>
          <div class="admin-row-discord">${esc(o.discordId)}</div>
          <div class="admin-row-date">${orderCount} order${orderCount !== 1 ? 's' : ''} &nbsp;·&nbsp; R$ ${totalSpent} total</div>
        </div>
      </div>
      <div class="admin-row-right">
        <div class="admin-row-plan">${esc(o.plan)}</div>
        <div class="admin-row-date">${new Date(o.timestamp).toLocaleDateString()}</div>
      </div>
    </div>`;
  }).join('');
}

/* ─── Search / filter ─── */
function filterOrders(q) {
  q = q.toLowerCase();
  renderOrderList(getOrders().filter(o =>
    (o.roblox || '').toLowerCase().includes(q) || (o.discordId || '').includes(q)
  ));
}
function filterUsers(q) {
  q = q.toLowerCase();
  renderUserList(getOrders().filter(o =>
    (o.roblox || '').toLowerCase().includes(q) || (o.discordId || '').includes(q)
  ));
}

/* ─── Order actions ─── */
function setOrderStatus(id, status) {
  const orders = getOrders().map(o => o.id === id ? { ...o, status } : o);
  localStorage.setItem('sa_orders', JSON.stringify(orders));
  renderOrderList(orders);
  const sp = $('statPending'); if (sp) sp.textContent = orders.filter(o => o.status === 'pending').length;
  showToast(`Order marked as ${status}`);
}
function deleteOrder(id) {
  const orders = getOrders().filter(o => o.id !== id);
  localStorage.setItem('sa_orders', JSON.stringify(orders));
  loadPanel();
  showToast('Order deleted');
}
function clearAll() {
  if (!confirm('Delete ALL orders? This cannot be undone.')) return;
  localStorage.removeItem('sa_orders');
  loadPanel();
  showToast('All orders cleared');
}

/* ─── Tab switching ─── */
function switchTab(tabId, btn) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const panel = $(tabId); if (panel) panel.classList.add('active');
}

/* ─── Settings saves ─── */
function saveGamepassLink() {
  const v = $('gpLinkInput')?.value.trim();
  if (!v) { showToast('Enter a valid URL'); return; }
  saveSettings({ gamepassLink: v });
  showToast('Gamepass link saved ✓');
}
function savePrices() {
  saveSettings({
    priceDay:      Number($('price-day')?.value)      || 35,
    priceWeek:     Number($('price-week')?.value)     || 200,
    priceMonth:    Number($('price-month')?.value)    || 400,
    priceLifetime: Number($('price-lifetime')?.value) || 650,
  });
  showToast('Prices saved ✓');
}
function changeAdminPw() {
  const v = $('newPwInput')?.value.trim();
  if (!v || v.length < 4) { showToast('Password too short (min 4 chars)'); return; }
  saveSettings({ adminPw: v });
  if ($('newPwInput')) $('newPwInput').value = '';
  showToast('Password updated ✓');
}

/* ─── Mutation observer — auto-focus first input on screen change ─── */
const screenObs = new MutationObserver(mutations => {
  for (const m of mutations) {
    if (m.type === 'attributes' && m.attributeName === 'class') {
      const el = m.target;
      if (el.classList.contains('active')) {
        const f = el.querySelector('input,button');
        if (f) setTimeout(() => f.focus(), 650);
      }
    }
  }
});
document.querySelectorAll('.screen').forEach(s => screenObs.observe(s, { attributes: true }));
