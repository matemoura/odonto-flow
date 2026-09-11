import { CallHandler, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { firstValueFrom, of } from "rxjs";
import { AuditLogInterceptor } from "./audit-log.interceptor";
import { PrismaService } from "../../database/prisma.service";

function fakePrisma() {
  return { auditLog: { create: jest.fn().mockResolvedValue(undefined) } } as unknown as PrismaService;
}

function fakeReflector(entityType: string | undefined) {
  return { get: jest.fn().mockReturnValue(entityType) } as unknown as Reflector;
}

function fakeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
  } as unknown as ExecutionContext;
}

function fakeCallHandler(result: unknown): CallHandler {
  return { handle: () => of(result) };
}

describe("AuditLogInterceptor", () => {
  it("não grava nada quando o handler não tem @AuditEntity(...)", async () => {
    const prisma = fakePrisma();
    const interceptor = new AuditLogInterceptor(fakeReflector(undefined), prisma);
    const context = fakeContext({ method: "GET", tenantId: "clinic-1" });

    await firstValueFrom(interceptor.intercept(context, fakeCallHandler({ id: "x" })));

    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("não grava nada quando a requisição não tem tenantId resolvido", async () => {
    const prisma = fakePrisma();
    const interceptor = new AuditLogInterceptor(fakeReflector("Document"), prisma);
    const context = fakeContext({ method: "GET" });

    await firstValueFrom(interceptor.intercept(context, fakeCallHandler({ id: "x" })));

    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("usa o :id da rota como entityId quando presente", async () => {
    const prisma = fakePrisma();
    const interceptor = new AuditLogInterceptor(fakeReflector("Document"), prisma);
    const context = fakeContext({
      method: "GET",
      tenantId: "clinic-1",
      user: { userId: "user-1" },
      params: { id: "doc-1" },
      query: {},
    });

    await firstValueFrom(interceptor.intercept(context, fakeCallHandler({ id: "doc-1" })));

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        clinicId: "clinic-1",
        actorId: "user-1",
        entityType: "Document",
        entityId: "doc-1",
        action: "get",
        ip: undefined,
      },
    });
  });

  it("cai para o patientId da query string quando não há :id na rota (ex.: listagem)", async () => {
    const prisma = fakePrisma();
    const interceptor = new AuditLogInterceptor(fakeReflector("ClinicalRecord"), prisma);
    const context = fakeContext({
      method: "GET",
      tenantId: "clinic-1",
      params: {},
      query: { patientId: "patient-1" },
    });

    await firstValueFrom(interceptor.intercept(context, fakeCallHandler([{ id: "rec-1" }])));

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ entityId: "patient-1" }) }),
    );
  });

  it("usa 'unknown' quando não há id na rota, na query, nem no resultado", async () => {
    const prisma = fakePrisma();
    const interceptor = new AuditLogInterceptor(fakeReflector("Document"), prisma);
    const context = fakeContext({ method: "POST", tenantId: "clinic-1", params: {}, query: {} });

    await firstValueFrom(interceptor.intercept(context, fakeCallHandler({})));

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ entityId: "unknown", action: "post" }) }),
    );
  });
});
