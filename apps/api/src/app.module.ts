import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { PrismaModule } from "./database/prisma.module";
import { TenantContextMiddleware } from "./common/middleware/tenant-context.middleware";
import { AuthModule } from "./modules/auth/auth.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { ProfessionalsModule } from "./modules/professionals/professionals.module";
import { TeamModule } from "./modules/team/team.module";
import { SchedulingModule } from "./modules/scheduling/scheduling.module";
import { ClinicalRecordsModule } from "./modules/clinical-records/clinical-records.module";
import { BudgetsModule } from "./modules/budgets/budgets.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { CertificatesModule } from "./modules/certificates/certificates.module";
import { PrescriptionsModule } from "./modules/prescriptions/prescriptions.module";
import { PlatformAdminModule } from "./modules/platform-admin/platform-admin.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { PortalModule } from "./modules/portal/portal.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { CrmModule } from "./modules/crm/crm.module";
import { ReferralsModule } from "./modules/referrals/referrals.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";
import { OrthodonticsModule } from "./modules/orthodontics/orthodontics.module";
import { FaceogramModule } from "./modules/faceogram/faceogram.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { SignupModule } from "./modules/signup/signup.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Limite geral por IP; rotas sensíveis (login, agendamento público,
    // webhook do WhatsApp) têm limites mais apertados via @Throttle(...).
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    PatientsModule,
    ProfessionalsModule,
    TeamModule,
    SchedulingModule,
    ClinicalRecordsModule,
    BudgetsModule,
    InventoryModule,
    CertificatesModule,
    PrescriptionsModule,
    PlatformAdminModule,
    DashboardModule,
    DocumentsModule,
    PortalModule,
    FinanceModule,
    CrmModule,
    ReferralsModule,
    IntegrationsModule,
    OrthodonticsModule,
    FaceogramModule,
    OrganizationsModule,
    SignupModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes("*");
  }
}
