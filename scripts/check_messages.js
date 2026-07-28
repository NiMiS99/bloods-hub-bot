// scripts/check_messages.js
const db = require('../src/db');
const { Op } = require('sequelize');

(async () => {
  try {
    // Count ActivityLog entries by type
    const msgEvents = await db.ActivityLog.count({ where: { event_type: 'message' } });
    const voiceEvents = await db.ActivityLog.count({ where: { event_type: 'voice_seconds' } });
    const voiceJoinEvents = await db.ActivityLog.count({ where: { event_type: 'voice_join' } });
    const voiceLeaveEvents = await db.ActivityLog.count({ where: { event_type: 'voice_leave' } });
    const allEvents = await db.ActivityLog.count();

    console.log('ActivityLog entries:');
    console.log('  Total:', allEvents);
    console.log('  message:', msgEvents);
    console.log('  voice_seconds:', voiceEvents);
    console.log('  voice_join:', voiceJoinEvents);
    console.log('  voice_leave:', voiceLeaveEvents);

    // Check distinct event types
    const [types] = await db.sequelize.query("SELECT DISTINCT event_type FROM activity_log");
    console.log('\nDistinct event_types:', types.map(t => t.event_type));

    // Check users with total_messages > 0
    const usersWithMsgs = await db.User.count({ where: { total_messages: { [Op.gt]: 0 } } });
    console.log('\nUsers with total_messages > 0:', usersWithMsgs);

    // Check recent activity log entries
    const recent = await db.ActivityLog.findAll({
      where: { event_type: 'message' },
      order: [['id', 'DESC']],
      limit: 5,
      raw: true,
    });
    console.log('\nRecent message events:', recent.length);
    recent.forEach(r => console.log(`  user: ${r.user_id} | channel: ${r.channel_id} | amount: ${r.amount} | at: ${r.occurred_at}`));

    // Check the User table schema for total_messages
    const [cols] = await db.sequelize.query("DESCRIBE users");
    const msgCol = cols.find(c => c.Field === 'total_messages');
    console.log('\nusers.total_messages column:', msgCol);

    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();
