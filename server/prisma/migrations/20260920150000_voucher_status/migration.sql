ALTER TABLE `vouchers`
  ADD COLUMN `status` ENUM('DRAFT', 'SENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `supplierConfirmedAt` DATETIME(3) NULL,
  ADD COLUMN `supplierConfirmationRef` VARCHAR(191) NULL;

CREATE INDEX `vouchers_status_idx` ON `vouchers`(`status`);
