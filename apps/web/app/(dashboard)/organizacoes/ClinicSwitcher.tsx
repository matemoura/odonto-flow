"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { OrganizationClinic } from "../../../lib/api";

export function ClinicSwitcher({ clinics, currentSlug }: { clinics: OrganizationClinic[]; currentSlug: string }) {
  const router = useRouter();
  const [trocando, setTrocando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function switchTo(clinicSlug: string) {
    setTrocando(clinicSlug);
    setErro(null);
    try {
      const res = await fetch("/api/session/switch-clinic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clinicSlug }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível trocar de unidade.");
      }
      router.push("/agenda");
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível trocar de unidade.");
      setTrocando(null);
    }
  }

  if (clinics.length <= 1) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600 }}>Ver como outra unidade:</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {clinics.map((c) => (
          <Button
            key={c.id}
            variant={c.slug === currentSlug ? "primary" : "ghost"}
            className="odontoflow-btn--sm"
            disabled={c.slug === currentSlug || trocando !== null}
            onClick={() => switchTo(c.slug)}
          >
            {trocando === c.slug ? "Trocando…" : c.name}
          </Button>
        ))}
      </div>
      {erro ? <span style={{ fontSize: 11.5, color: "var(--ameixa)" }}>{erro}</span> : null}
    </div>
  );
}
