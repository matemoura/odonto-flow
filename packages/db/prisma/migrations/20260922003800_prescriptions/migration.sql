-- CreateEnum
CREATE TYPE "MedicationClass" AS ENUM ('ANALGESIC', 'NSAID', 'CORTICOSTEROID', 'ANTIBIOTIC', 'ANTISEPTIC');

-- CreateEnum
CREATE TYPE "RiskFlag" AS ENUM ('HYPERTENSION', 'DIABETES', 'HEART_CONDITION', 'BLEEDING_DISORDER', 'PREGNANT', 'CHRONIC_KIDNEY_DISEASE', 'CANCER_OR_IMMUNOSUPPRESSION');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('CAUTION', 'AVOID');

-- AlterTable
ALTER TABLE "anamnesis_forms" ADD COLUMN     "hasCancerOrImmunosuppression" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasChronicKidneyDisease" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class" "MedicationClass" NOT NULL,
    "defaultPosology" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_risk_notes" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "riskFlag" "RiskFlag" NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "note" TEXT NOT NULL,

    CONSTRAINT "medication_risk_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedure_prescription_items" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "medicationId" TEXT,
    "customName" TEXT,
    "posology" TEXT NOT NULL,
    "instructions" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "procedureId" TEXT,
    "notes" TEXT,
    "riskWarningsShown" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "posology" TEXT NOT NULL,
    "instructions" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medication_risk_notes_medicationId_riskFlag_key" ON "medication_risk_notes"("medicationId", "riskFlag");

-- CreateIndex
CREATE INDEX "procedure_prescription_items_procedureId_idx" ON "procedure_prescription_items"("procedureId");

-- CreateIndex
CREATE INDEX "prescriptions_clinicId_patientId_idx" ON "prescriptions"("clinicId", "patientId");

-- AddForeignKey
ALTER TABLE "medication_risk_notes" ADD CONSTRAINT "medication_risk_notes_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_prescription_items" ADD CONSTRAINT "procedure_prescription_items_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedure_prescription_items" ADD CONSTRAINT "procedure_prescription_items_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
