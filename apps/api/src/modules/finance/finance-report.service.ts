import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import { PaymentMethod } from "@odontoflow/db";
import { FinanceService } from "./finance.service";

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "PIX",
  CARD: "Cartão",
  CASH: "Dinheiro",
};

@Injectable()
export class FinanceReportService {
  constructor(private readonly finance: FinanceService) {}

  /** Gera a planilha de fluxo de caixa do período — "relatórios em Excel" do plano (Fase 2). */
  async buildCashFlowWorkbook(clinicId: string, from: string, to: string): Promise<ExcelJS.Buffer> {
    const [transactions, summary] = await Promise.all([
      this.finance.listTransactions(clinicId, from, to),
      this.finance.getCashFlowSummary(clinicId, from, to),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Dentista";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Fluxo de caixa");
    sheet.columns = [
      { header: "Vencimento", key: "dueDate", width: 14 },
      { header: "Tipo", key: "type", width: 12 },
      { header: "Categoria", key: "category", width: 22 },
      { header: "Descrição", key: "description", width: 30 },
      { header: "Profissional", key: "professional", width: 22 },
      { header: "Valor (R$)", key: "amount", width: 14 },
      { header: "Pago em", key: "paidAt", width: 14 },
      { header: "Forma de pagamento", key: "paymentMethod", width: 20 },
      { header: "Parcela", key: "installment", width: 10 },
      { header: "Taxa (R$)", key: "fee", width: 12 },
      { header: "Líquido (R$)", key: "net", width: 14 },
      { header: "Crédito em", key: "settledAt", width: 14 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const t of transactions) {
      sheet.addRow({
        dueDate: t.dueDate.toISOString().slice(0, 10),
        type: t.type === "INCOME" ? "Receita" : "Despesa",
        category: t.category,
        description: t.description ?? "",
        professional: t.professional?.user.name ?? "",
        amount: t.amountCents / 100,
        paidAt: t.paidAt ? t.paidAt.toISOString().slice(0, 10) : "",
        paymentMethod: t.paymentMethod ? PAYMENT_METHOD_LABEL[t.paymentMethod] : "",
        installment: t.installmentTotal ? `${t.installmentNumber}/${t.installmentTotal}` : "",
        fee: t.feeCents / 100,
        net: t.paidAt ? (t.amountCents - t.feeCents) / 100 : "",
        settledAt: t.settledAt ? t.settledAt.toISOString().slice(0, 10) : "",
      });
    }

    sheet.addRow({});
    const totalsStartRow = sheet.lastRow!.number + 1;
    sheet.addRow({ category: "Total recebido", amount: summary.totalIncomeCents / 100 });
    sheet.addRow({ category: "Total pago (despesas)", amount: summary.totalExpenseCents / 100 });
    sheet.addRow({ category: "Saldo", amount: summary.balanceCents / 100 });
    sheet.addRow({ category: "A receber (pendente)", amount: summary.pendingIncomeCents / 100 });
    sheet.addRow({ category: "A pagar (pendente)", amount: summary.pendingExpenseCents / 100 });
    for (let row = totalsStartRow; row <= sheet.lastRow!.number; row++) {
      sheet.getCell(`C${row}`).font = { bold: true };
      sheet.getCell(`F${row}`).numFmt = "#,##0.00";
    }
    sheet.getColumn("amount").numFmt = "#,##0.00";

    return workbook.xlsx.writeBuffer();
  }
}
