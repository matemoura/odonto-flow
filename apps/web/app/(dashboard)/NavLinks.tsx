"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./dashboard.module.css";

type Item = { href: string; label: string; exato?: boolean };
type Grupo = { id: string; label: string; itens: Item[] };

export function NavLinks({
  showOrganizacoes,
  isAdmin,
  ehDentista,
}: {
  showOrganizacoes: boolean;
  isAdmin: boolean;
  /** Dentista só opera o próprio dia: agenda dele, pacientes dele e o link de agendamento. */
  ehDentista: boolean;
}) {
  const pathname = usePathname();
  // Só o que o usuário abriu/fechou na mão; o resto segue a rota atual.
  const [alternados, setAlternados] = useState<Record<string, boolean>>({});

  const ehAtivo = (item: Item) =>
    item.exato ? pathname === item.href : pathname === item.href || pathname?.startsWith(`${item.href}/`);

  // Atalhos do dia a dia ficam a um clique, sem precisar abrir nada.
  const diretos: Item[] = [
    ...(isAdmin ? [{ href: "/painel", label: "Painel" }] : []),
    { href: "/agenda", label: "Agenda" },
    { href: "/pacientes", label: "Pacientes" },
    ...(ehDentista
      ? [{ href: "/link-de-agendamento", label: "Link de agendamento" }]
      : // exato: senão /financeiro/cartao acenderia "Financeiro" junto
        [{ href: "/financeiro", label: "Financeiro", exato: true }]),
  ];

  // O menu do dentista termina aqui: o que sobraria são telas de gestão, e a
  // API também as recusa para esse papel (não é só esconder o link).
  const grupos: Grupo[] = ehDentista
    ? []
    : [
    {
      id: "gerenciamento",
      label: "Gerenciamento",
      itens: [
        ...(isAdmin ? [{ href: "/servicos", label: "Serviços" }] : []),
        ...(isAdmin ? [{ href: "/estoque", label: "Estoque" }] : []),
        { href: "/profissionais", label: "Profissionais" },
        ...(isAdmin ? [{ href: "/equipe", label: "Equipe" }] : []),
      ],
    },
    {
      id: "relacionamento",
      label: "Relacionamento",
      itens: [
        { href: "/crm", label: "CRM" },
        { href: "/indicacoes", label: "Indicações" },
        { href: "/link-de-agendamento", label: "Link de agendamento" },
      ],
    },
    {
      id: "configuracoes",
      label: "Configurações",
      itens: [
        ...(isAdmin ? [{ href: "/financeiro/cartao", label: "Taxa e prazo do cartão" }] : []),
        ...(isAdmin ? [{ href: "/integracoes", label: "Integrações" }] : []),
        ...(showOrganizacoes ? [{ href: "/organizacoes", label: "Organização" }] : []),
      ],
    },
  ].filter((grupo) => grupo.itens.length > 0);

  return (
    <nav className={s.nav} aria-label="Seções da clínica">
      {diretos.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={ehAtivo(item) ? `${s.link} ${s.linkAtivo}` : s.link}
          aria-current={ehAtivo(item) ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}

      {grupos.map((grupo) => {
        const contemAtivo = grupo.itens.some(ehAtivo);
        // Quem mandou por último: o clique do usuário; senão, a rota aberta.
        const aberto = alternados[grupo.id] ?? contemAtivo;

        return (
          <div key={grupo.id} className={s.grupo}>
            <button
              type="button"
              className={contemAtivo && !aberto ? `${s.grupoBotao} ${s.grupoBotaoAtivo}` : s.grupoBotao}
              aria-expanded={aberto}
              aria-controls={`grupo-${grupo.id}`}
              onClick={() => setAlternados((atual) => ({ ...atual, [grupo.id]: !aberto }))}
            >
              <span>{grupo.label}</span>
              <svg
                className={aberto ? `${s.seta} ${s.setaAberta}` : s.seta}
                width="10"
                height="10"
                viewBox="0 0 10 10"
                aria-hidden="true"
              >
                <path d="M2.5 3.5 L5 6.5 L7.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div id={`grupo-${grupo.id}`} className={aberto ? s.grupoItens : `${s.grupoItens} ${s.grupoFechado}`}>
              {grupo.itens.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={ehAtivo(item) ? `${s.link} ${s.subLink} ${s.linkAtivo}` : `${s.link} ${s.subLink}`}
                  aria-current={ehAtivo(item) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
