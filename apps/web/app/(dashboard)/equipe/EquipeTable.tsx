"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamMember, TeamRole } from "../../../lib/api";
import s from "../admin.module.css";

const ROTULO_CARGO: Record<TeamRole, string> = {
  CLINIC_ADMIN: "Administrador(a)",
  DENTIST: "Dentista",
  ASSISTANT: "Assistente",
};

export function EquipeTable({ members }: { members: TeamMember[] }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [linhaEmAndamento, setLinhaEmAndamento] = useState<string | null>(null);

  async function handleRoleChange(membershipId: string, role: TeamRole) {
    setErro(null);
    setLinhaEmAndamento(membershipId);
    try {
      const res = await fetch(`/api/staff/team/${membershipId}/role`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível atualizar o cargo.");
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar o cargo.");
    } finally {
      setLinhaEmAndamento(null);
    }
  }

  async function handleRemove(membershipId: string, nome: string) {
    if (!window.confirm(`Remover o acesso de ${nome}? A pessoa não conseguirá mais entrar nesta clínica.`)) {
      return;
    }
    setErro(null);
    setLinhaEmAndamento(membershipId);
    try {
      const res = await fetch(`/api/staff/team/${membershipId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível remover o acesso.");
      }
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível remover o acesso.");
    } finally {
      setLinhaEmAndamento(null);
    }
  }

  return (
    <div>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      <div style={{ overflowX: "auto" }}>
        <table className={s.tabela}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Cargo</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.user.name}</td>
                <td>{member.user.email}</td>
                <td>
                  <select
                    className={s.input}
                    style={{ minHeight: 36, padding: "0 8px" }}
                    value={member.role}
                    disabled={linhaEmAndamento === member.id}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as TeamRole)}
                    aria-label={`Cargo de ${member.user.name}`}
                  >
                    {Object.entries(ROTULO_CARGO).map(([valor, rotulo]) => (
                      <option key={valor} value={valor}>
                        {rotulo}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    className="odontoflow-btn odontoflow-btn--ghost"
                    disabled={linhaEmAndamento === member.id}
                    onClick={() => handleRemove(member.id, member.user.name)}
                  >
                    Remover acesso
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
