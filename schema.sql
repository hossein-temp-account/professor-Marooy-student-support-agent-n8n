-- =============================================================
-- Phase 2 — schema.sql
-- MySQL 8.x / InnoDB / utf8mb4
--
-- Run once, as a user with CREATE privileges. Applied
-- automatically by the MySQL container on first boot.
--
-- WARNING: drops both tables. Do not run against a database
-- that already holds real ticket data.
-- =============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS `support_agent`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE `support_agent`;

DROP TABLE IF EXISTS `ticket_requests`;
DROP TABLE IF EXISTS `knowledge_base`;


-- -------------------------------------------------------------
-- knowledge_base
--
-- Read by node 06 via MATCH(title, content, keywords)
-- AGAINST (? IN NATURAL LANGUAGE MODE). The column list in
-- MATCH() must match the FULLTEXT index definition exactly,
-- in the same order.
-- -------------------------------------------------------------
CREATE TABLE `knowledge_base` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(255) NOT NULL,
  `content`     TEXT         NOT NULL,
  `keywords`    VARCHAR(512) NOT NULL DEFAULT '',
  `category`    VARCHAR(64)  NOT NULL DEFAULT 'general',
  `source_url`  VARCHAR(512)     NULL DEFAULT NULL,
  `is_active`   TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FULLTEXT KEY `ft_kb_search` (`title`, `content`, `keywords`),
  KEY `idx_kb_category_active` (`category`, `is_active`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- -------------------------------------------------------------
-- ticket_requests
--
-- One row per inbound request. Node 03 reads `insertId` back —
-- that value IS the ticket ID. Do not replace `id` with a UUID:
-- n8n's MySQL node returns insertId reliably only for a plain
-- integer AUTO_INCREMENT PK.
-- -------------------------------------------------------------
CREATE TABLE `ticket_requests` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,

  `student_name`    VARCHAR(128)     NULL DEFAULT NULL,
  `student_email`   VARCHAR(255)     NULL DEFAULT NULL,
  `student_id`      VARCHAR(64)      NULL DEFAULT NULL,
  `channel`         VARCHAR(32)  NOT NULL DEFAULT 'webhook',

  `question`        TEXT         NOT NULL,

  `category`        VARCHAR(64)      NULL DEFAULT NULL,
  `priority`        ENUM('low','normal','high','urgent')
                                 NOT NULL DEFAULT 'normal',
  `confidence`      DECIMAL(4,3)     NULL DEFAULT NULL,

  `status`          ENUM('new','classified','answered',
                         'escalated','failed','closed')
                                 NOT NULL DEFAULT 'new',
  `answer`          TEXT             NULL DEFAULT NULL,
  `matched_kb_ids`  JSON             NULL DEFAULT NULL,
  `error_message`   TEXT             NULL DEFAULT NULL,

  `created_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_tr_status_created` (`status`, `created_at`),
  KEY `idx_tr_email` (`student_email`),
  KEY `idx_tr_category` (`category`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
