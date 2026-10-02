-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissions_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,

    INDEX `role_permissions_roleId_idx`(`roleId`),
    INDEX `role_permissions_permissionId_idx`(`permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `roleId` VARCHAR(191) NOT NULL,
    `dateJoined` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` VARCHAR(191) NOT NULL,
    `clientNumber` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `idNumber` VARCHAR(191) NULL,
    `nationality` VARCHAR(191) NOT NULL DEFAULT 'Kenyan',
    `address` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `assignedStaffId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clients_clientNumber_key`(`clientNumber`),
    INDEX `clients_fullName_idx`(`fullName`),
    INDEX `clients_email_idx`(`email`),
    INDEX `clients_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prospects` (
    `id` VARCHAR(191) NOT NULL,
    `prospectNumber` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `company` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `nationality` VARCHAR(191) NULL,
    `status` ENUM('NEW', 'CONTACTED', 'QUALIFIED', 'QUOTATION_SENT', 'NEGOTIATION', 'WON', 'LOST') NOT NULL DEFAULT 'NEW',
    `leadSource` VARCHAR(191) NULL,
    `travelInterest` VARCHAR(191) NULL,
    `estimatedValue` DECIMAL(15, 2) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KES',
    `notes` TEXT NULL,
    `assignedStaffId` VARCHAR(191) NULL,
    `convertedToClientId` VARCHAR(191) NULL,
    `convertedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `prospects_prospectNumber_key`(`prospectNumber`),
    INDEX `prospects_fullName_idx`(`fullName`),
    INDEX `prospects_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotations` (
    `id` VARCHAR(191) NOT NULL,
    `quotationNumber` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `travelStartDate` DATETIME(3) NULL,
    `travelEndDate` DATETIME(3) NULL,
    `destination` VARCHAR(191) NULL,
    `pax` INTEGER NOT NULL DEFAULT 1,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KES',
    `exchangeRate` DECIMAL(15, 6) NOT NULL DEFAULT 1,
    `validUntil` DATETIME(3) NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `discountType` ENUM('AMOUNT', 'PERCENTAGE') NOT NULL DEFAULT 'AMOUNT',
    `discountValue` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `discountAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `grandTotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `terms` TEXT NULL,
    `status` ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED') NOT NULL DEFAULT 'DRAFT',
    `createdById` VARCHAR(191) NULL,
    `convertedInvoiceId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `quotations_quotationNumber_key`(`quotationNumber`),
    INDEX `quotations_clientId_idx`(`clientId`),
    INDEX `quotations_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_items` (
    `id` VARCHAR(191) NOT NULL,
    `quotationId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `quotation_items_quotationId_idx`(`quotationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NULL,
    `invoiceDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KES',
    `exchangeRate` DECIMAL(15, 6) NOT NULL DEFAULT 1,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `discountType` ENUM('AMOUNT', 'PERCENTAGE') NOT NULL DEFAULT 'AMOUNT',
    `discountValue` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `discountAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `grandTotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `amountPaid` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `creditApplied` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `balance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `terms` TEXT NULL,
    `status` ENUM('DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `quotationId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_invoiceNumber_key`(`invoiceNumber`),
    INDEX `invoices_clientId_idx`(`clientId`),
    INDEX `invoices_status_idx`(`status`),
    INDEX `invoices_dueDate_idx`(`dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `pax` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `invoice_items_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `paymentNumber` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KES',
    `exchangeRate` DECIMAL(15, 6) NOT NULL DEFAULT 1,
    `baseAmount` DECIMAL(15, 2) NOT NULL,
    `paymentMethod` ENUM('CASH', 'BANK_TRANSFER', 'MPESA', 'CARD', 'OTHER') NOT NULL DEFAULT 'BANK_TRANSFER',
    `paymentDate` DATETIME(3) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `receivedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_paymentNumber_key`(`paymentNumber`),
    INDEX `payments_invoiceId_idx`(`invoiceId`),
    INDEX `payments_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipts` (
    `id` VARCHAR(191) NOT NULL,
    `receiptNumber` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KES',
    `balanceAfter` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `receipts_receiptNumber_key`(`receiptNumber`),
    UNIQUE INDEX `receipts_paymentId_key`(`paymentId`),
    INDEX `receipts_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_notes` (
    `id` VARCHAR(191) NOT NULL,
    `creditNoteNumber` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KES',
    `reason` TEXT NULL,
    `status` ENUM('ISSUED', 'APPLIED', 'VOIDED') NOT NULL DEFAULT 'ISSUED',
    `amountApplied` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `credit_notes_creditNoteNumber_key`(`creditNoteNumber`),
    INDEX `credit_notes_invoiceId_idx`(`invoiceId`),
    INDEX `credit_notes_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_note_items` (
    `id` VARCHAR(191) NOT NULL,
    `creditNoteId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(15, 2) NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trips` (
    `id` VARCHAR(191) NOT NULL,
    `tripNumber` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `destination` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `assignedStaffId` VARCHAR(191) NULL,
    `status` ENUM('PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `estimatedRevenue` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `estimatedCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `actualRevenue` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `actualCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KES',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trips_tripNumber_key`(`tripNumber`),
    INDEX `trips_clientId_idx`(`clientId`),
    INDEX `trips_status_idx`(`status`),
    INDEX `trips_startDate_idx`(`startDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trip_participants` (
    `id` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `idNumber` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `nationality` VARCHAR(191) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `emergencyContact` VARCHAR(191) NULL,
    `specialRequirements` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `trip_participants_tripId_idx`(`tripId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trip_expenses` (
    `id` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `vendor` VARCHAR(191) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KES',
    `exchangeRate` DECIMAL(15, 6) NOT NULL DEFAULT 1,
    `baseAmount` DECIMAL(15, 2) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `trip_expenses_tripId_idx`(`tripId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itineraries` (
    `id` VARCHAR(191) NOT NULL,
    `itineraryNumber` VARCHAR(191) NOT NULL,
    `tripName` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NULL,
    `departureDate` DATETIME(3) NOT NULL,
    `returnDate` DATETIME(3) NOT NULL,
    `departureLocation` VARCHAR(191) NULL,
    `pickupLocation` VARCHAR(191) NULL,
    `destination` VARCHAR(191) NOT NULL,
    `numTravellers` INTEGER NOT NULL DEFAULT 1,
    `introduction` LONGTEXT NULL,
    `inclusiveOf` TEXT NULL,
    `exclusiveOf` TEXT NULL,
    `importantInfo` TEXT NULL,
    `termsConditions` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `itineraries_itineraryNumber_key`(`itineraryNumber`),
    INDEX `itineraries_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itinerary_days` (
    `id` VARCHAR(191) NOT NULL,
    `itineraryId` VARCHAR(191) NOT NULL,
    `dayNumber` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `date` DATETIME(3) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `itinerary_days_itineraryId_idx`(`itineraryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itinerary_activities` (
    `id` VARCHAR(191) NOT NULL,
    `dayId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `time` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `type` ENUM('ACTIVITY', 'ACCOMMODATION', 'MEALS', 'TRANSPORT', 'FLIGHT', 'OTHER') NOT NULL DEFAULT 'ACTIVITY',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `itinerary_activities_dayId_idx`(`dayId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vouchers` (
    `id` VARCHAR(191) NOT NULL,
    `voucherNumber` VARCHAR(191) NOT NULL,
    `type` ENUM('HOTEL', 'TRANSFER', 'SERVICE') NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `tripId` VARCHAR(191) NULL,
    `guestNames` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vouchers_voucherNumber_key`(`voucherNumber`),
    INDEX `vouchers_clientId_idx`(`clientId`),
    INDEX `vouchers_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hotel_vouchers` (
    `id` VARCHAR(191) NOT NULL,
    `voucherId` VARCHAR(191) NOT NULL,
    `hotel` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `checkIn` DATETIME(3) NOT NULL,
    `checkOut` DATETIME(3) NOT NULL,
    `nights` INTEGER NOT NULL,
    `roomType` VARCHAR(191) NULL,
    `rooms` INTEGER NOT NULL DEFAULT 1,
    `mealPlan` VARCHAR(191) NULL,
    `bookingReference` VARCHAR(191) NULL,
    `specialRequests` TEXT NULL,

    UNIQUE INDEX `hotel_vouchers_voucherId_key`(`voucherId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transfer_vouchers` (
    `id` VARCHAR(191) NOT NULL,
    `voucherId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `pickupTime` VARCHAR(191) NULL,
    `pickupLocation` VARCHAR(191) NOT NULL,
    `dropoffLocation` VARCHAR(191) NOT NULL,
    `vehicleType` VARCHAR(191) NULL,
    `vehicleRegistration` VARCHAR(191) NULL,
    `driverName` VARCHAR(191) NULL,
    `driverPhone` VARCHAR(191) NULL,
    `fare` DECIMAL(15, 2) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KES',
    `passengers` INTEGER NOT NULL DEFAULT 1,
    `flightOrTrainDetails` TEXT NULL,
    `instructions` TEXT NULL,

    UNIQUE INDEX `transfer_vouchers_voucherId_key`(`voucherId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `voucher_services` (
    `id` VARCHAR(191) NOT NULL,
    `voucherId` VARCHAR(191) NOT NULL,
    `serviceType` ENUM('HOTEL', 'FLIGHT', 'TRANSFER', 'TRAIN', 'OTHER') NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NULL,
    `location` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `voucher_services_voucherId_idx`(`voucherId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_settings` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT 'TuaVois Travel',
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `website` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KES',
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 16,
    `taxName` VARCHAR(191) NOT NULL DEFAULT 'VAT',
    `kraPin` VARCHAR(191) NULL,
    `bankDetails` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `currencies` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `currencies_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exchange_rates` (
    `id` VARCHAR(191) NOT NULL,
    `currencyId` VARCHAR(191) NOT NULL,
    `rateToBase` DECIMAL(15, 6) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exchange_rates_currencyId_idx`(`currencyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `type` ENUM('INFO', 'WARNING', 'SUCCESS', 'ERROR', 'PAYMENT', 'TRIP', 'INVOICE', 'QUOTATION') NOT NULL DEFAULT 'INFO',
    `read` BOOLEAN NOT NULL DEFAULT false,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_read_idx`(`userId`, `read`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `changes` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_entity_idx`(`entity`),
    INDEX `audit_logs_entityId_idx`(`entityId`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_assignedStaffId_fkey` FOREIGN KEY (`assignedStaffId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `prospects` ADD CONSTRAINT `prospects_assignedStaffId_fkey` FOREIGN KEY (`assignedStaffId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `trips`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_receivedById_fkey` FOREIGN KEY (`receivedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_notes` ADD CONSTRAINT `credit_notes_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_notes` ADD CONSTRAINT `credit_notes_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_note_items` ADD CONSTRAINT `credit_note_items_creditNoteId_fkey` FOREIGN KEY (`creditNoteId`) REFERENCES `credit_notes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trips` ADD CONSTRAINT `trips_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trips` ADD CONSTRAINT `trips_assignedStaffId_fkey` FOREIGN KEY (`assignedStaffId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trip_participants` ADD CONSTRAINT `trip_participants_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `trips`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trip_expenses` ADD CONSTRAINT `trip_expenses_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `trips`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itineraries` ADD CONSTRAINT `itineraries_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itineraries` ADD CONSTRAINT `itineraries_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `trips`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itinerary_days` ADD CONSTRAINT `itinerary_days_itineraryId_fkey` FOREIGN KEY (`itineraryId`) REFERENCES `itineraries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itinerary_activities` ADD CONSTRAINT `itinerary_activities_dayId_fkey` FOREIGN KEY (`dayId`) REFERENCES `itinerary_days`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vouchers` ADD CONSTRAINT `vouchers_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vouchers` ADD CONSTRAINT `vouchers_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `trips`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_vouchers` ADD CONSTRAINT `hotel_vouchers_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `vouchers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transfer_vouchers` ADD CONSTRAINT `transfer_vouchers_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `vouchers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `voucher_services` ADD CONSTRAINT `voucher_services_voucherId_fkey` FOREIGN KEY (`voucherId`) REFERENCES `vouchers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exchange_rates` ADD CONSTRAINT `exchange_rates_currencyId_fkey` FOREIGN KEY (`currencyId`) REFERENCES `currencies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
