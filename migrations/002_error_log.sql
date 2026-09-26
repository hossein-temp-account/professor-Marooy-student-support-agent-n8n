-- =============================================================
-- migrations/002_error_log.sql
--
-- Sink for the Error Trigger workflow. n8n's execution history
-- is the primary record; this table lets you query failures
-- without clicking through the UI and survives pruning.
-- =============================================================

USE `support_agent`;

CREATE TABLE IF NOT EXISTS `error_log` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workflow_name` VARCHAR(128)     NULL DEFAULT NULL,
  `execution_id`  VARCHAR(64)      NULL DEFAULT NULL,
  `execution_url` VARCHAR(512)     NULL DEFAULT NULL,
  `last_node`     VARCHAR(128)     NULL DEFAULT NULL,
  `error_message` TEXT             NULL DEFAULT NULL,
  `error_stack`   MEDIUMTEXT       NULL DEFAULT NULL,
  `payload`       JSON             NULL DEFAULT NULL,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_el_created` (`created_at`),
  KEY `idx_el_workflow` (`workflow_name`, `created_at`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
