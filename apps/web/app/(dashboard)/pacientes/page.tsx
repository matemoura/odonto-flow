import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@odontoflow/ui";
import { getPatients } from "../../../lib/api";
import { getStaffSession } from "../../../lib/session";
import s from "../admin.module.css";

export const metadata = { title: "Pacientes — Odonto Flow" };

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");

  const { search } = await searchParams;

  let patients;
  try {
    patients = await getPatients(session.clinicSlug, session.token, search);
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar os pacientes agora.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <h1 className={s.titulo}>Pacientes</h1>
        {/* Dentista vê só quem ele atendeu, então um paciente recém-criado por
            ele sumiria na hora (ainda não tem consulta marcada). Quem cadastra
            é a recepção — a API também recusa o POST para esse cargo. */}
        {session.role === "DENTIST" ? null : (
          <Link href="/pacientes/novo" className="odontoflow-btn odontoflow-btn--primary">
            + Novo paciente
          </Link>
        )}
      </div>

      <form method="GET" style={{ display: "flex", gap: 8 }}>
        <input
          type="search"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Buscar por nome…"
          className={s.input}
          style={{ maxWidth: 280 }}
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {patients.length === 0 ? (
        <p className={s.vazio}>Nenhum paciente encontrado.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>Cadastrado em</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/pacientes/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>{p.phone ?? "—"}</td>
                  <td>{p.email ?? "—"}</td>
                  <td>{new Intl.DateTimeFormat("pt-BR").format(new Date(p.createdAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
