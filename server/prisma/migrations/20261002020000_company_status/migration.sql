-- Platform lifecycle state for explicit Super Admin company management.
ALTER TABLE `companies`
  ADD COLUMN `status` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE';
