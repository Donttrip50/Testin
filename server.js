/*
  Source Access — server.js
  Backend: auth, Roblox GP verification, blacklist, gamepass links, webhooks, cookies
*/

const express      = require('express');
const session      = require('express-session');
const cookieParser = require('cookie-parser');
const crypto       = require('crypto');
const fs           = require('fs');
const path         = require('path');
const fetch        = require('node-fetch');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── DB (flat JSON) ───────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'data', 'db.json');

function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch {
    return {
      orders:      [],
      blacklist:   [],
      gamepasses:  {
        day:      { id: '', link: '' },
        week:     { id: '', link: '' },
        month:    { id: '', link: '' },
        lifetime: { id: '', link: '' },
      },
      adminKey:    '',
      webhookSent: false,
    };
  }
}

function saveDB(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ─── Config ───────────────────────────────────────────────────────────────────
// Webhook stored base64-encoded so it never appears in plaintext on the client
const _WH = 'aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvdjEwL3dlYmhvb2tzLzE0OTE5NjkzMjg4ODk4NjAyOTcvRTJlVk1WYTh2eUk5dVEtY0pPdGJqTVpocFBaN2ZlcVByNUNYVVhNYmM0WnhUYmZmbXpDOGlsYm5NQ3N1eEtBbTBRVXA=';
const WEBHOOK_URL = Buffer.from(_WH, 'base64').toString('utf8');

const PLAN_PRICES = { day: 35, week: 200, month: 400, lifetime: 650 };
const PLAN_LABELS = { day: '1 Day', week: '1 Week', month: '1 Month', lifetime: 'Lifetime' };

const SESSION_SECRET = crypto.randomBytes(32).toString('hex');

// ─── First-boot: generate admin key & send to webhook ────────────────────────
async function initAdminKey() {
  const db = loadDB();
  if (!db.adminKey) {
    db.adminKey    = crypto.randomBytes(16).toString('hex').toUpperCase();
    db.webhookSent = false;
    saveDB(db);
  }
  if (!db.webhookSent) {
    try {
      await sendRawWebhook({
        embeds: [{
          author: { name: '🔑  Source Access — Admin Key Generated' },
          color:  0xffd700,
          fields: [
            { name: '🛡️  Admin Password', value: `\`\`\`${db.adminKey}\`\`\``, inline: false },
            { name: '⚠️  Note',           value: 'Keep this secret. It is only sent once.', inline: false },
          ],
          footer:    { text: 'Source Access Portal · v2.4' },
          timestamp: new Date().toISOString(),
        }],
      });
      db.webhookSent = true;
      saveDB(db);
      console.log('[Boot] Admin key sent to webhook.');
    } catch(e) {
      console.error('[Boot] Could not send admin key to webhook:', e.message);
    }
  }
  console.log(`[Boot] Admin key loaded. Server starting on port ${PORT}.`);
}

// ─── Webhook helpers ──────────────────────────────────────────────────────────
async function sendRawWebhook(payload) {
  const res = await fetch(WEBHOOK_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Webhook HTTP ${res.status}`);
}

async function sendOrderWebhook({ roblox, discordId, plan, ip, verified }) {
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', timeZoneName:'short' });
  await sendRawWebhook({
    embeds: [{
      author: { name: '🔐  Source Access · New Purchase' },
      color:  verified ? 0x00e676 : 0xffffff,
      fields: [
        { name: '🎮  Roblox',     value: `\`\`\`${roblox}\`\`\``,                                      inline: true  },
        { name: '💬  Discord',    value: `<@${discordId}>\n\`${discordId}\``,                           inline: true  },
        { name: '\u200b',         value: '\u200b',                                                      inline: false },
        { name: '📦  Plan',       value: `**${PLAN_LABELS[plan]}** — \`${PLAN_PRICES[plan]} R$\``,      inline: true  },
        { name: '✅  GP Verified',value: verified ? '**Yes** (auto-confirmed)' : '**Pending** (manual)', inline: true  },
        { name: '🌐  IP',         value: `\`${ip}\``,                                                   inline: true  },
        { name: '🕐  Time',       value: `${dateStr}\n${timeStr}`,                                      inline: true  },
      ],
      footer:    { text: 'Source Access Portal · v2.4' },
      timestamp: now.toISOString(),
    }],
  });
}

