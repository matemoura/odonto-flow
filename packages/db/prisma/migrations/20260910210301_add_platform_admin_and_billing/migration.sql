-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "lastPaymentAt" TIMESTAMP(3),
ADD COLUMN     "manuallySuspendedAt" TIMESTAMP(3),
ADD COLUMN     "manuallySuspendedReason" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "delinquencyGracePeriodDays" INTEGER NOT NULL DEFAULT 14,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);
