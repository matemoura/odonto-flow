import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlatformSession } from "../../../lib/session";
import { LogoutButton } from "./LogoutButton";
import s from "./painel.module.css";

export default async function PainelPlataformaLayout({ children }: { children: ReactNode }) {
  const session = await getPlatformSession();
  if (!session) redirect("/plataforma/entrar");

  return (
    <div className={s.shell}>
      <header className={s.topo}>
        <span className={s.marca}>Odonto Flow · plataforma</span>
        <nav className={s.nav}>
          <Link href="/plataforma">Clínicas</Link>
          <Link href="/plataforma/metricas">Métricas</Link>
          <Link href="/plataforma/integracoes">Integrações</Link>
          <Link href="/plataforma/configuracoes">Configurações</Link>
        </nav>
        <LogoutButton />
      </header>
      <main className={s.conteudo}>{children}</main>
    </div>
  );
}
