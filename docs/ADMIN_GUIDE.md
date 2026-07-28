# ADMIN_GUIDE — Bloods Multi-Game Community Hub

Audience: **Discord staff** (Guild Masters, Officers, Moderators) of the Bloods community.
This guide explains how to run and maintain the new server structure day-to-day using the bot. It does **not** require any coding knowledge.

---

## 1. Architecture overview

The server is split into three layers:

| Layer | Who can see it | What lives here |
|-------|----------------|-----------------|
| **Public onboarding** | `@everyone` | `#welcome`, `#rules`, `#role-selection` |
| **Legacy WoW (Bloods)** | Existing WoW members (unchanged) | The original WoW category, channels, roles — **preserved exactly as-is** |
| **Game communities** | Only members holding that game's role | One private category per game (e.g. `Valorant`, `CS2`, `WoW Classic`) |

The bot enforces this: `@everyone` is denied `ViewChannel` on every non-public, non-legacy category. Each game category is created with a `ViewChannel` allow for that game's role only.

> **Nothing is ever deleted by the bot.** The migration command (`/setup run`) only adds channels and sets `@everyone` denies — it never removes channels, roles, or messages.

---

## 2. First-time setup (one-time)

Run these in order, as an Administrator:

1. **`/setup run`** — migrates the existing server into the new architecture.
   - Records `@everyone` and the legacy WoW category.
   - Creates `#welcome`, `#rules`, `#role-selection` if missing (and makes them visible to `@everyone`).
   - Locks `@everyone` out of every other category (legacy WoW is **never** touched).
   - Marks existing WoW members as `legacy_wow_member` in the database.
2. **`/rolepanel`** (in `#role-selection`) — posts the interactive self-role panel.
3. For each game you want to support: **`/game add`** (see §4).

Check progress any time with **`/setup status`**.

---

## 3. Managing the role-selection panel

The panel in `#role-selection` is a single Discord message with:

- A **drop-down menu** listing every active game (multi-select).
- **Quick-toggle buttons** for the first 4 games.
- A **Clear all** button.

Users self-assign and self-remove roles — staff do **not** need to hand out game roles.

- To **refresh** the panel (e.g. after adding a new game so it appears in the menu): run `/rolepanel` again in `#role-selection`. The old message stays; you can delete it manually if you want only one panel.
- The panel only lists games where `is_active = true`. To hide a game from the panel without deleting it, an admin can toggle it (see §5).

---

## 4. Adding a new game

Use **`/game add`** (requires *Manage Server* permission):

```
/game add
  code:        valorant          (lowercase, no spaces — stable id)
  name:        Valorant          (display name)
  category:    FPS               (genre)
  api_provider: Riot             (Steam / Battle.net / Riot / Manual / None)
  icon_url:    https://...png    (optional)
```

The bot will automatically:

1. Create a Discord role named `Game • Valorant`.
2. Create a private category `Valorant` visible only to that role (and the bot).
3. Save the game in the database with `role_id` and `category_id` linked.

After adding a game, **re-run `/rolepanel`** so it shows up in the self-role menu. Then add whatever channels you want inside the new category (e.g. `#valorant-general`, `#valorant-lfg`, a voice channel) — they will inherit the category's privacy automatically.

### Listing / updating games

- **`/game list`** — show every registered game with its role and category.
- **`/game update`** — re-link a game to a different role or category (e.g. if you recreated the role manually).

---

## 5. Disabling a game (without deleting history)

If a game community goes inactive but you want to keep its channels and history:

1. Run **`/game update`** and point the game at its existing role/category (no change needed).
2. Ask a developer (or run a SQL update) to set `is_active = 0` on that game row.
3. Re-run `/rolepanel` — the game disappears from the menu but the category, role, and channels remain untouched.

---

## 6. Member onboarding flow

1. New member joins → sees only `#welcome`, `#rules`, `#role-selection`.
2. They read `#rules`, then go to `#role-selection` and pick their games.
3. The bot grants the role(s) → the corresponding private categories appear.
4. **Legacy WoW members** keep their original WoW access automatically — they do **not** need to re-pick the WoW role, and the WoW category is never gated by the self-role panel.

---

## 7. Useful commands for staff

| Command | Purpose |
|---------|---------|
| `/profile [user]` | See a member's games, linked accounts, and stats. |
| `/stats` | Community-wide summary (members, messages, voice time). |
| `/leaderboard [game] [metric] [top]` | Top players for a game or for Discord activity. |
| `/gamemeta <game> [kind]` | Latest patch notes / meta / server status for a game. |
| `/refreshstats [user]` | Force-refresh a member's external API stats (members can do this for themselves). |

---

## 8. Permissions cheat-sheet

The bot manages these automatically; this is for your awareness:

- `@everyone`: `ViewChannel` **denied** everywhere except the 3 public channels.
- Each `Game • <Name>` role: `ViewChannel` **allowed** on its own category.
- Legacy WoW category: **unchanged** — keep whatever overrides were there before the migration.
- Bot role: needs `ViewChannel`, `SendMessages`, `Manage Roles`, `Manage Channels`, `Read Message History`, and the `Manage Guild` permission for setup commands. The simplest path is to grant the bot `Administrator` for the guild, but a least-privilege set works too.

---

## 9. Audit trail

Every destructive admin action (`/setup run`, `/game add`, `/game update`, `/rolepanel`) is logged by the bot in its log files under `logs/`. Database-level staff actions are also written to the `audit_log` table (see `DEV_GUIDE`).

---

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| New game doesn't appear in the role menu | Re-run `/rolepanel` after `/game add`. |
| A member can't see a game category they have the role for | Check the category's permission overwrites — the role must have `ViewChannel` allow. `/game update` can re-link. |
| `/leaderboard` shows "No data yet" | Stats are populated either by `/refreshstats` (external APIs) or by Discord activity tracking (voice/messages) which accrues automatically. |
| `@everyone` can see a channel it shouldn't | That channel likely has an explicit `@everyone` allow from before the migration. Edit the channel's permissions manually. |
| Legacy WoW members lost access | The migration **never** touches the legacy WoW category. If access was lost, it was changed outside the bot — restore the original role overrides. |
