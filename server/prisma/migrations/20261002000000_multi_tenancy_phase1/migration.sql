-- Phase 1: introduce the tenant boundary and attach operational records to it.
-- companyId is nullable during this migration so existing installations can be
-- backfilled safely by the seed/backfill process before it becomes mandatory.

CREATE TABLE IF NOT EXISTS `companies` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT 'TuaVois Travel',
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `taxId` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KES',
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 16,
    `taxName` VARCHAR(191) NOT NULL DEFAULT 'VAT',
    `kraPin` VARCHAR(191) NULL,
    `bankDetails` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @add_company_tax_id = (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE `companies` ADD COLUMN `taxId` VARCHAR(191) NULL AFTER `address`',
        'SELECT 1')
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'taxId'
);
PREPARE add_company_tax_id FROM @add_company_tax_id;
EXECUTE add_company_tax_id;
DEALLOCATE PREPARE add_company_tax_id;

INSERT INTO `companies` (`id`, `name`, `email`, `phone`, `address`, `taxId`, `website`, `currency`, `taxRate`, `taxName`, `kraPin`, `bankDetails`, `updatedAt`)
VALUES ('company-settings-1', 'TuaVois Travel & Tours Ltd', 'info@tuavois.co.ke', '+254 700 000 000', 'Westlands, Nairobi, Kenya', 'P051234567A', 'www.tuavois.co.ke', 'KES', 16, 'VAT', 'P051234567A', 'Equity Bank | Account: 0123456789 | Branch: Westlands', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `id` = `id`;

ALTER TABLE `users` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `users_companyId_idx` (`companyId`),
    ADD CONSTRAINT `users_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `clients` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `clients_companyId_idx` (`companyId`),
    ADD CONSTRAINT `clients_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `prospects` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `prospects_companyId_idx` (`companyId`),
    ADD CONSTRAINT `prospects_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `quotations` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `quotations_companyId_idx` (`companyId`),
    ADD CONSTRAINT `quotations_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `invoices` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `invoices_companyId_idx` (`companyId`),
    ADD CONSTRAINT `invoices_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payments` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `payments_companyId_idx` (`companyId`),
    ADD CONSTRAINT `payments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `receipts` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `receipts_companyId_idx` (`companyId`),
    ADD CONSTRAINT `receipts_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `credit_notes` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `credit_notes_companyId_idx` (`companyId`),
    ADD CONSTRAINT `credit_notes_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `trips` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `trips_companyId_idx` (`companyId`),
    ADD CONSTRAINT `trips_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `trip_expenses` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `trip_expenses_companyId_idx` (`companyId`),
    ADD CONSTRAINT `trip_expenses_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `itineraries` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `itineraries_companyId_idx` (`companyId`),
    ADD CONSTRAINT `itineraries_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `itinerary_templates` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `itinerary_templates_companyId_idx` (`companyId`),
    ADD CONSTRAINT `itinerary_templates_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `vouchers` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `vouchers_companyId_idx` (`companyId`),
    ADD CONSTRAINT `vouchers_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `letters` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `letters_companyId_idx` (`companyId`),
    ADD CONSTRAINT `letters_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `document_sequences` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `document_sequences_companyId_idx` (`companyId`),
    ADD CONSTRAINT `document_sequences_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `notifications` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `notifications_companyId_idx` (`companyId`),
    ADD CONSTRAINT `notifications_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `audit_logs` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `audit_logs_companyId_idx` (`companyId`),
    ADD CONSTRAINT `audit_logs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `documents` ADD COLUMN `companyId` VARCHAR(191) NULL,
    ADD INDEX `documents_companyId_idx` (`companyId`),
    ADD CONSTRAINT `documents_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE `users` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `clients` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `prospects` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `quotations` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `invoices` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `payments` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `receipts` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `credit_notes` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `trips` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `trip_expenses` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `itineraries` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `itinerary_templates` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `vouchers` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `letters` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `document_sequences` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `notifications` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `audit_logs` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;
UPDATE `documents` SET `companyId` = 'company-settings-1' WHERE `companyId` IS NULL;

ALTER TABLE `clients` DROP INDEX `clients_clientNumber_key`, ADD UNIQUE INDEX `clients_companyId_clientNumber_key` (`companyId`, `clientNumber`);
ALTER TABLE `prospects` DROP INDEX `prospects_prospectNumber_key`, ADD UNIQUE INDEX `prospects_companyId_prospectNumber_key` (`companyId`, `prospectNumber`);
ALTER TABLE `quotations` DROP INDEX `quotations_quotationNumber_key`, ADD UNIQUE INDEX `quotations_companyId_quotationNumber_key` (`companyId`, `quotationNumber`);
ALTER TABLE `invoices` DROP INDEX `invoices_invoiceNumber_key`, ADD UNIQUE INDEX `invoices_companyId_invoiceNumber_key` (`companyId`, `invoiceNumber`);
ALTER TABLE `payments` DROP INDEX `payments_paymentNumber_key`, ADD UNIQUE INDEX `payments_companyId_paymentNumber_key` (`companyId`, `paymentNumber`);
ALTER TABLE `receipts` DROP INDEX `receipts_receiptNumber_key`, ADD UNIQUE INDEX `receipts_companyId_receiptNumber_key` (`companyId`, `receiptNumber`);
ALTER TABLE `credit_notes` DROP INDEX `credit_notes_creditNoteNumber_key`, ADD UNIQUE INDEX `credit_notes_companyId_creditNoteNumber_key` (`companyId`, `creditNoteNumber`);
ALTER TABLE `trips` DROP INDEX `trips_tripNumber_key`, ADD UNIQUE INDEX `trips_companyId_tripNumber_key` (`companyId`, `tripNumber`);
ALTER TABLE `itineraries` DROP INDEX `itineraries_itineraryNumber_key`, ADD UNIQUE INDEX `itineraries_companyId_itineraryNumber_key` (`companyId`, `itineraryNumber`);
ALTER TABLE `vouchers` DROP INDEX `vouchers_voucherNumber_key`, ADD UNIQUE INDEX `vouchers_companyId_voucherNumber_key` (`companyId`, `voucherNumber`);
