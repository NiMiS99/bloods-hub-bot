import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}g ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatNumber(n) {
  return (n || 0).toLocaleString('it-IT');
}

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(date) {
  if (!date) return 'mai';
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return 'ora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}g fa`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mesi fa`;
  return `${Math.floor(months / 12)} anni fa`;
}
