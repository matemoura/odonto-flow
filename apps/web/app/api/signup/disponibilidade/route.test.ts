import { NextRequest } from "next/server";
import { GET } from "./route";
import { checkSlugAvailability } from "../../../../lib/api";

jest.mock("../../../../lib/api", () => ({ checkSlugAvailability: jest.fn() }));

const checar = checkSlugAvailability as jest.MockedFunction<typeof checkSlugAvailability>;

function pedido(slug: string) {
  return new NextRequest(`http://localhost:3000/api/signup/disponibilidade?slug=${slug}`);
}

describe("GET /api/signup/disponibilidade", () => {
  beforeEach(() => checar.mockReset());

  it("repassa a resposta da API quando o link está livre", async () => {
    checar.mockResolvedValue({ available: true });

    const res = await GET(pedido("clinica-nova"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ available: true });
  });

  it("repassa a resposta da API quando o link está ocupado", async () => {
    checar.mockResolvedValue({ available: false });

    const res = await GET(pedido("vila-nova"));

    expect(await res.json()).toEqual({ available: false });
  });

  // Regressão: antes, a rota tinha `.catch(() => ({ available: false }))`. Com a
  // API fora do ar ela devolvia 200 dizendo que o link estava ocupado, então a
  // tela de cadastro acusava "já em uso" para QUALQUER nome que a pessoa
  // digitasse — mandando ela caçar um problema que não existia.
  it("devolve 503 quando a API não responde, e nunca available:false", async () => {
    checar.mockRejectedValue(new Error("fetch failed"));

    const res = await GET(pedido("clinica-nova"));

    expect(res.status).toBe(503);
    expect(await res.json()).not.toHaveProperty("available");
  });
});
