import type { IntegrationKind } from "./api";

/**
 * Nome e descrição de cada integração, em português de dono de clínica — não em
 * nome de produto. Fica aqui, e não em cada tela, porque as duas telas (a da
 * clínica e a do dono da plataforma) falam das mesmas cinco coisas e não podem
 * chamá-las de nomes diferentes.
 *
 * A ordem é a da lista; o backend devolve na mesma.
 */
export const INTEGRACOES: {
  kind: IntegrationKind;
  nome: string;
  oQueFaz: string;
  provedoresReais: string;
}[] = [
  {
    kind: "WHATSAPP",
    nome: "WhatsApp",
    oQueFaz: "Confirma consulta e responde o paciente pelo WhatsApp da clínica.",
    provedoresReais: "meta-cloud-api, 360dialog, zenvia, twilio",
  },
  {
    kind: "AI_ASSISTANT",
    nome: "Secretária virtual",
    oQueFaz: "Responde as dúvidas mais comuns do paciente sozinha.",
    provedoresReais: "claude, openai, gemini",
  },
  {
    kind: "NFE",
    nome: "Nota fiscal de serviço",
    oQueFaz: "Emite a NFS-e a partir do recebimento lançado no financeiro.",
    provedoresReais: "focus-nfe, nfeio, enotas",
  },
  {
    kind: "E_SIGNATURE",
    nome: "Assinatura eletrônica",
    oQueFaz: "Manda o contrato do orçamento aprovado para o paciente assinar.",
    provedoresReais: "autentique, clicksign, d4sign",
  },
  {
    kind: "CREDIT_SCORE",
    nome: "Consulta de crédito",
    oQueFaz: "Consulta o score do paciente antes de parcelar um tratamento.",
    provedoresReais: "serasa, boavista",
  },
];

export function integracao(kind: IntegrationKind) {
  return INTEGRACOES.find((i) => i.kind === kind);
}
