-- P0: MySQL transactions and foreign keys require a transactional storage engine.
-- WAMP installations may default to MyISAM, which silently defeats rollback and
-- serializable concurrency guarantees. Convert every application table to InnoDB.
ALTER TABLE `audit_logs` ENGINE=InnoDB;
ALTER TABLE `clients` ENGINE=InnoDB;
ALTER TABLE `company_settings` ENGINE=InnoDB;
ALTER TABLE `credit_note_items` ENGINE=InnoDB;
ALTER TABLE `credit_notes` ENGINE=InnoDB;
ALTER TABLE `currencies` ENGINE=InnoDB;
ALTER TABLE `document_sequences` ENGINE=InnoDB;
ALTER TABLE `documents` ENGINE=InnoDB;
ALTER TABLE `exchange_rates` ENGINE=InnoDB;
ALTER TABLE `hotel_vouchers` ENGINE=InnoDB;
ALTER TABLE `invoice_items` ENGINE=InnoDB;
ALTER TABLE `invoices` ENGINE=InnoDB;
ALTER TABLE `itineraries` ENGINE=InnoDB;
ALTER TABLE `itinerary_activities` ENGINE=InnoDB;
ALTER TABLE `itinerary_days` ENGINE=InnoDB;
ALTER TABLE `notifications` ENGINE=InnoDB;
ALTER TABLE `payments` ENGINE=InnoDB;
ALTER TABLE `permissions` ENGINE=InnoDB;
ALTER TABLE `prospects` ENGINE=InnoDB;
ALTER TABLE `quotation_items` ENGINE=InnoDB;
ALTER TABLE `quotations` ENGINE=InnoDB;
ALTER TABLE `receipts` ENGINE=InnoDB;
ALTER TABLE `role_permissions` ENGINE=InnoDB;
ALTER TABLE `roles` ENGINE=InnoDB;
ALTER TABLE `transfer_vouchers` ENGINE=InnoDB;
ALTER TABLE `trip_expenses` ENGINE=InnoDB;
ALTER TABLE `trip_participants` ENGINE=InnoDB;
ALTER TABLE `trips` ENGINE=InnoDB;
ALTER TABLE `users` ENGINE=InnoDB;
ALTER TABLE `voucher_services` ENGINE=InnoDB;
ALTER TABLE `vouchers` ENGINE=InnoDB;
