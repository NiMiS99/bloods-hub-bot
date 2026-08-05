// scripts/post_commit.js
// Posts a changelog entry to Discord #changelog after each commit.
// Usage: node scripts/post_commit.js
// Can be called by git hook or manually.
require('dotenv').config();
const { execSync } = require('child_process');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

async function main() {
  const channelId = process.env.CHANGELOG_CHANNEL_ID;
  const token = process.env.DISCORD_TOKEN;
  if (!channelId || !token) {
    console.log('post_commit: CHANGELOG_CHANNEL_ID or DISCORD_TOKEN not set, skipping');
    return;
  }

  // Get commit info
  const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  const subject = execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim();
  const author = execSync('git log -1 --format=%an', { encoding: 'utf8' }).trim();
  const files = execSync('git diff-tree --no-commit-id --name-only -r HEAD', { encoding: 'utf8' }).trim().split('\n').filter(Boolean);

  // Skip merge commits
  if (subject.startsWith('Merge')) return;

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  await new Promise((resolve) => {
    client.once('clientReady', async () => {
      const ch = client.channels.cache.get(channelId);
      if (!ch) { resolve(); return; }

      const embed = new EmbedBuilder()
        .setColor(0x4b0082)
        .setTitle(`[COMMIT] ${subject.substring(0, 200)}`)
        .setDescription(`Commit \`${hash}\` by ${author}`)
        .setTimestamp()
        .setFooter({ text: 'Auto-posted by git hook' });

      if (files.length > 0) {
        const fileList = files.slice(0, 15).map(f => `\`${f}\``).join('\n');
        embed.addFields({ name: 'File modificati', value: fileList.substring(0, 1024) });
      }

      await ch.send({ embeds: [embed] }).catch(() => {});
      resolve();
    });
    client.login(token);
  });

  client.destroy();
  process.exit(0);
}

main().catch(() => process.exit(0));
