import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import { InventoryService } from "./inventory.service";

function formatCents(cents: number) {
  return cents / 100;
}

@Injectable()
export class InventoryReportService {
  constructor(private readonly inventory: InventoryService) {}

  /** Gera a planilha do relatório de estoque por período (entradas/saídas/reservas/consumo + situação atual). */
  async buildReportWorkbook(clinicId: string, from: string, to: string): Promise<ExcelJS.Buffer> {
    const report = await this.inventory.getReport(clinicId, from, to);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Odonto Flow";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Estoque por período");
    sheet.columns = [
      { header: "Item", key: "name", width: 26 },
      { header: "Unidade", key: "unit", width: 10 },
      { header: "Entradas", key: "manualIn", width: 12 },
      { header: "Custo entradas (R$)", key: "manualInCost", width: 16 },
      { header: "Saídas manuais", key: "manualOut", width: 14 },
      { header: "Reservado", key: "reserved", width: 12 },
      { header: "Liberado", key: "released", width: 12 },
      { header: "Consumido", key: "consumed", width: 12 },
      { header: "Custo consumido (R$)", key: "consumedCost", width: 16 },
      { header: "Em estoque hoje", key: "onHand", width: 14 },
      { header: "Mínimo", key: "min", width: 10 },
      { header: "Precisa repor", key: "needsRestock", width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const item of report.items) {
      sheet.addRow({
        name: item.name,
        unit: item.unit,
        manualIn: item.manualInQuantity,
        manualInCost: formatCents(item.manualInCostCents),
        manualOut: item.manualOutQuantity,
        reserved: item.reservedQuantity,
        released: item.releasedQuantity,
        consumed: item.consumedQuantity,
        consumedCost: formatCents(item.consumedCostCents),
        onHand: item.currentQuantityOnHand,
        min: item.minQuantity,
        needsRestock: item.needsRestock ? "Sim" : "",
      });
    }

    sheet.addRow({});
    const totalsRow = sheet.addRow({
      name: "Total",
      manualIn: report.totals.manualInQuantity,
      manualInCost: formatCents(report.totals.manualInCostCents),
      manualOut: report.totals.manualOutQuantity,
      reserved: report.totals.reservedQuantity,
      released: report.totals.releasedQuantity,
      consumed: report.totals.consumedQuantity,
      consumedCost: formatCents(report.totals.consumedCostCents),
    });
    totalsRow.font = { bold: true };

    sheet.getColumn("manualInCost").numFmt = "#,##0.00";
    sheet.getColumn("consumedCost").numFmt = "#,##0.00";

    return workbook.xlsx.writeBuffer();
  }
}
