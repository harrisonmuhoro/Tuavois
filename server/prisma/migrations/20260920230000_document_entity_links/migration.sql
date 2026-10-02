ALTER TABLE `documents` ADD COLUMN `invoiceId` VARCHAR(191) NULL,
    ADD COLUMN `quotationId` VARCHAR(191) NULL;

CREATE INDEX `documents_invoiceId_idx` ON `documents`(`invoiceId`);
CREATE INDEX `documents_quotationId_idx` ON `documents`(`quotationId`);

ALTER TABLE `documents` ADD CONSTRAINT `documents_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `documents` ADD CONSTRAINT `documents_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
