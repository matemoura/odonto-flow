import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffProfessionals } from "../../../lib/api";
import { getStaffSession } from "../../../lib/session";
import s from "../admin.module.css";

export const metadata = { title: "Profissionais — Odonto Flow" };

export default async function ProfissionaisPage() {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");

  let professionals;
  try {
    professionals = await getStaffProfessionals(session.clinicSlug, session.token);
  } catch {
    return (
      <div className={s.pagina}>
        <p className={s.erro} role="alert">
          Não foi possível carregar os profissionais agora.
        </p>
      </div>
    );
  }

  return (
    <div className={s.pagina}>
      <div className={s.cabecalho}>
        <h1 className={s.titulo}>Profissionais</h1>
        <Link href="/profissionais/novo" className="odontoflow-btn odontoflow-btn--primary">
          + Novo profissional
        </Link>
      </div>

      {professionals.length === 0 ? (
        <p className={s.vazio}>Nenhum profissional cadastrado ainda.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className={s.tabela}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Especialidade</th>
                <th>CRO</th>
                <th>E-mail</th>
              </tr>
            </thead>
            <tbody>
              {professionals.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/profissionais/${p.id}`}>{p.user.name}</Link>
                  </td>
                  <td>{p.specialty ?? "—"}</td>
                  <td>{p.croNumber ?? "—"}</td>
                  <td>{p.user.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
