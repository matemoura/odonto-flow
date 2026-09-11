import { PortalController } from "./portal.controller";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUser } from "../../common/decorators/current-user.decorator";

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    appointment: { findMany: jest.fn() },
    ...overrides,
  } as unknown as PrismaService;
}

function fakeUser(patientId: string): AuthenticatedUser {
  return { userId: "user-1", email: "paciente@example.com", memberships: [], patientId };
}

describe("PortalController.myAppointments", () => {
  it("separa a próxima consulta futura das consultas passadas, sem misturar canceladas", async () => {
    const prisma = fakePrisma();
    const now = Date.now();
    const future1 = new Date(now + 2 * 24 * 60 * 60 * 1000);
    const future2 = new Date(now + 5 * 24 * 60 * 60 * 1000);
    const pastDone = new Date(now - 3 * 24 * 60 * 60 * 1000);
    const futureCancelled = new Date(now + 1 * 24 * 60 * 60 * 1000);

    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
      { id: "a-future-2", startAt: future2, status: "SCHEDULED" },
      { id: "a-future-1", startAt: future1, status: "CONFIRMED" },
      { id: "a-past", startAt: pastDone, status: "COMPLETED" },
      { id: "a-future-cancelled", startAt: futureCancelled, status: "CANCELLED" },
    ]);

    const controller = new PortalController(prisma);
    const result = await controller.myAppointments("clinic-1", fakeUser("patient-1"));

    expect(result.upcoming?.id).toBe("a-future-1");
    expect(result.history.map((a) => a.id)).toEqual(["a-past"]);
  });

  it("retorna upcoming null quando não há nenhuma consulta futura não cancelada", async () => {
    const prisma = fakePrisma();
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
      { id: "a-past", startAt: new Date(Date.now() - 86_400_000), status: "COMPLETED" },
    ]);

    const controller = new PortalController(prisma);
    const result = await controller.myAppointments("clinic-1", fakeUser("patient-1"));

    expect(result.upcoming).toBeNull();
    expect(result.history.map((a) => a.id)).toEqual(["a-past"]);
  });
});
