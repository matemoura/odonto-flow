-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "labelId" TEXT;

-- CreateTable
CREATE TABLE "appointment_labels" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_labels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appointment_labels_clinicId_idx" ON "appointment_labels"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_labels_clinicId_name_key" ON "appointment_labels"("clinicId", "name");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "appointment_labels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_labels" ADD CONSTRAINT "appointment_labels_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
