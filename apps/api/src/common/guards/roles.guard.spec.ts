import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

function fakeContext(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
}

function fakeReflector(requiredRoles: string[] | undefined): Reflector {
  return { getAllAndOverride: jest.fn().mockReturnValue(requiredRoles) } as unknown as Reflector;
}

describe("RolesGuard", () => {
  it("libera a rota quando nenhum @Roles() foi declarado", () => {
    const guard = new RolesGuard(fakeReflector(undefined));
    const context = fakeContext({ tenantId: "clinic-1", user: undefined });

    expect(guard.canActivate(context)).toBe(true);
  });

  it("recusa quando o usuário não tem membership na clínica resolvida (request.tenantId)", () => {
    const guard = new RolesGuard(fakeReflector(["CLINIC_ADMIN"]));
    const context = fakeContext({
      tenantId: "clinic-1",
      user: { memberships: [{ clinicId: "clinic-2", role: "CLINIC_ADMIN" }] },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("recusa quando o papel do usuário nesta clínica não está na lista exigida", () => {
    const guard = new RolesGuard(fakeReflector(["CLINIC_ADMIN"]));
    const context = fakeContext({
      tenantId: "clinic-1",
      user: { memberships: [{ clinicId: "clinic-1", role: "DENTIST" }] },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("libera quando o papel do usuário nesta clínica está na lista exigida", () => {
    const guard = new RolesGuard(fakeReflector(["CLINIC_ADMIN", "ORG_ADMIN"]));
    const context = fakeContext({
      tenantId: "clinic-1",
      user: { memberships: [{ clinicId: "clinic-1", role: "ORG_ADMIN" }] },
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
