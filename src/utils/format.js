// src/utils/format.js
// Small formatting helpers used across commands.

function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function truncate(str, max = 1024) {
  if (!str) return '';
  return str.length <= max ? str : `${str.slice(0, max - 1)}…`;
}

function ordinal(n) {
  return n + '°';
}

module.exports = { formatDuration, truncate, ordinal };
