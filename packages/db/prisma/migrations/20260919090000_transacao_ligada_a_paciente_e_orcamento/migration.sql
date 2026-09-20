-- De quem é o dinheiro e de onde ele veio.
--
-- Sem isso não havia como ligar um lançamento a uma pessoa: a NFS-e saía com
-- CPF fixo "00000000000" porque o dado não existia, e aprovar um orçamento não
-- tinha como virar contas a receber sem gerar duplicata a cada reaprovação.
ALTER TABLE "transactions" ADD COLUMN "patientId" TEXT;
ALTER TABLE "transactions" ADD COLUMN "budgetId" TEXT;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_budgetId_fkey"
  FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Usado para saber se um orçamento já gerou as parcelas dele.
CREATE INDEX "transactions_budgetId_idx" ON "transactions"("budgetId");
