-- Phase 2 baseline: migration infrastructure only.
-- No business tables are created here; domain tables arrive in later phases.
-- Compatible with MySQL 8.x and H2 (MySQL mode).
CREATE TABLE IF NOT EXISTS schema_control (
  id INT PRIMARY KEY,
  description VARCHAR(255) NOT NULL
);
