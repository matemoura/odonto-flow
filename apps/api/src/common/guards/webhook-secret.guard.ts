import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";

/**
 * Segredo compartilhado para rota de webhook.
 *
 * O webhook do WhatsApp roda sem `JwtAuthGuard` (quem chama é o provedor, não
 * um usuário logado) e só tinha o `TenantGuard`, que apenas resolve o slug da
 * clínica — slug esse que é público, porque é o link de agendamento. Na
 * prática a rota era aberta: com um telefone e o slug, qualquer um recebia de
 * volta o NOME do paciente e a confirmação de que ele tem consulta marcada.
 *
 * **Falha fechada**: sem `WHATSAPP_WEBHOOK_SECRET` configurado, a rota recusa
 * tudo. Deixar passar quando o segredo não está definido transformaria um erro
 * de configuração em porta aberta, silenciosamente.
 *
 * Quando um provedor real for plugado, isto vira a verificação de assinatura
 * dele (`X-Hub-Signature-256` na Meta Cloud API) — o ponto de checagem já fica
 * no lugar certo.
 */
@Injectable()
export class WebhookSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const esperado = this.config.get<string>("WHATSAPP_WEBHOOK_SECRET");
    if (!esperado) {
      throw new ForbiddenException("Webhook desabilitado: WHATSAPP_WEBHOOK_SECRET não configurado.");
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, unknown> }>();
    const recebido = request.headers["x-webhook-secret"];
    if (typeof recebido !== "string" || !comparacaoSegura(recebido, esperado)) {
      throw new ForbiddenException("Webhook não autorizado.");
    }
    return true;
  }
}

/**
 * Comparação de tempo constante. `===` sai no primeiro byte diferente, e essa
 * diferença de tempo é medível o bastante para adivinhar o segredo caractere a
 * caractere. O hash-antes-de-comparar é para os dois lados terem sempre o
 * mesmo tamanho — `timingSafeEqual` estoura com buffers de tamanhos distintos.
 */
function comparacaoSegura(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Ainda assim faz uma comparação, para o tempo não denunciar o tamanho.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
