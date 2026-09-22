"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./painel.module.css";

const ITENS = [
  { href: "/plataforma", rotulo: "Clínicas" },
  { href: "/plataforma/metricas", rotulo: "Métricas" },
  { href: "/plataforma/integracoes", rotulo: "Integrações" },
  { href: "/plataforma/configuracoes", rotulo: "Configurações" },
  { href: "/plataforma/exportar", rotulo: "Exportar" },
];

export function PainelNav() {
  const pathname = usePathname();

  return (
    <nav className={s.nav}>
      {ITENS.map((item) => {
        // "/plataforma" também é prefixo de "/plataforma/metricas" etc., então
        // só ele exige igualdade exata — os demais podem crescer com sub-rotas.
        const ativo = item.href === "/plataforma" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={ativo ? "page" : undefined}>
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
