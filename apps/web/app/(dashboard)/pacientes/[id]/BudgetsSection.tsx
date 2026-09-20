"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import {
  CONTRACT_STATUS_LABEL,
  type Budget,
  type Contract,
  type ContractStatus,
  type Procedure,
  type StaffProfessional,
} from "../../../../lib/api";
import s from "../../admin.module.css";
import { formatarData } from "../../../../lib/datas";
import { useFusoDaClinica } from "../../FusoDaClinica";
import { FalhaAoCarregar } from "./FalhaAoCarregar";

function formatCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

const STATUS_LABEL: Record<Budget["status"], string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  DECLINED: "Recusado",
  EXPIRED: "Expirado",
};

function BudgetCard({ budget, initialContract }: { budget: Budget; initialContract: Contract }) {
  const fuso = useFusoDaClinica();
  const router = useRouter();
  const [contract, setContract] = useState<Contract>(initialContract);
  const [carregandoContrato, setCarregandoContrato] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aprovando, setAprovando] = useState(false);
  const [parcelas, setParcelas] = useState("1");
  const [primeiroVencimento, setPrimeiroVencimento] = useState("");
  const [itemEmAndamento, setItemEmAndamento] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const total = budget.items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);

  async function updateStatus(
    status: Budget["status"],
    pagamento?: { installments: number; firstDueDate: string },
  ) {
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/staff/budgets/${budget.id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, ...pagamento }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          Array.isArray(data.message) ? data.message[0] : (data.message ?? "Não foi possível atualizar."),
        );
      }
      setAprovando(false);
      router.refresh();
    } catch {
      setErro("Falha ao atualizar.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleFinalizarItem(itemId: string) {
    setItemEmAndamento(itemId);
    setErro(null);
    try {
      const res = await fetch(`/api/staff/budgets/${budget.id}/items/${itemId}/execute`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Falha ao finalizar o procedimento.");
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao finalizar o procedimento.");
    } finally {
      setItemEmAndamento(null);
    }
  }

  async function handleGenerateContract() {
    setCarregandoContrato(true);
    setErro(null);
    try {
      const res = await fetch(`/api/staff/budgets/${budget.id}/contract`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Falha ao gerar contrato.");
      setContract(data);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao gerar contrato.");
    } finally {
      setCarregandoContrato(false);
    }
  }

  return (
    <div style={{ padding: 12, background: "var(--gaze)", borderRadius: "var(--r-md)", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <strong style={{ fontSize: 13 }}>com {budget.professional.user.name}</strong>
        <span className="chip chip--estatico">{STATUS_LABEL[budget.status]}</span>
      </div>
      <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12.5, display: "flex", flexDirection: "column", gap: 4 }}>
        {budget.items.map((item) => (
          <li key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span>
              {item.procedure.name} x{item.quantity} — {formatCents(item.unitPriceCents * item.quantity)}
            </span>
            {item.executedAt ? (
              <span className="chip chip--estatico">Finalizado</span>
            ) : budget.status === "APPROVED" ? (
              <button
                type="button"
                className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm"
                disabled={itemEmAndamento === item.id}
                onClick={() => handleFinalizarItem(item.id)}
              >
                {itemEmAndamento === item.id ? "Finalizando…" : "Finalizar procedimento"}
              </button>
            ) : item.materialsReservedAt ? (
              <span className="chip chip--estatico chip--areia">Materiais reservados</span>
            ) : null}
          </li>
        ))}
      </ul>
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>Total: {formatCents(total)}</span>

      {erro ? <span style={{ fontSize: 11.5, color: "var(--ameixa)" }}>{erro}</span> : null}

      {budget.status === "PENDING" ? (
        aprovando ? (
          /* Aprovar passou a lançar o contas a receber, então a condição de
             pagamento é combinada aqui — antes a clínica aprovava e redigitava
             tudo à mão no financeiro, sem vínculo com o orçamento. */
          <div className={s.condicaoDePagamento}>
            <strong style={{ fontSize: 12.5 }}>Como o paciente vai pagar?</strong>

            <div className={s.campo}>
              <label className={s.rotuloCampo} htmlFor={`parcelas-${budget.id}`}>
                Parcelas
              </label>
              <input
                id={`parcelas-${budget.id}`}
                type="number"
                min={1}
                max={24}
                className={s.input}
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
              />
            </div>

            <div className={s.campo}>
              <label className={s.rotuloCampo} htmlFor={`vencimento-${budget.id}`}>
                Primeiro vencimento
              </label>
              <input
                id={`vencimento-${budget.id}`}
                type="date"
                className={s.input}
                value={primeiroVencimento}
                onChange={(e) => setPrimeiroVencimento(e.target.value)}
              />
            </div>

            <span className={s.dica}>
              {Number(parcelas) > 1
                ? `${parcelas}x de ${formatCents(Math.floor(total / Number(parcelas)))} — as parcelas vencem de mês em mês.`
                : `Uma cobrança de ${formatCents(total)}.`}
            </span>

            <div style={{ display: "flex", gap: 6 }}>
              <Button
                variant="primary"
                className="odontoflow-btn--sm"
                disabled={enviando}
                onClick={() =>
                  updateStatus("APPROVED", {
                    installments: Math.max(1, Number(parcelas) || 1),
                    // Sem data escolhida, vence hoje — a API assume o mesmo.
                    firstDueDate: primeiroVencimento || new Date().toISOString().slice(0, 10),
                  })
                }
              >
                {enviando ? "Aprovando…" : "Aprovar e lançar"}
              </Button>
              <Button
                variant="ghost"
                className="odontoflow-btn--sm"
                onClick={() => setAprovando(false)}
                disabled={enviando}
              >
                Voltar
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <Button variant="secondary" className="odontoflow-btn--sm" onClick={() => setAprovando(true)} disabled={enviando}>
              Aprovar
            </Button>
            <Button variant="ghost" className="odontoflow-btn--sm" onClick={() => updateStatus("DECLINED")} disabled={enviando}>
              Recusar
            </Button>
          </div>
        )
      ) : null}

      {budget.status === "APPROVED" ? (
        contract ? (
          <span style={{ fontSize: 12, color: contract.status === "SIGNED" ? "#38715c" : "var(--tinta-70)" }}>
            Contrato {CONTRACT_STATUS_LABEL[contract.status as ContractStatus] ?? contract.status}
            {contract.signedAt ? ` em ${formatarData(contract.signedAt, fuso)}` : ""}.
          </span>
        ) : (
          <Button variant="secondary" className="odontoflow-btn--sm" onClick={handleGenerateContract} disabled={carregandoContrato}>
            {carregandoContrato ? "Gerando…" : "Gerar contrato para assinatura"}
          </Button>
        )
      ) : null}
    </div>
  );
}

export function BudgetsSection({
  patientId,
  budgets,
  procedures,
  professionals,
  contractsByBudgetId,
}: {
  patientId: string;
  budgets: Budget[] | null;
  procedures: Procedure[] | null;
  professionals: StaffProfessional[] | null;
  contractsByBudgetId: Record<string, Contract>;
}) {
  const router = useRouter();
  // Catálogo nulo = a leitura falhou. Para o formulário o efeito é o mesmo de
  // estar vazio (não dá para escolher), mas o MOTIVO é outro — e é o motivo
  // que o usuário precisa ler.
  const catalogoIndisponivel = procedures === null || professionals === null;
  const procedimentosAtivos = (procedures ?? []).filter((p) => p.active);
  const profissionaisDisponiveis = professionals ?? [];
  const [aberto, setAberto] = useState(false);
  const [professionalId, setProfessionalId] = useState(profissionaisDisponiveis[0]?.id ?? "");
  const [procedureId, setProcedureId] = useState(procedimentosAtivos[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/staff/budgets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId,
          professionalId,
          items: [{ procedureId, quantity }],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível salvar.");
      }
      setAberto(false);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className={s.bloco}>
      <h2 style={{ fontSize: 14, fontWeight: 600 }}>Orçamentos</h2>

      {budgets === null ? (
        <FalhaAoCarregar oQue="os orçamentos" />
      ) : budgets.length === 0 ? (
        <p className={s.vazio}>Nenhum orçamento ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {budgets.map((b) => (
            <BudgetCard key={b.id} budget={b} initialContract={contractsByBudgetId[b.id] ?? null} />
          ))}
        </div>
      )}

      {/* O botão já nascia desabilitado quando faltava serviço ou profissional
          — mas sem dizer por quê, e "não tem nada cadastrado" é diferente de
          "não consegui ler o cadastro". */}
      {catalogoIndisponivel ? (
        <FalhaAoCarregar oQue="o catálogo de serviços e profissionais" />
      ) : null}

      {!aberto ? (
        <Button variant="primary" onClick={() => setAberto(true)} style={{ alignSelf: "flex-start" }} disabled={!professionalId || !procedureId}>
          + Novo orçamento
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className={s.form}>
          {erro ? (
            <p className={s.erro} role="alert">
              {erro}
            </p>
          ) : null}
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Profissional</label>
            <select className={s.input} value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
              {profissionaisDisponiveis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.user.name}
                </option>
              ))}
            </select>
          </div>
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Procedimento</label>
            <select className={s.input} value={procedureId} onChange={(e) => setProcedureId(e.target.value)}>
              {procedimentosAtivos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatCents(p.defaultPriceCents)})
                </option>
              ))}
            </select>
          </div>
          <div className={s.campo}>
            <label className={s.rotuloCampo}>Quantidade</label>
            <input
              type="number"
              min={1}
              className={s.input}
              style={{ maxWidth: 100 }}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="submit" variant="primary" disabled={enviando}>
              {enviando ? "Salvando…" : "Salvar orçamento"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
