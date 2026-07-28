// scripts/check_lb_schema.js
const db = require('../src/db');

(async () => {
  try {
    const [cols] = await db.sequelize.query("DESCRIBE leaderboard_cache");
    console.log('leaderboard_cache schema:');
    cols.forEach((c) => console.log(`  ${c.Field} | ${c.Type} | Null: ${c.Null} | Key: ${c.Key}`));

    const [rows] = await db.sequelize.query("SELECT id, metric, payload, generated_at FROM leaderboard_cache LIMIT 3");
    console.log('\nSample rows:');
    rows.forEach((r) => {
      console.log(`  id: ${r.id} | metric: ${r.metric}`);
      console.log(`  payload type: ${typeof r.payload}`);
      console.log(`  payload preview: ${String(r.payload).substring(0, 200)}`);
      console.log(`  generated_at: ${r.generated_at}`);
      console.log('');
    });

    // Check messageCreate event
    console.log('Checking messageCreate event...');
    const msgEvent = require('../src/events/messageCreate');
    console.log('  Event name:', msgEvent.name);
    console.log('  Has execute:', typeof msgEvent.execute);

    // Check User model for total_messages field
    const userAttrs = db.User.getAttributes();
    console.log('\nUser.total_messages:', userAttrs.total_messages ? 'exists' : 'MISSING');
    console.log('User.total_messages type:', userAttrs.total_messages?.type?.key);

    // Check if messageCreate increments total_messages
    const fs = require('fs');
    const content = fs.readFileSync(require('path').join(__dirname, '..', 'src', 'events', 'messageCreate.js'), 'utf8');
    const hasIncrement = content.includes('total_messages');
    const hasIncrementOp = content.includes('increment') || content.includes('+=') || content.includes('total_messages');
    console.log('\nmessageCreate.js references total_messages:', hasIncrement);
    console.log('messageCreate.js uses increment:', content.includes('increment'));

    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();
