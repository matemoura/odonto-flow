import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getPlatformSession } from "../../../lib/session";
import { LogoutButton } from "./LogoutButton";
import { PainelNav } from "./PainelNav";
import s from "./painel.module.css";

export default async function PainelPlataformaLayout({ children }: { children: ReactNode }) {
  const session = await getPlatformSession();
  if (!session) redirect("/plataforma/entrar");

  return (
    <div className={s.shell}>
      <header className={s.topo}>
        <span className={s.marca}>
          Odonto Flow<span className={s.marcaEtiqueta}>plataforma</span>
        </span>
        <PainelNav />
        <LogoutButton />
      </header>
      <main className={s.conteudo}>{children}</main>
    </div>
  );
}
