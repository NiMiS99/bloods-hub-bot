require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const GUILD_ID = '1010226759817515018';

const CHANNEL_EMBEDS = {
  'loot-bloods-points': {
    title: '🧾 Bloods Points — Loot System',
    description: 'Questo canale traccia i roll del sistema BP.\n\n**Come funziona:**\n• Ogni membro accumula BP partecipando ai raid\n• Al drop di un item, i player bid con i loro BP\n• Formula: `roll × (1 + bid/50)`\n• Il roll più alto vince l\'item\n\nUsa `/bp stats` per vedere i tuoi punti.',
  },
  'LFG': {
    title: '🎮 LFG — Looking For Group',
    description: 'Cerchi compagni per M+, raid, PvP o eventi?\n\nUsa `/lfg <gioco>` per creare una sessione.\nUsa `/lfg list` per vedere le sessioni attive.\n\n**Regole:**\n• Sii puntuale e rispettoso\n• Specifica livello/key/obiettivo\n• Usa i tag appropriati (Tank/Healer/DPS)',
  },
  'Roster': {
    title: '📑 Roster Gilda',
    description: 'Roster ufficiale dei Bloods.\n\n**Rank:**\n• Owner · Founder · Consigliere\n• Officer · Officer Reclutamento · Raid Leader\n• Raider Mitico · Raider · PvP · Social\n\nIl roster viene aggiornato automaticamente dal bot.',
  },
  'Overlay': {
    title: '💻 Overlay & Tool',
    description: 'Condivisione overlay, WeakAuras, addon e tool WoW.\n\n**Consigliati:**\n• DBM/BigWigs — boss timers\n• WeakAuras — tracking personalizzato\n• Details! — damage/healing meter\n• Plater — nameplate customization\n\nCondividi qui le tue WA e overlay!',
  },
  'Chat-Pubblica': {
    title: '💭 Chat Pubblica',
    description: 'Chat pubblica per visitatori e membri.\nSii rispettoso e segui il regolamento.\n\nDiventa membro verificato per accedere a tutti i canali!',
  },
  'Annunci-Gilda': {
    title: '📜 Annunci Gilda',
    description: 'Annunci ufficiali della gilda Bloods.\n\nSolo gli officer possono postare qui.\nLe notifiche importanti vengono inviate in questo canale.',
  },
  'guerra-tra-gilde': {
    title: '⚔️ Guerra tra Gilde',
    description: 'Organizzazione PvP gilda vs gilda.\n\nPosta qui sfide, coordinamento e risultati delle battaglie.',
  },
  'WhatsApp': {
    title: '📩 WhatsApp Group',
    description: 'Link al gruppo WhatsApp della community.\n\n⚠️ Il Discord rimane il canale ufficiale per raid e eventi.\nWhatsApp è solo per chat veloci e notifiche.',
  },
  'Staff-Chat': {
    title: '📋 Staff Chat',
    description: 'Chat riservata allo staff della community.\nDiscussione moderazione, gestione membri e decisioni operative.',
  },
  'youtube': {
    title: '📺 YouTube — Bloods',
    description: 'Questo canale riceve automaticamente:\n• Nuovi video pubblicati sul canale YouTube\n• Statistiche settimanali (iscritti, views)\n• Idee contenuti basate su trend WoW\n• SEO audit per ottimizzare i video\n\nIl bot controlla ogni 15 minuti.',
  },
  'tiktok': {
    title: '🎵 TikTok — @bloodswow',
    description: 'Questo canale riceve automaticamente:\n• Nuovi TikTok pubblicati dall\'account @bloodswow\n• Statistiche engagement (views, like, share)\n\nIl bot controlla ogni 15 minuti.',
  },
  'meme-screenshot': {
    title: '💻 Meme & Screenshot',
    description: 'Posta qui i tuoi meme WoW e screenshot divertenti!\nI migliori vengono evidenziati nella starboard.',
  },
  'Invito-Discord': {
    title: '📺 Invito Discord',
    description: 'Link invito Discord ufficiale dei Bloods.\n\n👉 https://discord.gg/DrGMeEMxF6\n\nCondividi questo link per far crescere la community!',
  },
  'Commercio-trade': {
    title: '⚔️ Commercio & Trade',
    description: 'Scambio oggetti, craft e servizi in-game.\n\n**Regole:**\n• Niente RMT (vendita per soldi veri)\n• Sii onesto sulle stat degli item\n• Specifica server/realm',
  },
  'Highlights': {
    title: '🎥 Highlights',
    description: 'I migliori momenti di raid, M+ e PvP dei Bloods.\n\nPosta qui le tue clip epiche! I highlight migliori diventano video YouTube/TikTok.',
  },
  'migliori-momenti': {
    title: '⭐ Migliori Momenti',
    description: 'I momenti più memorabili della community Bloods.\nKill epici, record M+, clutch PvP e momenti divertenti.',
  },
  'Generale-Generale': {
    title: '💬 Generale',
    description: 'Chat generale della community Bloods.\nSii rispettoso, segui il regolamento e divertiti!',
  },
  'Suggerimenti': {
    title: '💡 Suggerimenti',
    description: 'Hai un\'idea per migliorare la community?\n\nUsa `/suggest <testo>` per proporre un suggerimento.\nLa community vota le idee migliori!',
  },
  'Officer-Only': {
    title: '🔒 Officer Only',
    description: 'Canale riservato agli officer per discussioni interne.\nReclutamento, gestione membri, pianificazione raid.',
  },
};

client.on('ready', async () => {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    await guild.channels.fetch();

    const textChannels = [...guild.channels.cache.values()].filter(c => c.type === 0);
    let posted = 0;
    let skipped = 0;

    for (const ch of textChannels) {
      // Check if channel already has a bot embed
      try {
        const msgs = await ch.messages.fetch({ limit: 5 });
        const hasBotEmbed = [...msgs.values()].some(m => m.embeds && m.embeds.length > 0 && m.author?.bot);
        if (hasBotEmbed) {
          skipped++;
          continue;
        }
      } catch { continue; }

      // Find matching embed config
      const embedConfig = CHANNEL_EMBEDS[ch.name];
      if (!embedConfig) {
        // Generic embed for channels without specific config
        const genericEmbed = new EmbedBuilder()
          .setTitle(`#${ch.name}`)
          .setColor(0x8b0000)
          .setDescription(`Canale **#${ch.name}** della community Bloods.\nSii rispettoso e segui il regolamento del server.`)
          .setFooter({ text: 'Bloods Community' })
          .setTimestamp();

        try {
          await ch.send({ embeds: [genericEmbed] });
          posted++;
          console.log(`Posted generic embed in #${ch.name}`);
        } catch (err) {
          console.log(`Failed #${ch.name}: ${err.message}`);
        }
        continue;
      }

      const embed = new EmbedBuilder()
        .setTitle(embedConfig.title)
        .setColor(0x8b0000)
        .setDescription(embedConfig.description)
        .setFooter({ text: 'Bloods Community' })
        .setTimestamp();

      try {
        await ch.send({ embeds: [embed] });
        posted++;
        console.log(`Posted embed in #${ch.name}`);
      } catch (err) {
        console.log(`Failed #${ch.name}: ${err.message}`);
      }
    }

    console.log(`\nDone! Posted: ${posted}, Skipped (already has embed): ${skipped}`);
    client.destroy();
  } catch (err) {
    console.error('Error:', err.message);
    client.destroy();
  }
});

client.login(process.env.DISCORD_TOKEN);
