import { redirect } from "next/navigation";
import {
  ApiError,
  getCurrentOrganization,
  getOrganizationDashboard,
  getPatients,
} from "../../../lib/api";
import { getStaffSession } from "../../../lib/session";
import { CreateOrJoinOrganization } from "./CreateOrJoinOrganization";
import { TransferPatientForm } from "./TransferPatientForm";
import { SyncProceduresButton } from "./SyncProceduresButton";
import { ClinicSwitcher } from "./ClinicSwitcher";
import s from "../admin.module.css";

export const metadata = { title: "Organização — Odonto Flow" };

function formatCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function OrganizacoesPage() {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");

  let data;
  try {
    data = await getCurrentOrganization(session.clinicSlug, session.token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return (
        <div className={s.pagina}>
          <h1 className={s.titulo}>Organização</h1>
          <p className={s.erro} role="alert">
            Só administradores da clínica podem gerenciar a rede.
          </p>
        </div>
      );
    }
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar a organização agora.
        </p>
      </div>
    );
  }

  const { organization, isOrgAdmin } = data;

  if (!organization) {
    return (
      <div className={s.pagina}>
        <h1 className={s.titulo}>Organização</h1>
        <p style={{ fontSize: 13, color: "var(--tinta-55)" }}>
          Sua clínica ainda não faz parte de uma rede. Crie uma rede para agrupar várias unidades sob o mesmo
          painel, ou entre numa rede existente com o código (ID) que o administrador dela te passar.
        </p>
        <CreateOrJoinOrganization />
      </div>
    );
  }

  const dashboard = isOrgAdmin
    ? await getOrganizationDashboard(session.clinicSlug, session.token).catch(() => null)
    : null;
  const patients = isOrgAdmin ? await getPatients(session.clinicSlug, session.token).catch(() => []) : [];
  const currentClinic = organization.clinics.find((c) => c.slug === session.clinicSlug);
  const siblingClinics = organization.clinics.filter((c) => c.slug !== session.clinicSlug);

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <h1 className={s.titulo}>{organization.name}</h1>
        <span className="chip chip--estatico">{organization.clinics.length} unidade(s)</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--tinta-55)" }}>
        Código da rede (compartilhe com outra clínica para ela entrar): <code>{organization.id}</code>
      </p>

      <ClinicSwitcher clinics={organization.clinics} currentSlug={session.clinicSlug} />

      {!isOrgAdmin ? (
        <p style={{ fontSize: 13, color: "var(--tinta-55)" }}>
          {currentClinic?.name ?? "Esta clínica"} faz parte da rede {organization.name}. Só o ORG_ADMIN vê o
          painel consolidado e pode transferir pacientes ou sincronizar o catálogo.
        </p>
      ) : (
        <>
          {dashboard ? (
            <div style={{ overflowX: "auto" }}>
              <table className={s.tabela}>
                <thead>
                  <tr>
                    <th>Clínica</th>
                    <th>Pacientes</th>
                    <th>Agendamentos (mês)</th>
                    <th>Orçamentos pendentes</th>
                    <th>Receita paga (mês)</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.clinics.map((m) => (
                    <tr key={m.clinic.id}>
                      <td>{m.clinic.name}</td>
                      <td>{m.patients}</td>
                      <td>{m.appointmentsThisMonth}</td>
                      <td>{m.pendingBudgets}</td>
                      <td>{formatCents(m.revenueThisMonthCents)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <strong>Total da rede</strong>
                    </td>
                    <td>
                      <strong>{dashboard.totals.patients}</strong>
                    </td>
                    <td>
                      <strong>{dashboard.totals.appointmentsThisMonth}</strong>
                    </td>
                    <td>
                      <strong>{dashboard.totals.pendingBudgets}</strong>
                    </td>
                    <td>
                      <strong>{formatCents(dashboard.totals.revenueThisMonthCents)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}

          <hr style={{ border: 0, borderTop: "1px solid var(--linha)", margin: "8px 0" }} />
          <TransferPatientForm patients={patients} clinics={siblingClinics} />

          <hr style={{ border: 0, borderTop: "1px solid var(--linha)", margin: "8px 0" }} />
          <SyncProceduresButton clinics={organization.clinics} currentClinicId={currentClinic?.id ?? ""} />
        </>
      )}
    </div>
  );
}
