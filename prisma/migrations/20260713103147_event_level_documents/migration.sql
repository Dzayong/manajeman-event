-- AlterTable
ALTER TABLE `document` ADD COLUMN `eventId` INTEGER NULL,
    MODIFY `divisionId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Document_eventId_idx` ON `Document`(`eventId`);

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
