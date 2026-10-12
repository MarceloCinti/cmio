-- AlterTable
ALTER TABLE "outbound_messages" ADD COLUMN     "deliveryStatus" TEXT;

-- CreateIndex
CREATE INDEX "outbound_messages_providerMessageId_idx" ON "outbound_messages"("providerMessageId");
