// dashboard/src/lib/useUsers.js
// React hook to resolve Discord user IDs to { id, username, avatar } for display.
'use client';

import { useState, useEffect, useCallback } from 'react';

import { api } from './api';

const _cache = new Map(); // Global cache: userId -> { username, avatar, displayName }

export function useUsers(guildId) {
  const [resolveQueue, setResolveQueue] = useState(new Set());
  const [pending, setPending] = useState(false);

  // Resolve a batch of user IDs
  const resolveUsers = useCallback(async (ids) => {
    const uncached = ids.filter((id) => id && !_cache.has(id));
    if (uncached.length === 0) return;
    setPending(true);
    try {
      const { users } = await api.resolveUsers(guildId, uncached);
      for (const u of users) {
        _cache.set(u.id, { username: u.username, avatar: u.avatar, displayName: u.displayName });
      }
    } catch {
      // Silent fail — cache null
      for (const id of uncached) _cache.set(id, { username: null, avatar: null, displayName: null });
    }
    setPending(false);
  }, [guildId]);

  const getUser = useCallback((id) => {
    if (!id) return null;
    return _cache.get(id) || null;
  }, []);

  // Resolve a single user ID (returns cached or null, triggers fetch)
  const resolveOne = useCallback((id) => {
    if (!id || _cache.has(id)) return;
    resolveUsers([id]);
  }, [resolveUsers]);

  return { getUser, resolveUsers, resolveOne, pending };
}

// Helper component to render a user mention
export function UserMention({ userId, guildId }) {
  const { getUser, resolveOne } = useUsers(guildId);
  const user = getUser(userId);

  useEffect(() => {
    if (userId && !user) resolveOne(userId);
  }, [userId, user, resolveOne]);

  if (!userId) return <span className="text-dark-400">—</span>;
  if (!user) return <span className="text-dark-400 font-mono text-xs">{userId}</span>;
  if (!user.username) return <span className="text-dark-400 font-mono text-xs">{userId}</span>;

  return (
    <span className="inline-flex items-center gap-1.5">
      {user.avatar && <img src={user.avatar} alt="" className="w-4 h-4 rounded-full" />}
      <span className="text-dark-200">{user.displayName || user.username}</span>
    </span>
  );
}
