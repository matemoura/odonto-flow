-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "addressCity" TEXT,
ADD COLUMN     "addressComplement" TEXT,
ADD COLUMN     "addressNeighborhood" TEXT,
ADD COLUMN     "addressNumber" TEXT,
ADD COLUMN     "addressState" TEXT,
ADD COLUMN     "addressStreet" TEXT,
ADD COLUMN     "addressZip" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "emergencyContactRelationship" TEXT,
ADD COLUMN     "rg" TEXT;

-- CreateTable
CREATE TABLE "periodontal_entries" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "toothNumber" INTEGER NOT NULL,
    "probingDepthBuccalMesial" INTEGER,
    "probingDepthBuccalCentral" INTEGER,
    "probingDepthBuccalDistal" INTEGER,
    "probingDepthLingualMesial" INTEGER,
    "probingDepthLingualCentral" INTEGER,
    "probingDepthLingualDistal" INTEGER,
    "mobility" INTEGER,
    "recession" INTEGER,
    "bleeding" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "periodontal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anamnesis_forms" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "chiefComplaint" TEXT,
    "expectedOutcome" TEXT,
    "hasHypertension" BOOLEAN NOT NULL DEFAULT false,
    "hasDiabetes" BOOLEAN NOT NULL DEFAULT false,
    "hasHeartCondition" BOOLEAN NOT NULL DEFAULT false,
    "hasBleedingDisorder" BOOLEAN NOT NULL DEFAULT false,
    "isPregnant" BOOLEAN NOT NULL DEFAULT false,
    "isSmoker" BOOLEAN NOT NULL DEFAULT false,
    "hasAllergies" BOOLEAN NOT NULL DEFAULT false,
    "allergyDetails" TEXT,
    "currentMedications" TEXT,
    "previousSurgeries" TEXT,
    "otherHealthNotes" TEXT,
    "brushingFrequencyPerDay" INTEGER,
    "flossesRegularly" BOOLEAN NOT NULL DEFAULT false,
    "usesMouthwash" BOOLEAN NOT NULL DEFAULT false,
    "hasBruxism" BOOLEAN NOT NULL DEFAULT false,
    "oralHygieneNotes" TEXT,
    "treatmentConsentAt" TIMESTAMP(3),
    "imageUseConsentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anamnesis_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_plan_options" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedCostCents" INTEGER,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treatment_plan_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "periodontal_entries_clinicId_patientId_toothNumber_idx" ON "periodontal_entries"("clinicId", "patientId", "toothNumber");

-- CreateIndex
CREATE UNIQUE INDEX "anamnesis_forms_patientId_key" ON "anamnesis_forms"("patientId");

-- CreateIndex
CREATE INDEX "treatment_plan_options_clinicId_patientId_idx" ON "treatment_plan_options"("clinicId", "patientId");

-- AddForeignKey
ALTER TABLE "periodontal_entries" ADD CONSTRAINT "periodontal_entries_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodontal_entries" ADD CONSTRAINT "periodontal_entries_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnesis_forms" ADD CONSTRAINT "anamnesis_forms_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anamnesis_forms" ADD CONSTRAINT "anamnesis_forms_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plan_options" ADD CONSTRAINT "treatment_plan_options_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plan_options" ADD CONSTRAINT "treatment_plan_options_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plan_options" ADD CONSTRAINT "treatment_plan_options_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
