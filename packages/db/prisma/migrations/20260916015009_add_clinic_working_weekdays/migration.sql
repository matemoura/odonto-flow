-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "workingWeekdays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[];
