import { ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WebhookSecretGuard } from "./webhook-secret.guard";

function contexto(headers: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as never;
}

function guard(segredoConfigurado: string | undefined) {
  const config = { get: jest.fn().mockReturnValue(segredoConfigurado) } as unknown as ConfigService;
  return new WebhookSecretGuard(config);
}

describe("WebhookSecretGuard", () => {
  it("aceita quando o segredo bate", () => {
    expect(guard("s3gr3d0").canActivate(contexto({ "x-webhook-secret": "s3gr3d0" }))).toBe(true);
  });

  it("recusa sem cabeçalho nenhum — era assim que a rota estava aberta", () => {
    expect(() => guard("s3gr3d0").canActivate(contexto({}))).toThrow(ForbiddenException);
  });

  it("recusa com segredo errado", () => {
    expect(() => guard("s3gr3d0").canActivate(contexto({ "x-webhook-secret": "errado" }))).toThrow(
      ForbiddenException,
    );
  });

  // Falhar ABERTO quando a variável não está configurada transformaria um
  // esquecimento de deploy numa rota pública que devolve nome de paciente.
  it("recusa tudo quando WHATSAPP_WEBHOOK_SECRET não está configurado", () => {
    expect(() => guard(undefined).canActivate(contexto({ "x-webhook-secret": "qualquer" }))).toThrow(
      ForbiddenException,
    );
    expect(() => guard("").canActivate(contexto({ "x-webhook-secret": "" }))).toThrow(ForbiddenException);
  });

  // timingSafeEqual estoura com buffers de tamanhos diferentes — sem a guarda
  // de tamanho, um segredo curto derrubaria a requisição com erro 500.
  it("lida com segredo de tamanho diferente sem estourar", () => {
    expect(() => guard("s3gr3d0-longo").canActivate(contexto({ "x-webhook-secret": "x" }))).toThrow(
      ForbiddenException,
    );
  });
});
