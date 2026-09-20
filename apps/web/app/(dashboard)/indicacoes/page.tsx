import { redirect } from "next/navigation";
import { getPatientOptions, getReferrals } from "../../../lib/api";
import { getStaffSession } from "../../../lib/session";
import { NovaIndicacaoForm } from "./NovaIndicacaoForm";
import { ReferralStatusButton } from "./ReferralStatusButton";
import s from "../admin.module.css";

export const metadata = { title: "Indicações — Odonto Flow" };

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando",
  CONVERTED: "Convertida",
  REWARDED: "Recompensada",
};

export default async function IndicacoesPage() {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");

  let referrals;
  let patients;
  try {
    [referrals, patients] = await Promise.all([
      getReferrals(session.clinicSlug, session.token),
      getPatientOptions(session.clinicSlug, session.token),
    ]);
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar as indicações agora.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pagina}>
      <h1 className={s.titulo}>Indicações</h1>
      <p style={{ fontSize: 13, color: "var(--tinta-70)", maxWidth: 560 }}>
        Pacientes que indicaram amigos e familiares para a clínica.
      </p>

      <NovaIndicacaoForm patients={patients.itens} />

      {referrals.length === 0 ? (
        <p className={s.vazio}>Nenhuma indicação registrada ainda.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Indicado por</th>
                <th>Indicado(a)</th>
                <th>Telefone</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id}>
                  <td>{r.referrerPatient.name}</td>
                  <td>{r.referredPatient?.name ?? r.referredName}</td>
                  <td>{r.referredPhone ?? "—"}</td>
                  <td>{STATUS_LABEL[r.status]}</td>
                  <td>
                    <ReferralStatusButton referralId={r.id} status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
