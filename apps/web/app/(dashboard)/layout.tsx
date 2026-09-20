import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentOrganization } from "../../lib/api";
import { fusoDaClinica } from "../../lib/fuso-servidor";
import { getStaffSession } from "../../lib/session";
import { FusoDaClinicaProvider } from "./FusoDaClinica";
import { LogoutButton } from "./LogoutButton";
import { NavLinks } from "./NavLinks";
import s from "./dashboard.module.css";

function clinicDisplayName(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getStaffSession();
  if (!session) {
    redirect("/entrar");
  }

  const canSeeOrganizacoes = await getCurrentOrganization(session.clinicSlug, session.token)
    .then(() => true)
    .catch(() => false);
  // O fuso desce por contexto para TODO o painel — ver FusoDaClinica.tsx.
  const fuso = await fusoDaClinica(session.clinicSlug);
  const isAdmin = session.role === "CLINIC_ADMIN" || session.role === "ORG_ADMIN";
  const ehDentista = session.role === "DENTIST";

  return (
    <FusoDaClinicaProvider fuso={fuso}>
      <div className={s.shell}>
        <header className={s.lateral}>
          <div className={s.marca}>Odonto Flow</div>
          <NavLinks showOrganizacoes={canSeeOrganizacoes} isAdmin={isAdmin} ehDentista={ehDentista} />
          <div className={s.tenant}>
            <span className={s.tenantRotulo}>Clínica</span>
            <strong>{clinicDisplayName(session.clinicSlug)}</strong>
            <LogoutButton clinicSlug={session.clinicSlug} />
          </div>
        </header>
        <main id="conteudo" className={s.conteudo}>
          {children}
        </main>
      </div>
    </FusoDaClinicaProvider>
  );
}
