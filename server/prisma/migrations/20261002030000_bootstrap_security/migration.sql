-- Bootstrap security state for controlled first Super Admin setup.
ALTER TABLE `users`
  ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false;
