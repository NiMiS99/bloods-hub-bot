// src/events/interactionCreate.js
// Routes interactions: slash commands, button clicks, select-menu submissions.
const logger = require('../utils/logger');
const { errorEmbed } = require('../utils/embed');

// Per-user command cooldown (3 seconds for user commands, 1s for admin)
const _cooldowns = new Map();
const COOLDOWN_USER_MS = 3000;
const COOLDOWN_ADMIN_MS = 1000;

function checkCooldown(userId, commandName, isAdminCmd) {
  const key = `${userId}:${commandName}`;
  const now = Date.now();
  const last = _cooldowns.get(key);
  const cd = isAdminCmd ? COOLDOWN_ADMIN_MS : COOLDOWN_USER_MS;
  if (last && now - last < cd) {
    return Math.ceil((cd - (now - last)) / 1000);
  }
  _cooldowns.set(key, now);
  // Clean old entries every 1000 commands
  if (_cooldowns.size > 1000) {
    for (const [k, t] of _cooldowns) {
      if (now - t > 60000) _cooldowns.delete(k);
    }
  }
  return 0;
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          await interaction.reply({ embeds: [errorEmbed('Comando sconosciuto.')], flags: 64 });
          return;
        }

        // Cooldown check (skip for /ping and /help)
        if (interaction.commandName !== 'ping' && interaction.commandName !== 'help') {
          const isAdminCmd = command.data?.default_member_permissions !== undefined;
          const remaining = checkCooldown(interaction.user.id, interaction.commandName, isAdminCmd);
          if (remaining > 0) {
            await interaction.reply({
              embeds: [errorEmbed(`Aspetta ${remaining} secondi prima di usare questo comando di nuovo.`)],
              flags: 64,
            });
            return;
          }
        }

        await command.execute(interaction, client);
        return;
      }

      if (interaction.isButton()) {
        // CustomId format: "group:type:payload..."
        const [group, type, ...payload] = interaction.customId.split(':');

        // Onboarding verification button
        if (interaction.customId === 'onboard:verify') {
          const OnboardingService = require('../services/onboardingService');
          await OnboardingService.handleVerify(interaction, client);
          return;
        }

        // Ticket system buttons
        if (interaction.customId === 'ticket:open') {
          const TicketService = require('../services/ticketService');
          await TicketService.handleOpen(interaction, client);
          return;
        }
        if (interaction.customId === 'ticket:close') {
          const TicketService = require('../services/ticketService');
          await TicketService.handleClose(interaction, client);
          return;
        }

        // Admin panel buttons (dash:*)
        if (interaction.customId.startsWith('dash:')) {
          const AdminPanelService = require('../services/adminPanelService');
          await AdminPanelService.handleButton(interaction, client);
          return;
        }

        // Rules panel buttons (rules:*)
        if (interaction.customId.startsWith('rules:')) {
          const RulesPanelService = require('../services/rulesPanelService');
          await RulesPanelService.handleButton(interaction);
          return;
        }

        if (group === 'role') {
          const handler = require('../ui/roleSelectionInteractions');
          await handler.handleButton(interaction, client, payload[0], payload.slice(1));
          return;
        }

        // Giveaway join button
        if (interaction.customId === 'giveaway:join') {
          const GiveawayService = require('../services/giveawayService');
          const { Giveaway } = require('../db');
          const giveawayId = parseInt(interaction.message.id ? 0 : 0, 10); // not used; we lookup by message_id

          // Find giveaway by message_id
          const giveaway = await Giveaway.findOne({
            where: { message_id: interaction.message.id, guild_id: interaction.guild.id },
          });
          if (!giveaway || giveaway.is_ended) {
            await interaction.reply({ content: 'Questo giveaway non è più attivo.', flags: 64 });
            return;
          }

          // Check required role
          if (giveaway.required_role_id) {
            const member = await interaction.guild.members.fetch(interaction.user.id, { force: false }).catch(() => null);
            if (!member || !member.roles.cache.has(String(giveaway.required_role_id))) {
              await interaction.reply({ content: `Non hai il ruolo richiesto: <@&${giveaway.required_role_id}>.`, flags: 64 });
              return;
            }
          }

          const { isNew, count } = GiveawayService.addParticipant(giveaway.id, interaction.user.id);
          if (isNew) {
            // Update the embed with new participant count
            const payload = GiveawayService.buildGiveawayMessage(giveaway, count);
            await interaction.message.edit(payload).catch(() => {});
            await interaction.reply({ content: 'Sei iscritto al giveaway! 🎉', flags: 64 });
          } else {
            await interaction.reply({ content: 'Sei già iscritto a questo giveaway!', flags: 64 });
          }
          return;
        }

        // Temp voice control buttons
        if (interaction.customId.startsWith('tempvc:')) {
          const TempVoiceService = require('../services/tempVoiceService');
          await TempVoiceService.handleButton(interaction, client);
          return;
        }

        if (group === 'event') {
          const handler = require('../ui/eventInteractions');
          await handler.handleButton(interaction, client, payload[0], payload.slice(1));
          return;
        }
        if (group === 'lfg') {
          const handler = require('../ui/lfgInteractions');
          await handler.handleButton(interaction, client, payload[0], payload.slice(1));
          return;
        }
        if (group === 'sped') {
          const handler = require('../ui/spedizioneInteractions');
          await handler.handleButton(interaction, client, type, payload);
          return;
        }
        if (group === 'suggest') {
          return;
        }

        // Gamemode panel interactions
        if (group === 'gamemode') {
          const GameModeService = require('../services/gameModeService');
          if (type === 'details') {
            const serverId = parseInt(payload[0]);
            const details = await GameModeService.buildServerDetails(serverId, interaction.guild);
            await interaction.reply({ ...details, flags: 64 });
            return;
          }
          if (type === 'back') {
            const panel = await GameModeService.buildGameModePanel(interaction.guild);
            await interaction.update(panel);
            return;
          }
        }
      }

      if (interaction.isStringSelectMenu()) {
        // CustomId format: "group:type:payload..."
        const [group, type, ...payload] = interaction.customId.split(':');
        if (group === 'role') {
          const handler = require('../ui/roleSelectionInteractions');
          await handler.handleSelectMenu(interaction, client, payload[0], payload.slice(1));
          return;
        }
        if (group === 'sped') {
          const handler = require('../ui/spedizioneInteractions');
          await handler.handleSelectMenu(interaction, client, type, payload);
          return;
        }
      }

      if (interaction.isModalSubmit()) {
        // Temp voice modals
        if (interaction.customId.startsWith('tempvc:')) {
          const TempVoiceService = require('../services/tempVoiceService');
          const handled = await TempVoiceService.handleModalSubmit(interaction, client);
          if (handled) return;
        }
      }

      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (command?.autocomplete) await command.autocomplete(interaction, client);
      }
    } catch (err) {
      logger.error(`Interaction error (${interaction.customId || interaction.commandName}):`, err);

      // User-friendly error messages based on error type
      let msg = 'Si è verificato un errore. Riprova più tardi.';
      if (err.code === 50013) msg = 'Non ho i permessi necessari per questa azione.';
      else if (err.code === 10062) msg = 'Questa interazione è scaduta. Riprova.';
      else if (err.code === 40060) msg = 'Questa interazione è già stata gestita.';
      else if (err.message?.includes('rate limit')) msg = 'Troppo veloce! Aspetta qualche secondo.';
      else if (err.message?.includes('Unknown')) msg = 'Risorsa non trovata. Potrebbe essere stata eliminata.';

      const payload = { embeds: [errorEmbed(msg)], flags: 64 };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};
