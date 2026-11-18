-- IGNIS // Grimm Protocol (demo.ifairy.co.uk): tables in the shared MariaDB database `t1000`.
-- The `ignis_` prefix keeps them apart from the panel's own tables (tc_*, gr_*, diag_*, dp_*, ...).
-- Safe to run again: it only creates what is missing.
--
--   mysql t1000 < db/t1000/001_ignis_storage.sql

CREATE TABLE IF NOT EXISTS ignis_admins (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  login         VARCHAR(64)  NOT NULL,
  -- scrypt$N$r$p$<salt base64>$<hash base64>, never the password itself
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('superadmin', 'admin') NOT NULL DEFAULT 'admin',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  last_login_at DATETIME     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ignis_admins_login (login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ignis_api_keys (
  -- anthropic | gemini | openai (ProviderId in server/config.ts)
  provider    VARCHAR(32)     NOT NULL PRIMARY KEY,
  -- AES-256-GCM, key from IGNIS_T1000_SECRET in .env. The provider name is the AAD,
  -- so a ciphertext copied into another row does not decrypt.
  ciphertext  VARBINARY(2048) NOT NULL,
  iv          BINARY(12)      NOT NULL,
  auth_tag    BINARY(16)      NOT NULL,
  -- last 4 characters, to show which key is stored without revealing it
  key_hint    VARCHAR(8)      NOT NULL,
  updated_by  VARCHAR(64)     NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
