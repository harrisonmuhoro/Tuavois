ALTER TABLE `itineraries` ADD COLUMN `createdById` VARCHAR(191) NULL,
  ADD INDEX `itineraries_createdById_idx` (`createdById`),
  ADD CONSTRAINT `itineraries_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `itinerary_templates` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `destination` VARCHAR(191) NOT NULL,
  `numTravellers` INTEGER NOT NULL DEFAULT 1,
  `introduction` LONGTEXT NULL,
  `inclusiveOf` TEXT NULL,
  `exclusiveOf` TEXT NULL,
  `importantInfo` TEXT NULL,
  `termsConditions` TEXT NULL,
  `days` JSON NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `itinerary_templates_createdById_idx` (`createdById`),
  CONSTRAINT `itinerary_templates_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
