-- Optional seed data for the games catalog.
-- Safe to re-run (uses INSERT IGNORE).

INSERT IGNORE INTO `games`
  (`code`, `name`, `category`, `api_provider`, `color_hex`, `is_active`)
VALUES
  ('wow',          'World of Warcraft', 'mmo',     'battlenet', 0xCD853F, 1),
  ('valorant',     'Valorant',          'fps',     'riot',      0xFF4655, 1),
  ('lol',          'League of Legends', 'moba',    'riot',      0x0BC6E3, 1),
  ('csgo',         'Counter-Strike 2',  'fps',     'steam',     0xF5A623, 1),
  ('dota2',        'Dota 2',            'moba',    'steam',     0xA8324A, 1),
  ('apex',         'Apex Legends',      'fps',     'manual',    0xDA292A, 1),
  ('minecraft',    'Minecraft',         'sandbox', 'manual',    0x44A847, 1),
  ('ffxiv',        'Final Fantasy XIV', 'mmo',     'manual',    0x4A90D9, 1);
