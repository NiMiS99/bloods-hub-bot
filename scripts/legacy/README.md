# Legacy Scripts

Script di migrazione e fix one-shot. **Non usare in produzione.**
Archiviati per riferimento storico — possono essere eliminati in futuro.

## Avvertenze

- Questi script sono stati eseguiti una tantum durante la migrazione del server
- Non sono testati con lo stato attuale del DB
- Posso causare danni se eseguiti senza comprensione del contesto
- Non sono coperti dai test automatizzati

## Script

| Script | Scopo | Stato |
|--------|-------|-------|
| `backfill_games.js` | Backfill giochi nel DB | Eseguito |
| `create_new_tables.js` | Creazione tabelle nuove | Eseguito |
| `deep_analyze_server.js` | Analisi profonda server Discord | Eseguito |
| `delete_unused_chat.js` | Eliminazione canali chat inutilizzati | Eseguito |
| `fix_audit_issues.js` | Fix problemi rilevati dall'audit | Eseguito |
| `fix_enum.js` / `fix_enum_v2.js` | Fix tipi enum nel DB | Eseguito |
| `fix_gilda_order.js` | Riordino categorie gilda | Eseguito |
| `fix_log_channel.js` / `fix_log_channel2.js` | Fix canale log | Eseguito |
| `fix_muted_new_cats.js` | Fix permessi muted nuove categorie | Eseguito |
| `fix_order_and_duello.js` | Fix ordine canali e categoria duello | Eseguito |
| `fix_reorganization.js` | Fix post-riorganizzazione server | Eseguito |
| `fix_wow_channels.js` | Fix canali WoW | Eseguito |
| `migrate_bp_data.js` | Migrazione dati Bloods Points | Eseguito |
| `migrate_game_channels.js` | Migrazione canali gioco | Eseguito |
| `migrate_guild_columns.js` | Migrazione colonne tabella guilds | Eseguito |
| `migrate_phase1.js` | Migrazione fase 1 | Eseguito |
| `rebuild_missing.js` | Ricostruzione canali mancanti | Eseguito |
| `rename_game_channels.js` | Rinomina canali gioco | Eseguito |
| `rename_remaining_fraktur.js` | Rinomina canali con font Fraktur | Eseguito |
| `rename_to_sansserif.js` | Conversione nomi a sans-serif | Eseguito |
| `reorganize_server.js` | Riorganizzazione server | Eseguito |
| `setup_discord.js` | Setup iniziale Discord | Eseguito |
