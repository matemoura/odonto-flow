"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlatformSettings } from "../../../../lib/api";
import s from "../painel.module.css";

export function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const router = useRouter();
  const [dias, setDias] = useState(String(settings.delinquencyGracePeriodDays));
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);
    setSalvando(true);
    try {
      const res = await fetch("/api/platform/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ delinquencyGracePeriodDays: Number(dias) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Não foi possível salvar.");
      }
      setSucesso(true);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className={s.form} onSubmit={handleSubmit}>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      {sucesso ? <p className={s.sucesso}>Configuração salva.</p> : null}

      <div className={s.campo}>
        <label className={s.rotuloCampo} htmlFor="dias">
          Dias de inadimplência até perder acesso
        </label>
        <input
          id="dias"
          type="number"
          min={0}
          step={1}
          className={s.input}
          value={dias}
          onChange={(e) => setDias(e.target.value)}
          required
        />
        <span className={s.dica}>
          Contados a partir do último pagamento registrado (ou da criação da clínica, se nunca pagou). Ao
          ultrapassar esse prazo, a clínica perde acesso automaticamente até um novo pagamento ser registrado.
        </span>
      </div>

      <div>
        <button
          type="submit"
          className="odontoflow-btn odontoflow-btn--primary"
          disabled={salvando}
          aria-disabled={salvando}
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