// ─── Roblox API ───────────────────────────────────────────────────────────────
async function getRobloxUserId(username) {
  const res  = await fetch('https://users.roblox.com/v1/usernames/users', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ usernames: [username], excludeBannedUsers: true }),
  });
  const data = await res.json();
  return data?.data?.[0]?.id || null;
}

async function checkGamepassOwnership(userId, gamepassId) {
  if (!gamepassId || !userId) return false;
  const res  = await fetch(
    `https://inventory.roblox.com/v1/users/${userId}/items/GamePass/${gamepassId}`,
    { headers: { 'Accept': 'application/json' } }
  );
  const data = await res.json();
  return Array.isArray(data?.data) && data.data.length > 0;
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret:            SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7-day admin session
  },
}));

app.use(express.static(path.join(__dirname, 'public')));

function getIP(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

// IP blacklist middleware (excludes admin routes)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth')) return next();
  const db = loadDB();
  const ip = getIP(req);
  const blocked = db.blacklist.find(b => b.type === 'ip' && b.value === ip);
  if (blocked) return res.status(403).json({ error: 'blacklisted', reason: blocked.reason || 'Access denied.' });
  next();
});

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

// Config (plan info, whether gamepasses are configured)
app.get('/api/config', (req, res) => {
  const db = loadDB();
  const gp = {};
  for (const [plan, val] of Object.entries(db.gamepasses)) {
    gp[plan] = { hasLink: !!val.link, hasId: !!val.id };
  }
  res.json({ plans: PLAN_PRICES, labels: PLAN_LABELS, gamepasses: gp });
});

// Verify Roblox user exists + not blacklisted
app.post('/api/verify', async (req, res) => {
  const { robloxUsername, discordId } = req.body;
  const db = loadDB();

  const blRoblox  = db.blacklist.find(b => b.type === 'roblox'  && b.value.toLowerCase() === robloxUsername?.toLowerCase());
  const blDiscord = db.blacklist.find(b => b.type === 'discord' && b.value === discordId);
  if (blRoblox)  return res.status(403).json({ error: 'blacklisted', field: 'roblox',  reason: blRoblox.reason  || 'This Roblox account is banned.' });
  if (blDiscord) return res.status(403).json({ error: 'blacklisted', field: 'discord', reason: blDiscord.reason || 'This Discord account is banned.' });

  let robloxId = null;
  try { robloxId = await getRobloxUserId(robloxUsername); }
  catch(e) { console.warn('[Roblox API]', e.message); }

  if (robloxId === null) {
    return res.status(404).json({ error: 'user_not_found', message: 'Roblox username not found. Check spelling.' });
  }

  res.json({ ok: true, robloxId });
});

