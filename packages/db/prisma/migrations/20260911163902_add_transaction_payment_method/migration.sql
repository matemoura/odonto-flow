-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CARD', 'CASH');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "paymentMethod" "PaymentMethod";
