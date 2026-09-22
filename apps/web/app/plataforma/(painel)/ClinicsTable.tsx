"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlatformClinic } from "../../../lib/api";
import { FUSO_DA_PLATAFORMA, formatarData } from "../../../lib/datas";
import s from "./painel.module.css";

/**
 * Esta tabela mistura clínicas de fusos diferentes, então não existe "a"
 * clínica para usar: mostrar cada linha no fuso dela tornaria a coluna
 * incomparável. Fica no fuso da própria plataforma.
 */
function formatarDataDaPlataforma(iso: string | null) {
  return formatarData(iso, FUSO_DA_PLATAFORMA);
}

function statusDaClinica(clinic: PlatformClinic): "ok" | "alerta" | "perigo" {
  const { subscription } = clinic;
  if (subscription.manuallySuspended || subscription.delinquent) return "perigo";
  return "ok";
}

function Selo({ clinic }: { clinic: PlatformClinic }) {
  const { subscription } = clinic;
  if (subscription.manuallySuspended) {
    return <span className={`${s.selo} ${s["selo--perigo"]}`}>Suspensa</span>;
  }
  if (subscription.delinquent) {
    return (
      <span className={`${s.selo} ${s["selo--perigo"]}`}>
        Inadimplente há {subscription.daysSinceLastPayment}d
      </span>
    );
  }
  return <span className={`${s.selo} ${s["selo--ok"]}`}>Em dia</span>;
}

export function ClinicsTable({ clinics }: { clinics: PlatformClinic[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [linhaEmAndamento, setLinhaEmAndamento] = useState<string | null>(null);

  async function handleRegistrarPagamento(clinicId: string, nome: string) {
    if (!window.confirm(`Registrar pagamento recebido de ${nome} hoje?`)) return;
    setErro(null);
    setLinhaEmAndamento(clinicId);
    try {
      const res = await fetch(`/api/platform/clinics/${clinicId}/register-payment`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível registrar o pagamento.");
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível registrar o pagamento.");
    } finally {
      setLinhaEmAndamento(null);
    }
  }

  async function handleSuspender(clinicId: string, nome: string) {
    const reason = window.prompt(`Motivo da suspensão de ${nome} (opcional):`);
    if (reason === null) return;
    setErro(null);
    setLinhaEmAndamento(clinicId);
    try {
      const res = await fetch(`/api/platform/clinics/${clinicId}/suspend`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível suspender a clínica.");
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível suspender a clínica.");
    } finally {
      setLinhaEmAndamento(null);
    }
  }

  async function handleReativar(clinicId: string, nome: string) {
    if (!window.confirm(`Reativar o acesso de ${nome}?`)) return;
    setErro(null);
    setLinhaEmAndamento(clinicId);
    try {
      const res = await fetch(`/api/platform/clinics/${clinicId}/reactivate`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível reativar a clínica.");
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível reativar a clínica.");
    } finally {
      setLinhaEmAndamento(null);
    }
  }

  return (
    <div>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      <div style={{ overflowX: "auto" }}>
        <table className={s.tabela}>
          <thead>
            <tr>
              <th>Clínica</th>
              <th>Plano</th>
              <th>Status</th>
              <th>Último pagamento</th>
              <th>Pacientes</th>
              <th>Equipe</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clinics.map((clinic) => {
              const emAndamento = linhaEmAndamento === clinic.id;
              return (
                <tr key={clinic.id} className={s[`linha--${statusDaClinica(clinic)}`]}>
                  <td>
                    <strong>{clinic.name}</strong>
                    <div className={s.tabelaMono}>{clinic.slug}</div>
                  </td>
                  <td>{clinic.plan ?? "—"}</td>
                  <td>
                    <Selo clinic={clinic} />
                  </td>
                  <td className={s.tabelaMono}>{formatarDataDaPlataforma(clinic.lastPaymentAt)}</td>
                  <td className={s.tabelaMono}>{clinic._count.patients}</td>
                  <td className={s.tabelaMono}>{clinic._count.memberships}</td>
                  <td>
                    <div className={s.acoes}>
                      <button
                        type="button"
                        className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm"
                        disabled={emAndamento}
                        onClick={() => handleRegistrarPagamento(clinic.id, clinic.name)}
                      >
                        Registrar pagamento
                      </button>
                      {clinic.subscription.manuallySuspended ? (
                        <button
                          type="button"
                          className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm"
                          disabled={emAndamento}
                          onClick={() => handleReativar(clinic.id, clinic.name)}
                        >
                          Reativar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="odontoflow-btn odontoflow-btn--ghost odontoflow-btn--sm"
                          disabled={emAndamento}
                          onClick={() => handleSuspender(clinic.id, clinic.name)}
                        >
                          Suspender
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
