-- Add explicit account scope. Existing users remain company-scoped.
ALTER TABLE `users`
  ADD COLUMN `scope` ENUM('COMPANY', 'GLOBAL') NOT NULL DEFAULT 'COMPANY';

-- Only a SUPERADMIN may later be assigned GLOBAL scope. This migration does
-- not create a Super Admin account or credentials.
