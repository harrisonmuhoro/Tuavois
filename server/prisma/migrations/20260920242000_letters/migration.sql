CREATE TABLE `letters` (
  `id` VARCHAR(191) NOT NULL,
  `letterName` VARCHAR(200) NOT NULL,
  `details` TEXT NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `letters_createdById_idx` (`createdById`),
  INDEX `letters_createdAt_idx` (`createdAt`),
  CONSTRAINT `letters_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
