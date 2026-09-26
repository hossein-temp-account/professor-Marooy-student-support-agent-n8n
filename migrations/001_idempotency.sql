-- =============================================================
-- migrations/001_idempotency.sql
--
-- Why: node 03 retries on transient DB failures, and clients
-- retry webhooks. Both can produce duplicate rows for a single
-- student request. A unique idempotency key makes the insert
-- idempotent; the LAST_INSERT_ID(id) trick makes a duplicate
-- insert return the ORIGINAL ticket id rather than creating a
-- second row.
--
-- NULLs do not collide in a MySQL unique index, so rows without
-- a key are unaffected.
--
-- Apply:
--   docker compose exec -T mysql \
--     mysql -u root -p"$MYSQL_ROOT_PASSWORD" support_agent \
--     < migrations/001_idempotency.sql
-- =============================================================

USE `support_agent`;

ALTER TABLE `ticket_requests`
  ADD COLUMN `idempotency_key` VARCHAR(64) NULL DEFAULT NULL
      AFTER `channel`,
  ADD UNIQUE KEY `uq_tr_idempotency` (`idempotency_key`);
