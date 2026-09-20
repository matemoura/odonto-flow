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


/**
 * A renovação silenciosa regrava o cookie do JWT. Escrita à mão, ela perdia o
 * `secure` — e como a renovação acontece no máximo 1h depois do login, TODO
 * usuário de produção terminava com o token sem a flag, trafegando em texto
 * claro em qualquer requisição que caísse em HTTP.
 *
 * O teste afirma que as opções gravadas são as MESMAS de `SESSION_COOKIE_BASE`,
 * e não que `secure` é true: sob o `next/jest`, `NODE_ENV` fica preso em
 * "test", então `secure` seria false aqui de qualquer jeito. Comparar com a
 * base é o que de fato pega a regressão — o bug foi as duas escritas do mesmo
 * cookie divergirem.
 */
describe("middleware — opções do cookie na renovação", () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock("./lib/api");
  });

  it("grava o cookie com as mesmas opções do login, não com as suas próprias", async () => {
    jest.resetModules();
    jest.doMock("./lib/api", () => ({
      refreshStaffSession: jest.fn().mockResolvedValue({ accessToken: "token-novo" }),
    }));

    const { middleware } = await import("./middleware");
    const { SESSION_COOKIE_BASE, SESSION_COOKIE_NAMES, STAFF_ACCESS_COOKIE_MAX_AGE } = await import(
      "./lib/session"
    );
    const { NextRequest } = await import("next/server");

    const request = new NextRequest("https://app.exemplo/painel");
    request.cookies.set(SESSION_COOKIE_NAMES.staffToken, fakeToken(Math.floor(Date.now() / 1000) - 10));
    request.cookies.set(SESSION_COOKIE_NAMES.staffRefresh, "refresh-valido");
    request.cookies.set(SESSION_COOKIE_NAMES.staffClinic, "vila-nova");

    const response = await middleware(request);
    const cookie = response.cookies.get(SESSION_COOKIE_NAMES.staffToken);

    expect(cookie?.value).toBe("token-novo");
    expect(cookie).toMatchObject({
      ...SESSION_COOKIE_BASE,
      maxAge: STAFF_ACCESS_COOKIE_MAX_AGE,
    });
  });

  it("SESSION_COOKIE_BASE liga secure só em produção", async () => {
    const { SESSION_COOKIE_BASE } = await import("./lib/session");
    expect(SESSION_COOKIE_BASE.secure).toBe(process.env.NODE_ENV === "production");
    expect(SESSION_COOKIE_BASE.httpOnly).toBe(true);
    expect(SESSION_COOKIE_BASE.sameSite).toBe("lax");
  });
});
