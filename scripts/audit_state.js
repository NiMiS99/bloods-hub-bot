// scripts/audit_state.js
const db = require('../src/db');

(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('DB: connected OK');

    const [results] = await db.sequelize.query('SHOW TABLES');
    console.log('\nTabelle DB:', results.length);
    results.forEach((r) => console.log('  -', Object.values(r)[0]));

    const counts = await Promise.all([
      db.User.count(), db.Game.count(), db.UserGame.count(),
      db.GameStat.count(), db.ExternalAccount.count(),
      db.ActivityLog.count(), db.LeaderboardCache.count(),
      db.AuditLog.count(), db.UserBadge.count(),
      db.Warning.count(), db.CommunityEvent.count(),
    ]);
    console.log('\nRighe per tabella:');
    const names = ['User', 'Game', 'UserGame', 'GameStat', 'ExternalAccount', 'ActivityLog', 'LeaderboardCache', 'AuditLog', 'UserBadge', 'Warning', 'CommunityEvent'];
    names.forEach((n, i) => console.log(`  ${n}: ${counts[i]}`));

    const games = await db.Game.findAll({ attributes: ['code', 'name', 'is_active', 'api_provider', 'role_id', 'category_id'], raw: true });
    console.log('\nGiochi registrati (' + games.length + '):');
    games.forEach((g) => console.log(`  - ${g.code} | ${g.name} | active: ${g.is_active} | api: ${g.api_provider} | role: ${g.role_id || 'NULL'} | cat: ${g.category_id || 'NULL'}`));

    const caches = await db.LeaderboardCache.findAll({ attributes: ['metric', 'payload', 'generated_at'], raw: true, limit: 10 });
    console.log('\nLeaderboardCache entries:', caches.length);
    caches.forEach((c) => {
      const valid = Array.isArray(c.payload);
      const ageH = Math.round((Date.now() - new Date(c.generated_at)) / 3600000);
      console.log(`  - metric: ${c.metric} | valid array: ${valid} | type: ${typeof c.payload} | age: ${ageH}h`);
    });

    const users = await db.User.findAll({ attributes: ['user_id', 'username', 'xp', 'level', 'total_messages', 'total_voice_seconds'], raw: true, order: [['xp', 'DESC']], limit: 10 });
    console.log('\nTop 10 utenti per XP:');
    users.forEach((u, i) => console.log(`  ${i + 1}. ${u.username} | XP: ${u.xp} | Lv: ${u.level} | Msg: ${u.total_messages} | Voice: ${u.total_voice_seconds}s`));

    const badges = await db.UserBadge.findAll({ raw: true });
    console.log('\nBadge assegnati:', badges.length);
    if (badges.length > 0) {
      const byBadge = {};
      badges.forEach((b) => { byBadge[b.badge_code] = (byBadge[b.badge_code] || 0) + 1; });
      Object.entries(byBadge).forEach(([code, count]) => console.log(`  - ${code}: ${count}`));
    }

    const extAccounts = await db.ExternalAccount.findAll({ attributes: ['provider', 'external_id', 'user_id', 'verified'], raw: true });
    console.log('\nAccount esterni collegati:', extAccounts.length);
    extAccounts.forEach((e) => console.log(`  - ${e.provider}: ${e.external_id} (user: ${e.user_id}, verified: ${e.verified})`));

    process.exit(0);
  } catch (e) {
    console.error('DB ERROR:', e.message);
    process.exit(1);
  }
})();
