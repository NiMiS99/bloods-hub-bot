// src/lib/api.js
// API client for the dashboard backend

const API_BASE = '/api';

async function fetchAPI(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (res.status === 401) {
    // Only auto-redirect to /login if we're NOT already on the login page.
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Non autenticato');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Errore API');
  return data;
}

export const api = {
  // Auth
  getMe: () => fetchAPI('/auth/me'),
  getGuilds: () => fetchAPI('/auth/guilds'),
  logout: () => fetchAPI('/auth/logout', { method: 'POST' }),

  // Guild
  getGuild: (id) => fetchAPI(`/guilds/${id}`),

  // Games
  getGames: (gid) => fetchAPI(`/guilds/${gid}/games`),
  addGame: (gid, data) => fetchAPI(`/guilds/${gid}/games`, { method: 'POST', body: JSON.stringify(data) }),
  updateGame: (gid, code, data) => fetchAPI(`/guilds/${gid}/games/${code}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeGame: (gid, code) => fetchAPI(`/guilds/${gid}/games/${code}`, { method: 'DELETE' }),

  // Members
  getMembers: (gid, page = 1, search = '') => fetchAPI(`/guilds/${gid}/members?page=${page}&search=${encodeURIComponent(search)}`),
  getMember: (gid, userId) => fetchAPI(`/guilds/${gid}/members/${userId}`),

  // Moderation
  getWarnings: (gid, page = 1) => fetchAPI(`/guilds/${gid}/warnings?page=${page}`),
  addWarning: (gid, data) => fetchAPI(`/guilds/${gid}/warnings`, { method: 'POST', body: JSON.stringify(data) }),
  muteUser: (gid, data) => fetchAPI(`/guilds/${gid}/mute`, { method: 'POST', body: JSON.stringify(data) }),
  unmuteUser: (gid, data) => fetchAPI(`/guilds/${gid}/unmute`, { method: 'POST', body: JSON.stringify(data) }),
  kickUser: (gid, data) => fetchAPI(`/guilds/${gid}/kick`, { method: 'POST', body: JSON.stringify(data) }),
  banUser: (gid, data) => fetchAPI(`/guilds/${gid}/ban`, { method: 'POST', body: JSON.stringify(data) }),

  // Events
  getEvents: (gid) => fetchAPI(`/guilds/${gid}/events`),
  createEvent: (gid, data) => fetchAPI(`/guilds/${gid}/events`, { method: 'POST', body: JSON.stringify(data) }),
  deleteEvent: (gid, eventId) => fetchAPI(`/guilds/${gid}/events/${eventId}`, { method: 'DELETE' }),

  // Leaderboard
  getLeaderboard: (gid, metric = 'xp') => fetchAPI(`/guilds/${gid}/leaderboard?metric=${metric}`),

  // Analytics
  getAnalytics: (gid, days = 30) => fetchAPI(`/guilds/${gid}/analytics?days=${days}`),

  // Audit log
  getAuditLog: (gid, page = 1) => fetchAPI(`/guilds/${gid}/audit-log?page=${page}`),

  // Badges
  getBadges: (gid) => fetchAPI(`/guilds/${gid}/badges`),

  // Settings
  getSettings: (gid) => fetchAPI(`/guilds/${gid}/settings`),
  updateSettings: (gid, data) => fetchAPI(`/guilds/${gid}/settings`, { method: 'PUT', body: JSON.stringify(data) }),

  // Level rewards
  getLevelRewards: (gid) => fetchAPI(`/guilds/${gid}/level-rewards`),
  addLevelReward: (gid, data) => fetchAPI(`/guilds/${gid}/level-rewards`, { method: 'POST', body: JSON.stringify(data) }),
  deleteLevelReward: (gid, id) => fetchAPI(`/guilds/${gid}/level-rewards/${id}`, { method: 'DELETE' }),

  // Automod
  getAutomodRules: (gid) => fetchAPI(`/guilds/${gid}/automod/rules`),
  addAutomodRule: (gid, data) => fetchAPI(`/guilds/${gid}/automod/rules`, { method: 'POST', body: JSON.stringify(data) }),
  updateAutomodRule: (gid, id, data) => fetchAPI(`/guilds/${gid}/automod/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAutomodRule: (gid, id) => fetchAPI(`/guilds/${gid}/automod/rules/${id}`, { method: 'DELETE' }),

  // Discord logs
  getDiscordLogs: (gid, page = 1, type = 'all') => fetchAPI(`/guilds/${gid}/discord-logs?page=${page}&type=${type}`),

  // Raid
  getRaidConfig: (gid) => fetchAPI(`/guilds/${gid}/raid/config`),
  updateRaidConfig: (gid, data) => fetchAPI(`/guilds/${gid}/raid/config`, { method: 'PUT', body: JSON.stringify(data) }),
  getRaidEligibility: (gid) => fetchAPI(`/guilds/${gid}/raid/eligibility`),
  getRaidStats: (gid) => fetchAPI(`/guilds/${gid}/raid/stats`),

  // Giveaways
  getGiveaways: (gid, page = 1) => fetchAPI(`/guilds/${gid}/giveaways?page=${page}`),
  createGiveaway: (gid, data) => fetchAPI(`/guilds/${gid}/giveaways`, { method: 'POST', body: JSON.stringify(data) }),
  endGiveaway: (gid, id) => fetchAPI(`/guilds/${gid}/giveaways/${id}/end`, { method: 'POST' }),

  // Scheduled messages
  getScheduledMessages: (gid, page = 1) => fetchAPI(`/guilds/${gid}/scheduled-messages?page=${page}`),
  createScheduledMessage: (gid, data) => fetchAPI(`/guilds/${gid}/scheduled-messages`, { method: 'POST', body: JSON.stringify(data) }),
  toggleScheduledMessage: (gid, id) => fetchAPI(`/guilds/${gid}/scheduled-messages/${id}/toggle`, { method: 'PUT' }),
  deleteScheduledMessage: (gid, id) => fetchAPI(`/guilds/${gid}/scheduled-messages/${id}`, { method: 'DELETE' }),

  // Custom commands
  getCustomCommands: (gid, page = 1) => fetchAPI(`/guilds/${gid}/custom-commands?page=${page}`),
  createCustomCommand: (gid, data) => fetchAPI(`/guilds/${gid}/custom-commands`, { method: 'POST', body: JSON.stringify(data) }),
  deleteCustomCommand: (gid, id) => fetchAPI(`/guilds/${gid}/custom-commands/${id}`, { method: 'DELETE' }),

  // Suggestions
  getSuggestions: (gid, status = 'all', page = 1) => fetchAPI(`/guilds/${gid}/suggestions?status=${status}&page=${page}`),
  updateSuggestionStatus: (gid, id, status) => fetchAPI(`/guilds/${gid}/suggestions/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Feedback tickets
  getFeedback: (gid, status = 'all') => fetchAPI(`/guilds/${gid}/feedback?status=${status}`),
  getFeedbackStats: (gid) => fetchAPI(`/guilds/${gid}/feedback/stats`),
  getFeedbackTicket: (gid, id) => fetchAPI(`/guilds/${gid}/feedback/${id}`),
  updateFeedbackStatus: (gid, id, status) => fetchAPI(`/guilds/${gid}/feedback/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Polls
  getPolls: (gid, page = 1) => fetchAPI(`/guilds/${gid}/polls?page=${page}`),
  closePoll: (gid, id) => fetchAPI(`/guilds/${gid}/polls/${id}/close`, { method: 'POST' }),

  // LFG sessions
  getLfgSessions: (gid) => fetchAPI(`/guilds/${gid}/lfg-sessions`),

  // XP events
  getXpEvents: (gid) => fetchAPI(`/guilds/${gid}/xp-events`),
  startXpEvent: (gid, data) => fetchAPI(`/guilds/${gid}/xp-events`, { method: 'POST', body: JSON.stringify(data) }),
  stopXpEvent: (gid) => fetchAPI(`/guilds/${gid}/xp-events/stop`, { method: 'POST' }),

  // Tournaments
  getTournaments: (gid) => fetchAPI(`/guilds/${gid}/tournaments`),

  // Game nights
  getGameNights: (gid) => fetchAPI(`/guilds/${gid}/game-nights`),

  // Tags
  getTags: (gid) => fetchAPI(`/guilds/${gid}/tags`),

  // Birthdays
  getBirthdays: (gid) => fetchAPI(`/guilds/${gid}/birthdays`),

  // Reminders
  getReminders: (gid, page = 1) => fetchAPI(`/guilds/${gid}/reminders?page=${page}`),
  deleteReminder: (gid, id) => fetchAPI(`/guilds/${gid}/reminders/${id}`, { method: 'DELETE' }),

  // Starboard
  getStarboard: (gid, page = 1) => fetchAPI(`/guilds/${gid}/starboard?page=${page}`),

  // Resolve user IDs to names/avatars (for dashboard display)
  resolveUsers: (gid, ids) => fetchAPI(`/guilds/${gid}/resolve-users?ids=${ids.join(',')}`),

  // Health check
  getHealth: () => fetchAPI('/health'),
};
