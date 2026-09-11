-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('ATTENDANCE', 'MEDICAL');

-- CreateEnum
CREATE TYPE "CertificateBeneficiary" AS ENUM ('PATIENT', 'COMPANION');

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "beneficiary" "CertificateBeneficiary" NOT NULL DEFAULT 'PATIENT',
    "companionName" TEXT,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TEXT,
    "departureTime" TEXT,
    "daysOff" INTEGER,
    "cidCode" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certificates_clinicId_patientId_idx" ON "certificates"("clinicId", "patientId");

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
