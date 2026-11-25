-- ARB · Arcane Rescue Bureau: agents, their XP ledger, their cases and their daily plays, plus the daily
-- Quiz ABC / Incident packs, in the shared MariaDB database `t1000`. Written at runtime by the game.
--
--   mysql t1000 < db/t1000/004_ignis_agents.sql
--
-- Safe to run again: only creates what is missing. Times are epoch milliseconds (BIGINT), like the game's JSON.
-- An agent has no email and no password: only a codename and the sha256 of their secret agent key.

CREATE TABLE IF NOT EXISTS ignis_agents (
  id              CHAR(36)     NOT NULL,
  codename        VARCHAR(24)  NOT NULL,
  tag             CHAR(4)      NOT NULL COMMENT 'shown as #TAG; tells two agents with the same codename apart',
  key_hash        CHAR(64)     NOT NULL COMMENT 'sha256 of the normalized agent key; the key itself is never stored',
  lang            ENUM('en', 'pl') NOT NULL DEFAULT 'en',
  xp              INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'sum of ignis_agent_xp.amount, kept in step in one transaction',
  streak_days     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  last_active_day DATE         NULL COMMENT 'Bureau day (Europe/Warsaw) of the last XP-earning activity',
  created_at      BIGINT       NOT NULL,
  last_seen_at    BIGINT       NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ignis_agents_key (key_hash),
  KEY ix_ignis_agents_active (last_active_day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bureau agents (players)';

CREATE TABLE IF NOT EXISTS ignis_agent_xp (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  agent_id   CHAR(36)     NOT NULL,
  ref        VARCHAR(160) NOT NULL COMMENT 'what paid, e.g. ending:<story>:<page>, quest:<day>:<slug>; pays once',
  source     VARCHAR(20)  NOT NULL COMMENT 'page, move, ending, discovery, quest, quiz, incident, interrogation, streak',
  amount     SMALLINT UNSIGNED NOT NULL,
  label      VARCHAR(160) NOT NULL,
  created_at BIGINT       NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ignis_agent_xp_ref (agent_id, ref),
  KEY ix_ignis_agent_xp_time (agent_id, created_at),
  CONSTRAINT fk_ignis_agent_xp_agent FOREIGN KEY (agent_id) REFERENCES ignis_agents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='XP ledger: one row per award';

CREATE TABLE IF NOT EXISTS ignis_agent_cases (
  agent_id     CHAR(36)    NOT NULL,
  story_id     CHAR(36)    NOT NULL COMMENT 'data/stories/<id>.json',
  tale_id      VARCHAR(40) NOT NULL,
  format       ENUM('case', 'quick') NOT NULL DEFAULT 'case',
  pages        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  ending_type  ENUM('canon', 'subverted', 'cursed', 'secret', 'death') NULL,
  ending_title VARCHAR(80) NULL,
  updated_at   BIGINT      NOT NULL,
  PRIMARY KEY (agent_id, story_id),
  KEY ix_ignis_agent_cases_time (agent_id, updated_at),
  CONSTRAINT fk_ignis_agent_cases_agent FOREIGN KEY (agent_id) REFERENCES ignis_agents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Index of each agent''s cases (the stories stay as files)';

CREATE TABLE IF NOT EXISTS ignis_agent_daily (
  agent_id     CHAR(36) NOT NULL,
  day          DATE     NOT NULL,
  kind         ENUM('quiz', 'incident', 'interrogation') NOT NULL,
  state        LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL CHECK (state IS NULL OR JSON_VALID(state)),
  xp           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  completed_at BIGINT   NULL,
  PRIMARY KEY (agent_id, day, kind),
  CONSTRAINT fk_ignis_agent_daily_agent FOREIGN KEY (agent_id) REFERENCES ignis_agents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Each agent''s daily quiz / incident / interrogation';

CREATE TABLE IF NOT EXISTS ignis_daily_packs (
  day        DATE NOT NULL COMMENT 'Bureau day, Europe/Warsaw',
  lang       ENUM('en', 'pl') NOT NULL,
  kind       ENUM('quiz', 'incident') NOT NULL,
  payload    LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (JSON_VALID(payload)),
  source     ENUM('claude', 'seed', 'edited') NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (day, lang, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily Quiz ABC and Incident, written by Claude or edited in the admin panel';

GRANT SELECT, INSERT, UPDATE ON t1000.ignis_agents TO 'ignis_book'@'localhost';
GRANT SELECT, INSERT ON t1000.ignis_agent_xp TO 'ignis_book'@'localhost';
GRANT SELECT, INSERT, UPDATE ON t1000.ignis_agent_cases TO 'ignis_book'@'localhost';
GRANT SELECT, INSERT, UPDATE ON t1000.ignis_agent_daily TO 'ignis_book'@'localhost';
GRANT SELECT, INSERT, UPDATE ON t1000.ignis_daily_packs TO 'ignis_book'@'localhost';