// Submit purchase: verify GP ownership, save order, fire webhook
app.post('/api/purchase', async (req, res) => {
  const { robloxUsername, robloxId, discordId, plan } = req.body;
  const ip = getIP(req);
  const db = loadDB();

  if (!PLAN_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan.' });

  // Re-check blacklist
  const bl = db.blacklist.find(b =>
    (b.type === 'roblox'  && b.value.toLowerCase() === robloxUsername?.toLowerCase()) ||
    (b.type === 'discord' && b.value === discordId) ||
    (b.type === 'ip'      && b.value === ip)
  );
  if (bl) return res.status(403).json({ error: 'blacklisted', reason: bl.reason || 'Access denied.' });

  // Gamepass ownership auto-check
  const gpCfg    = db.gamepasses[plan];
  let   verified = false;
  if (gpCfg?.id && robloxId) {
    try { verified = await checkGamepassOwnership(robloxId, gpCfg.id); }
    catch(e) { console.warn('[GP check]', e.message); }
  }

  const accessCode = 'SA-' + crypto.randomBytes(3).toString('hex').toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

  const order = {
    id:        crypto.randomUUID(),
    roblox:    robloxUsername,
    robloxId:  robloxId || null,
    discordId,
    plan,
    price:     PLAN_PRICES[plan],
    status:    verified ? 'verified' : 'pending',
    verified,
    ip,
    accessCode,
    timestamp: Date.now(),
  };
  db.orders.push(order);
  saveDB(db);

  try { await sendOrderWebhook({ roblox: robloxUsername, discordId, plan, ip, verified }); }
  catch(e) { console.error('[Webhook]', e.message); }

  const gpLink = gpCfg?.link || null;
  res.json({ ok: true, accessCode, verified, gpLink, plan, price: PLAN_PRICES[plan], label: PLAN_LABELS[plan] });
});

// Save remember-me cookies (30 days, readable by JS for autofill)
app.post('/api/session/save', (req, res) => {
  const { robloxUsername, discordId } = req.body;
  res.cookie('sa_roblox',  robloxUsername || '', { maxAge: 30*24*60*60*1000, sameSite: 'lax' });
  res.cookie('sa_discord', discordId      || '', { maxAge: 30*24*60*60*1000, sameSite: 'lax' });
  res.json({ ok: true });
});

// Load saved session for autofill
app.get('/api/session/load', (req, res) => {
  res.json({
    robloxUsername: req.cookies.sa_roblox  || null,
    discordId:      req.cookies.sa_discord || null,
  });
});

// Clear remember-me
app.delete('/api/session/clear', (req, res) => {
  res.clearCookie('sa_roblox');
  res.clearCookie('sa_discord');
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN AUTH
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const db = loadDB();
  if (password !== db.adminKey) return res.status(401).json({ error: 'Invalid password.' });
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/auth/status', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const db = loadDB();
  res.json({ orders: [...db.orders].reverse() });
});

app.delete('/api/admin/orders', requireAdmin, (req, res) => {
  const db = loadDB(); db.orders = []; saveDB(db);
  res.json({ ok: true });
});

app.delete('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const db = loadDB();
  db.orders = db.orders.filter(o => o.id !== req.params.id);
  saveDB(db); res.json({ ok: true });
});

app.patch('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
  const db = loadDB();
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found.' });
  order.status = req.body.status;
  saveDB(db); res.json({ ok: true, order });
});

app.get('/api/admin/blacklist', requireAdmin, (req, res) => {
  const db = loadDB();
  res.json({ blacklist: db.blacklist });
});

app.post('/api/admin/blacklist', requireAdmin, (req, res) => {
  const { type, value, reason } = req.body;
  if (!['roblox','discord','ip'].includes(type)) return res.status(400).json({ error: 'Type must be roblox, discord, or ip.' });
  if (!value?.trim()) return res.status(400).json({ error: 'Value required.' });
  const db = loadDB();
  if (db.blacklist.find(b => b.type === type && b.value.toLowerCase() === value.trim().toLowerCase()))
    return res.status(409).json({ error: 'Already blacklisted.' });
  db.blacklist.push({ id: crypto.randomUUID(), type, value: value.trim(), reason: reason?.trim() || '', addedAt: Date.now() });
  saveDB(db); res.json({ ok: true });
});

app.delete('/api/admin/blacklist/:id', requireAdmin, (req, res) => {
  const db = loadDB();
  db.blacklist = db.blacklist.filter(b => b.id !== req.params.id);
  saveDB(db); res.json({ ok: true });
});

app.get('/api/admin/gamepasses', requireAdmin, (req, res) => {
  const db = loadDB();
  res.json({ gamepasses: db.gamepasses });
});

app.put('/api/admin/gamepasses/:plan', requireAdmin, (req, res) => {
  const { plan } = req.params;
  if (!PLAN_PRICES[plan]) return res.status(400).json({ error: 'Invalid plan.' });
  const { id, link } = req.body;
  const db = loadDB();
  db.gamepasses[plan] = { id: id?.trim() || '', link: link?.trim() || '' };
  saveDB(db); res.json({ ok: true, plan, gamepasses: db.gamepasses[plan] });
});

// ─── Start ────────────────────────────────────────────────────────────────────
initAdminKey().then(() => {
  app.listen(PORT, () => console.log(`[Server] Running → http://localhost:${PORT}`));
});
