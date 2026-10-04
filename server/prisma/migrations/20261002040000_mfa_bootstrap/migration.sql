-- Encrypted TOTP secret and enrollment state for Super Admin MFA.
ALTER TABLE `users`
  ADD COLUMN `mfaEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `mfaSecret` VARCHAR(191) NULL;
