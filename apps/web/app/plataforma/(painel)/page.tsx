import { redirect } from "next/navigation";
import { getPlatformClinics } from "../../../lib/api";
import { getPlatformSession } from "../../../lib/session";
import { ClinicsTable } from "./ClinicsTable";
import s from "./painel.module.css";

export const metadata = { title: "Clínicas — Painel da plataforma" };

export default async function PainelPlataformaPage() {
  const session = await getPlatformSession();
  if (!session) redirect("/plataforma/entrar");

  let clinics;
  try {
    clinics = await getPlatformClinics(session.token);
  } catch {
    return (
      <div>
        <p className={s.erro} role="alert">
          Não foi possível carregar as clínicas agora.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={s.cabecalho}>
        <div>
          <h1 className={s.titulo}>Clínicas</h1>
          <p className={s.subtitulo}>
            {clinics.length} {clinics.length === 1 ? "clínica cliente" : "clínicas clientes"}
          </p>
        </div>
      </div>

      {clinics.length === 0 ? (
        <p className={s.vazio}>Nenhuma clínica cadastrada ainda.</p>
      ) : (
        <ClinicsTable clinics={clinics} />
      )}
    </div>
  );
}
