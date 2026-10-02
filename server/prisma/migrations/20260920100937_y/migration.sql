-- DropIndex
DROP INDEX `clients_assignedStaffId_fkey` ON `clients`;

-- DropIndex
DROP INDEX `credit_note_items_creditNoteId_fkey` ON `credit_note_items`;

-- DropIndex
DROP INDEX `invoices_createdById_fkey` ON `invoices`;

-- DropIndex
DROP INDEX `invoices_tripId_fkey` ON `invoices`;

-- DropIndex
DROP INDEX `itineraries_tripId_fkey` ON `itineraries`;

-- DropIndex
DROP INDEX `payments_receivedById_fkey` ON `payments`;

-- DropIndex
DROP INDEX `prospects_assignedStaffId_fkey` ON `prospects`;

-- DropIndex
DROP INDEX `quotations_createdById_fkey` ON `quotations`;

-- DropIndex
DROP INDEX `trips_assignedStaffId_fkey` ON `trips`;

-- DropIndex
DROP INDEX `users_roleId_fkey` ON `users`;

-- DropIndex
DROP INDEX `vouchers_tripId_fkey` ON `vouchers`;

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
