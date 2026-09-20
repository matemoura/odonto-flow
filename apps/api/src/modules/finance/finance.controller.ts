import { Body, Controller, Get, Param, Patch, Post, Put, Query, StreamableFile, UseGuards } from "@nestjs/common";
import { Role } from "@odontoflow/db";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../common/decorators/current-tenant.decorator";
import { FinanceService } from "./finance.service";
import { FinanceReportService } from "./finance-report.service";
import { InvoicesService } from "./invoices.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { MarkTransactionPaidDto } from "./dto/mark-transaction-paid.dto";
import { UpdateCardSettingsDto } from "./dto/update-card-settings.dto";
import { UpsertCommissionRuleDto } from "./dto/upsert-commission-rule.dto";

@Controller("finance")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.CLINIC_ADMIN, Role.ASSISTANT, Role.ORG_ADMIN)
export class FinanceController {
  constructor(
    private readonly finance: FinanceService,
    private readonly report: FinanceReportService,
    private readonly invoices: InvoicesService,
  ) {}

  @Get("transactions")
  listTransactions(@CurrentTenant() clinicId: string, @Query("from") from: string, @Query("to") to: string) {
    return this.finance.listTransactions(clinicId, from, to);
  }

  @Post("transactions")
  createTransaction(@CurrentTenant() clinicId: string, @Body() dto: CreateTransactionDto) {
    return this.finance.create(clinicId, dto);
  }

  @Patch("transactions/:id/pay")
  markPaid(
    @CurrentTenant() clinicId: string,
    @Param("id") id: string,
    @Body() dto: MarkTransactionPaidDto,
  ) {
    return this.finance.markPaid(clinicId, id, dto.paymentMethod);
  }

  @Get("card-settings")
  getCardSettings(@CurrentTenant() clinicId: string) {
    return this.finance.getCardSettings(clinicId);
  }

  @Put("card-settings")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  updateCardSettings(@CurrentTenant() clinicId: string, @Body() dto: UpdateCardSettingsDto) {
    return this.finance.updateCardSettings(clinicId, dto);
  }

  @Get("summary")
  getSummary(@CurrentTenant() clinicId: string, @Query("from") from: string, @Query("to") to: string) {
    return this.finance.getCashFlowSummary(clinicId, from, to);
  }

  @Get("commission-rules")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  listCommissionRules(@CurrentTenant() clinicId: string) {
    return this.finance.listCommissionRules(clinicId);
  }

  @Post("commission-rules/:professionalId")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  upsertCommissionRule(
    @CurrentTenant() clinicId: string,
    @Param("professionalId") professionalId: string,
    @Body() dto: UpsertCommissionRuleDto,
  ) {
    return this.finance.upsertCommissionRule(clinicId, professionalId, dto);
  }

  @Get("commission-entries")
  listCommissionEntries(
    @CurrentTenant() clinicId: string,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.finance.listCommissionEntries(clinicId, from, to);
  }

  /**
   * Fechamento do período: quanto cada profissional tem a receber.
   * Só admin — quanto um colega ganhou não é assunto da recepção.
   */
  @Get("commission-report")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  getCommissionReport(
    @CurrentTenant() clinicId: string,
    @Query("from") from: string,
    @Query("to") to: string,
  ) {
    return this.finance.getCommissionReport(clinicId, from, to);
  }

  @Get("transactions/:id/invoice")
  getInvoice(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.invoices.getForTransaction(clinicId, id);
  }

  @Post("transactions/:id/invoice")
  issueInvoice(@CurrentTenant() clinicId: string, @Param("id") id: string) {
    return this.invoices.issueForTransaction(clinicId, id);
  }

  @Get("export.xlsx")
  @Roles(Role.CLINIC_ADMIN, Role.ORG_ADMIN)
  async exportXlsx(@CurrentTenant() clinicId: string, @Query("from") from: string, @Query("to") to: string) {
    const buffer = await this.report.buildCashFlowWorkbook(clinicId, from, to);
    return new StreamableFile(Buffer.from(buffer), {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="fluxo-de-caixa-${from}-a-${to}.xlsx"`,
    });
  }
}
