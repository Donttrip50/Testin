# Source Access — Backend Setup Guide

## What's included

- **Express server** with session-based auth (cookies)
- **Roblox API integration** — automatically verifies gamepass ownership before accepting an order
- **Discord webhook** (server-side only — URL never exposed to the browser)
- **Admin panel** with tabs: Orders, Blacklist, Gamepass Links
- **Blacklisting** by Roblox username, Discord ID, or IP address
- **Gamepass link management** — set/replace per-plan links from the admin panel
- **Remember me cookies** — saves Roblox username + Discord ID for 30 days
- **Admin session cookies** — stay logged into admin for 7 days
- **Randomized admin key** — generated on first boot, sent to your Discord webhook
- **Persistent storage** via `data/db.json`

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
- `WEBHOOK_URL` — your Discord webhook (already pre-filled from your original code)
- `SESSION_SECRET` — change to any long random string
- `GP_ID_DAY` / `GP_ID_WEEK` / `GP_ID_MONTH` / `GP_ID_LIFETIME` — your Roblox gamepass IDs  
  *(You can also set these from the Admin Panel instead of here)*

### 3. Start the server
```bash
npm start
```

The server starts on **http://localhost:3000**

On first boot:
- A random **Admin Key** is generated and printed in the terminal
- The key is also **sent to your Discord webhook** automatically
- Keep this key safe — it's your admin panel password

---

## Admin Panel

1. Go to your site → click **Admin** at the bottom
2. Paste your Admin Key
3. You'll be kept logged in for **7 days** via a session cookie

### Tabs:
| Tab | What it does |
|-----|-------------|
| **Orders** | See all purchase requests, verified status, plan, Discord ID |
| **Blacklist** | Block users by Roblox username, Discord ID, or IP. Add reason. Remove anytime. |
| **Gamepass Links** | Set the Roblox gamepass URL or ID for each plan. These are used for both verification and the "Buy gamepass →" link shown to users who haven't purchased yet. |

### Regenerate Admin Key
Click the **↺** icon in the admin panel header. The new key is sent to your webhook and you're logged out automatically.

---

## How purchase verification works

1. User enters Roblox username + Discord ID → clicks Continue
2. User selects a plan → clicks Purchase
3. Backend calls **Roblox Users API** to resolve the username to a Roblox User ID
4. Backend calls **Roblox Inventory API** to check if that user owns the gamepass for the selected plan
5. If **owned** → order is saved, webhook fires, access code is shown ✅
6. If **not owned** → error shown with a direct link to buy the gamepass ❌
7. If **blacklisted** (username, Discord ID, or IP) → blocked at step 3 ❌

> **Note:** If no gamepass ID/URL is set for a plan, verification is skipped and the order is marked as "pending" for manual review.

---

## Gamepass IDs

You need the **numeric ID** from the gamepass URL:
```
https://www.roblox.com/game-pass/12345678/My-Gamepass
                                 ^^^^^^^^
                                 This is the ID
```

You can paste the full URL or just the number in the admin panel — both work.

---

## File structure

```
source-access/
├── server.js          ← Backend (Express)
├── .env.example       ← Copy to .env and configure
├── package.json
├── data/
│   └── db.json        ← Auto-created on first run (orders, blacklist, gamepass links)
└── public/
    ├── index.html     ← Frontend
    ├── app.js         ← Frontend JS (no secrets here)
    └── style.css      ← Styles
```

---

## Deploying

For production (Railway, Render, VPS, etc.):
- Set `NODE_ENV=production` in your environment variables
- Set a strong `SESSION_SECRET`
- Make sure your host keeps `data/db.json` persistent (use a volume if needed)
- Run `npm start`
