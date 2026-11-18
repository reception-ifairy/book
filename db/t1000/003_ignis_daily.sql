-- IGNIS // ARB: daily ops in the shared MariaDB database `t1000` — quests, glitches of the day, and planned days.
-- Edited at runtime from the game's admin panel (/#/admin → Daily ops), so the app account may write here.
--
--   mysql t1000 < db/t1000/003_ignis_daily.sql
--   node scripts/t1000-daily.mjs | mysql t1000      (adds the starter pool; never overwrites admin edits)
--
-- Safe to run again: only creates what is missing.

CREATE TABLE IF NOT EXISTS ignis_quests (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug        VARCHAR(80)  NOT NULL,
  title       VARCHAR(120) NOT NULL,
  description VARCHAR(400) NOT NULL,
  kind        ENUM('close_case', 'ending', 'choice_kind', 'custom_moves', 'pages', 'stat', 'canon_finish', 'open_case') NOT NULL,
  params      LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '{}' COMMENT 'tale_id, count, ending, choice, stat, op, value, min_canon' CHECK (JSON_VALID(params)),
  reward_xp   SMALLINT UNSIGNED NOT NULL DEFAULT 50,
  status      ENUM('active', 'draft', 'retired') NOT NULL DEFAULT 'active' COMMENT 'only active quests rotate',
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_ignis_quests_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily quest pool';

CREATE TABLE IF NOT EXISTS ignis_glitches (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(80)  NOT NULL,
  text       VARCHAR(300) NOT NULL COMMENT 'one sentence, English; also goes into the story prompt',
  status     ENUM('active', 'draft', 'retired') NOT NULL DEFAULT 'active',
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_ignis_glitches_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Glitch of the day pool';

CREATE TABLE IF NOT EXISTS ignis_daily (
  day         DATE NOT NULL COMMENT 'Bureau day, Europe/Warsaw',
  briefing    VARCHAR(300) NULL COMMENT 'IGNIS line for the day; NULL = default',
  glitch_slug VARCHAR(80)  NULL,
  quest_slugs LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '[]' CHECK (JSON_VALID(quest_slugs)),
  updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Days planned by hand; other days rotate from the pools';

GRANT SELECT, INSERT, UPDATE, DELETE ON t1000.ignis_quests TO 'ignis_book'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON t1000.ignis_glitches TO 'ignis_book'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON t1000.ignis_daily TO 'ignis_book'@'localhost';
