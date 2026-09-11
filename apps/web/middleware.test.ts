import { isExpiringSoon } from "./middleware";

function fakeToken(exp: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `${header}.${payload}.`;
}

describe("isExpiringSoon", () => {
  it("é true para um token já expirado", () => {
    expect(isExpiringSoon(fakeToken(Math.floor(Date.now() / 1000) - 10))).toBe(true);
  });

  it("é true para um token expirando em menos de 5 minutos", () => {
    expect(isExpiringSoon(fakeToken(Math.floor(Date.now() / 1000) + 60))).toBe(true);
  });

  it("é false para um token com bastante tempo restante", () => {
    expect(isExpiringSoon(fakeToken(Math.floor(Date.now() / 1000) + 3600))).toBe(false);
  });

  it("trata um token ilegível como expirado (renova por segurança)", () => {
    expect(isExpiringSoon("token-quebrado")).toBe(true);
  });
});
