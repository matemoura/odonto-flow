-- AlterTable
ALTER TABLE "clinical_records" ADD COLUMN     "patientSignature" TEXT,
ADD COLUMN     "patientSignedAt" TIMESTAMP(3),
ADD COLUMN     "professionalSignature" TEXT,
ADD COLUMN     "professionalSignedAt" TIMESTAMP(3);
