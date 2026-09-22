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

/**
 * Os campos do formulário de "Conectar serviço" de cada integração, na tela
 * de Configurações da plataforma. Cada provedor real tem seus próprios nomes
 * de campo (phoneNumberId, CNPJ do emissor…) — isso fica aqui, e não
 * hardcoded no componente, pelo mesmo motivo de `INTEGRACOES`: é dado, não
 * lógica de tela.
 */
export const CAMPOS_CONEXAO: Record<
  IntegrationKind,
  { key: string; rotulo: string; opcional?: boolean }[]
> = {
  WHATSAPP: [
    { key: "phoneNumberId", rotulo: "ID do número (phone_number_id)" },
    { key: "businessAccountId", rotulo: "ID da conta comercial (WABA)" },
  ],
  AI_ASSISTANT: [{ key: "model", rotulo: "Modelo", opcional: true }],
  // Sem campo de CNPJ aqui: cada clínica é uma empresa diferente, então o
  // emissor é dela, não da conta que a plataforma contratou — fica na tela
  // de Integrações de cada clínica (`CAMPOS_CONEXAO` é só o que é comum a
  // todas, a conta do provedor em si).
  NFE: [],
  E_SIGNATURE: [{ key: "contaId", rotulo: "Conta/workspace", opcional: true }],
  CREDIT_SCORE: [{ key: "usuarioId", rotulo: "Usuário da conta", opcional: true }],
};

export const RESUMO_CHAVE: Record<IntegrationKind, string> = {
  WHATSAPP: "Token de acesso permanente",
  AI_ASSISTANT: "Chave de API",
  NFE: "Token da API",
  E_SIGNATURE: "Chave de API",
  CREDIT_SCORE: "Chave de API",
};
