-- AlterTable
ALTER TABLE "anamnesis_forms" ADD COLUMN     "consentSignature" TEXT,
ADD COLUMN     "consentSignedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "editedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "treatment_plan_option_items" (
    "id" TEXT NOT NULL,
    "treatmentPlanOptionId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,

    CONSTRAINT "treatment_plan_option_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "treatment_plan_option_items" ADD CONSTRAINT "treatment_plan_option_items_treatmentPlanOptionId_fkey" FOREIGN KEY ("treatmentPlanOptionId") REFERENCES "treatment_plan_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plan_option_items" ADD CONSTRAINT "treatment_plan_option_items_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
