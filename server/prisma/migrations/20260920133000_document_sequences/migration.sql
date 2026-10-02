CREATE TABLE `document_sequences` (
    `key` VARCHAR(191) NOT NULL,
    `nextValue` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
