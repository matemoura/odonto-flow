import { ehDentista, papelNaClinica, PAPEIS_CLINICOS } from "./dentist-scope.util";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";

function usuario(memberships: Array<{ clinicId: string; role: string }>): AuthenticatedUser {
  return { userId: "u1", email: "a@b.com", memberships };
}

describe("papelNaClinica", () => {
  it("usa o papel da clínica pedida, não o da primeira membership", () => {
    const user = usuario([
      { clinicId: "clinic-1", role: "CLINIC_ADMIN" },
      { clinicId: "clinic-2", role: "DENTIST" },
    ]);

    expect(papelNaClinica(user, "clinic-1")).toBe("CLINIC_ADMIN");
    expect(papelNaClinica(user, "clinic-2")).toBe("DENTIST");
  });

  it("devolve undefined em clínica onde o usuário não tem acesso", () => {
    expect(papelNaClinica(usuario([{ clinicId: "clinic-1", role: "DENTIST" }]), "clinic-x")).toBeUndefined();
  });
});

describe("ehDentista", () => {
  it("é dentista só na clínica em que o cargo é DENTIST", () => {
    const user = usuario([
      { clinicId: "clinic-1", role: "CLINIC_ADMIN" },
      { clinicId: "clinic-2", role: "DENTIST" },
    ]);

    expect(ehDentista(user, "clinic-2")).toBe(true);
    // na clínica onde ele administra, vê tudo — o escopo restrito não se aplica
    expect(ehDentista(user, "clinic-1")).toBe(false);
  });

  it("recepção e admin não entram no escopo restrito", () => {
    expect(ehDentista(usuario([{ clinicId: "c", role: "ASSISTANT" }]), "c")).toBe(false);
    expect(ehDentista(usuario([{ clinicId: "c", role: "ORG_ADMIN" }]), "c")).toBe(false);
  });
});

describe("PAPEIS_CLINICOS", () => {
  it("inclui admin — o dono da clínica também pode atender", () => {
    expect(PAPEIS_CLINICOS).toContain("CLINIC_ADMIN");
    expect(PAPEIS_CLINICOS).toContain("DENTIST");
  });

  it("não inclui recepção", () => {
    expect(PAPEIS_CLINICOS).not.toContain("ASSISTANT");
  });
});
