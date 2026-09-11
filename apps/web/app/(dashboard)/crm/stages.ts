import type { OpportunityStage } from "../../../lib/api";

export const STAGES: { value: OpportunityStage; label: string }[] = [
  { value: "NEW", label: "Novo" },
  { value: "CONTACTED", label: "Contato feito" },
  { value: "BUDGET_SENT", label: "Orçamento enviado" },
  { value: "NEGOTIATING", label: "Negociação" },
  { value: "WON", label: "Ganho" },
  { value: "LOST", label: "Perdido" },
];
