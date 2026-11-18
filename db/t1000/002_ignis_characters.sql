-- IGNIS // Grimm Protocol: story characters in the shared MariaDB database `t1000`.
--
-- Mirrors the ARB character model (arb_narratoriusz.characters / character_dna / character_personas /
-- character_retellings / character_relationships, blueprint in docs/postacie.sql) under the `ignis_` prefix,
-- with the same column names and JSON branches (arb_character_v1, arb_voice_v1), so ARB queries work after
-- swapping the prefix. Dropped ARB-only links: factions, locations, departments, art slots, staff flag.
-- Added: name_en (the game is bilingual) and arb_character_id (plain link to ARB, no cross-database FK).
--
--   mysql t1000 < db/t1000/002_ignis_characters.sql
--   node scripts/t1000-characters.mjs | mysql t1000
--
-- Safe to run again: only creates what is missing.

CREATE TABLE IF NOT EXISTS ignis_characters (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'shared ID of the character layers (blueprint: character_id)',
  slug             VARCHAR(120) NOT NULL,
  name             VARCHAR(160) NOT NULL COMMENT 'Polish name',
  name_en          VARCHAR(160) NULL COMMENT 'English name used when the story is in English',
  epithet          VARCHAR(160) NULL,
  role             VARCHAR(160) NULL COMMENT 'function in the tale',
  kind             ENUM('postac', 'grupa', 'istota', 'obiekt') NOT NULL DEFAULT 'postac',
  tale_id          VARCHAR(64)  NULL COMMENT 'tale id from shared/tales.ts; NULL = outside a tale (narrator)',
  arb_character_id INT UNSIGNED NULL COMMENT 'counterpart in arb_narratoriusz.characters.id, if any',
  image            VARCHAR(255) NULL,
  status           TINYINT(1)   NOT NULL DEFAULT 1,
  item_order       INT          NOT NULL DEFAULT 0,
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_ignis_characters_slug (slug),
  KEY idx_ignis_characters_tale (tale_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='IGNIS character registry (ARB-compatible)';

CREATE TABLE IF NOT EXISTS ignis_character_dna (
  character_id          INT UNSIGNED NOT NULL,
  genre                 VARCHAR(50)  NULL,
  narrative_structure   ENUM('Linear', 'Non-linear', 'Reverse', 'Circular') NOT NULL DEFAULT 'Linear',
  core_theme            VARCHAR(100) NULL,
  emotional_profile     LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL COMMENT 'trait → intensity 0..1' CHECK (JSON_VALID(emotional_profile)),
  pacing_index          DECIMAL(3,2) NULL,
  protagonist_archetype VARCHAR(100) NULL,
  system_prompt         TEXT NULL COMMENT 'continuity rules for the narrator',
  dna_json              LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'branch arb_character_v1: source_kind, source_variant, origin_summary, anchors[], immutable_facts[], flexible_elements[], desire, need, blind_spot, stakes, relationships[], signature_objects[], world_rules[], arc_end, continuity_memory[]' CHECK (JSON_VALID(dna_json)),
  status                TINYINT(1)   NOT NULL DEFAULT 1,
  created_at            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (character_id),
  CONSTRAINT fk_ignis_character_dna_char FOREIGN KEY (character_id) REFERENCES ignis_characters (id) ON DELETE CASCADE,
  CONSTRAINT chk_ignis_character_dna_pacing CHECK (pacing_index IS NULL OR pacing_index BETWEEN 0 AND 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ignis_character_personas (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  character_id           INT UNSIGNED NOT NULL,
  mode                   VARCHAR(16)  NOT NULL DEFAULT 'grimm' COMMENT 'app mode: grimm (this game); ARB uses arb, gcse',
  description            TEXT NULL COMMENT 'blueprint: character_pitch',
  welcome_message        TEXT NULL,
  display_welcome        TINYINT(1)   NOT NULL DEFAULT 1,
  expert                 VARCHAR(255) NULL COMMENT 'blueprint: runtime_role',
  prompt                 MEDIUMTEXT NULL COMMENT 'blueprint: character_system_prompt',
  api_model              VARCHAR(80)  NULL COMMENT 'NULL = the story model from the admin panel',
  ai_parameters          LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL CHECK (JSON_VALID(ai_parameters)),
  interaction_style      LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL COMMENT 'branch arb_voice_v1: point_of_view, register, cadence, speech_signature[], body_language[], pressure_response, player_role, welcome_line, character_system_prompt, voice_sample' CHECK (JSON_VALID(interaction_style)),
  response_configuration LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL CHECK (JSON_VALID(response_configuration)),
  tts_provider           VARCHAR(32)  NULL,
  tts_voice              VARCHAR(64)  NULL,
  image                  VARCHAR(255) NULL,
  status                 TINYINT(1)   NOT NULL DEFAULT 1,
  item_order             INT          NOT NULL DEFAULT 0,
  created_at             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_ignis_character_personas_mode (character_id, mode),
  CONSTRAINT fk_ignis_character_personas_char FOREIGN KEY (character_id) REFERENCES ignis_characters (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ignis_character_retellings (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  character_id     INT UNSIGNED NOT NULL,
  slug             VARCHAR(120) NOT NULL,
  title            VARCHAR(200) NOT NULL COMMENT 'blueprint: retelling_title',
  retelling_type   ENUM('alternate_scene', 'sequel', 'role_reversal', 'perspective_shift', 'setting_transplant') NOT NULL,
  canon_anchor     VARCHAR(255) NULL,
  humour_mechanism VARCHAR(255) NULL,
  mission_id       VARCHAR(64)  NULL COMMENT 'ARB compatibility; unused here',
  retelling_json   LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'full contract: schema_version, invented_change, setting, scene_goal, inciting_incident, comic_contradiction, absurd_rule, straight_character, setup, escalation[], punchline, aftermath, running_gag, humour_boundary, choices[]' CHECK (JSON_VALID(retelling_json)),
  status           ENUM('draft', 'review', 'active', 'retired') NOT NULL DEFAULT 'draft',
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_ignis_character_retellings_slug (slug),
  KEY idx_ignis_character_retellings_char (character_id, status),
  CONSTRAINT fk_ignis_character_retellings_char FOREIGN KEY (character_id) REFERENCES ignis_characters (id) ON DELETE CASCADE,
  CONSTRAINT chk_ignis_character_retellings_version CHECK (JSON_VALUE(retelling_json, '$.schema_version') IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ignis_character_relationships (
  character_id       INT UNSIGNED NOT NULL,
  other_character_id INT UNSIGNED NOT NULL,
  role               VARCHAR(120) NOT NULL COMMENT 'e.g. ally, rival, target',
  tension            VARCHAR(255) NULL,
  PRIMARY KEY (character_id, other_character_id),
  KEY idx_ignis_char_rel_other (other_character_id),
  CONSTRAINT fk_ignis_char_rel_a FOREIGN KEY (character_id) REFERENCES ignis_characters (id) ON DELETE CASCADE,
  CONSTRAINT fk_ignis_char_rel_b FOREIGN KEY (other_character_id) REFERENCES ignis_characters (id) ON DELETE CASCADE,
  CONSTRAINT chk_ignis_char_rel_self CHECK (character_id <> other_character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The game only reads characters at runtime.
GRANT SELECT ON t1000.ignis_characters TO 'ignis_book'@'localhost';
GRANT SELECT ON t1000.ignis_character_dna TO 'ignis_book'@'localhost';
GRANT SELECT ON t1000.ignis_character_personas TO 'ignis_book'@'localhost';
GRANT SELECT ON t1000.ignis_character_retellings TO 'ignis_book'@'localhost';
GRANT SELECT ON t1000.ignis_character_relationships TO 'ignis_book'@'localhost';
