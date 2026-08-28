// src/commands/wa.js
// /wa — WeakAura collection distribution for the Bloods guild.
// Shows categorized WA links and import strings.
const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, errorEmbed } = require('../utils/embed');

// WeakAura collection — links to Wago.io and import codes
const WA_COLLECTION = {
  raid: {
    title: '⚔️ WeakAuras Raid — The Venomous Abyss',
    auras: [
      { name: 'Boss Announce Pack (TVA)', url: 'https://wago.io/TVA-BossPack', desc: 'Annunci ability per tutti i boss' },
      { name: 'Ulgrax the Devourer', url: 'https://wago.io/UlgraxTVA', desc: 'Meccaniche, timers, ability' },
      { name: 'The Bloodbound Horror', url: 'https://wago.io/BloodboundHorror', desc: 'Tank alerts, healer cooldowns' },
      { name: 'Sikran', url: 'https://wago.io/SikranTVA', desc: 'Phase transitions, adds' },
      { name: "Rasha'nan", url: 'https://wago.io/RashananTVA', desc: 'Web mechanics, positioning' },
      { name: "Broodtwister Ovi'nax", url: 'https://wago.io/OvinaxTVA', desc: 'Egg management, interrupts' },
      { name: "Nexus-Princess Ky'veza", url: 'https://wago.io/KyvezaTVA', desc: 'Dance mechanic, adds' },
      { name: 'The Silken Court', url: 'https://wago.io/SilkenCourtTVA', desc: 'Tank swap, raid cooldowns' },
      { name: 'Queen Ansurek', url: 'https://wago.io/AnsurekTVA', desc: 'Final boss — full pack' },
    ],
  },
  mplus: {
    title: '🔑 WeakAuras Mythic+ Season 2',
    auras: [
      { name: 'M+ Dungeon Pack (S2)', url: 'https://wago.io/MPS2-Pack', desc: 'Tutti i dungeon S2 in un pack' },
      { name: 'Affix Tracker', url: 'https://wago.io/AffixTracker', desc: 'Mostra affix attivi in dungeon' },
      { name: 'Key Timer', url: 'https://wago.io/KeyTimer', desc: 'Timer key con % completamento' },
      { name: 'Prideful / Bursting', url: 'https://wago.io/PrideBurst', desc: 'Tracker per affix specifici' },
      { name: 'Interrupt Tracker', url: 'https://wago.io/InterruptTracker', desc: 'Conto alla rovescia interrupt' },
    ],
  },
  utility: {
    title: '🛠️ WeakAuras Utility',
    auras: [
      { name: 'Plater (Nameplates)', url: 'https://wago.io/PlaterBloods', desc: 'Nameplate config gilda' },
      { name: 'Raid Cooldowns', url: 'https://wago.io/RaidCDs', desc: 'Tracker cooldown raid' },
      { name: 'Personal Cooldowns', url: 'https://wago.io/PersonalCDs', desc: 'I tuoi CD con timer' },
      { name: 'Loot Announcer', url: 'https://wago.io/LootAnnounce', desc: 'Annuncia loot in raid' },
      { name: 'Combat Timer', url: 'https://wago.io/CombatTimer', desc: 'Timer pull/combat' },
    ],
  },
  class: {
    title: '🎓 WeakAuras per Classe',
    auras: [
      { name: 'Class Pack (tutte le classi)', url: 'https://wago.io/ClassPacksS2', desc: 'Pack ufficiale per ogni classe/spec' },
      { name: 'Bloods Custom Pack', url: 'https://wago.io/BloodsCustom', desc: 'Pack custom gilda (rotations + procs)' },
    ],
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wa')
    .setDescription('WeakAura collection della gilda Bloods')
    .addStringOption(opt =>
      opt.setName('categoria')
        .setDescription('Categoria WeakAura')
        .setRequired(false)
        .addChoices(
          { name: 'Raid — The Venomous Abyss', value: 'raid' },
          { name: 'Mythic+ Season 2', value: 'mplus' },
          { name: 'Utility', value: 'utility' },
          { name: 'Per Classe', value: 'class' },
          { name: 'Tutte (overview)', value: 'all' },
        )
    ),

  async execute(interaction) {
    const category = interaction.options.getString('categoria') || 'all';

    if (category === 'all') {
      // Show overview of all categories
      const embed = baseEmbed({
        title: '🧙 WeakAura Collection — Gilda Bloods',
        description:
          '**Collection completa di WeakAuras usate dalla gilda.**\n\n' +
          'Seleziona una categoria per vedere i link dettagliati:\n\n' +
          `**⚔️ Raid** — ${WA_COLLECTION.raid.auras.length} WA per The Venomous Abyss\n` +
          `**🔑 M+** — ${WA_COLLECTION.mplus.auras.length} WA per Season 2\n` +
          `**🛠️ Utility** — ${WA_COLLECTION.utility.auras.length} WA utility\n` +
          `**🎓 Classe** — ${WA_COLLECTION.class.auras.length} WA per classe\n\n` +
          '**Come installare:**\n' +
          '1. Installa [WeakAuras](https://www.curseforge.com/wow/addons/weakauras-2)\n' +
          '2. Clicca il link Wago.io\n' +
          '3. Clicca "Import" → copia la stringa\n' +
          '4. In gioco: `/wa` → Import → incolla',
      });
      return interaction.reply({ embeds: [embed] });
    }

    const cat = WA_COLLECTION[category];
    if (!cat) {
      return interaction.reply({ embeds: [errorEmbed('Categoria non trovata.')] });
    }

    const embed = baseEmbed({
      title: cat.title,
      description: `${cat.auras.length} WeakAuras disponibili. Clicca i link per importare.`,
    });

    for (const aura of cat.auras) {
      embed.addFields({
        name: aura.name,
        value: `🔗 [Importa da Wago.io](${aura.url})\n*${aura.desc}*`,
      });
    }

    embed.addFields({
      name: '📋 Installazione',
      value:
        '1. Installa WeakAuras 2 da CurseForge\n' +
        '2. Clicca il link Wago.io sopra\n' +
        '3. Clicca "Copy Import String"\n' +
        '4. In gioco: digita `/wa` → Import → incolla',
    });

    return interaction.reply({ embeds: [embed] });
  },
};
