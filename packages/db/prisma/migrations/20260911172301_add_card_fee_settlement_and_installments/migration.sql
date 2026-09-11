-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "cardFeeBasisPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cardSettlementDays" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "feeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "installmentNumber" INTEGER,
ADD COLUMN     "installmentTotal" INTEGER,
ADD COLUMN     "settledAt" TIMESTAMP(3);
