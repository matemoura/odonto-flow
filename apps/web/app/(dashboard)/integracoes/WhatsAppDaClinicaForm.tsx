"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import s from "../admin.module.css";

export function WhatsAppDaClinicaForm({ whatsappPhone }: { whatsappPhone: string | null }) {
  const router = useRouter();
  const [numero, setNumero] = useState(whatsappPhone ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);
    setSalvando(true);
    try {
      const res = await fetch("/api/staff/integrations/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        // Campo vazio é "apagar o número", não string vazia.
        body: JSON.stringify({ whatsappPhone: numero.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          Array.isArray(data.message) ? data.message[0] : (data.message ?? "Não foi possível salvar."),
        );
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
    <form onSubmit={handleSubmit} className={s.campo}>
      {erro ? (
        <p className={s.erro} role="alert">
          {erro}
        </p>
      ) : null}
      {sucesso ? <p className={s.sucesso}>Número salvo.</p> : null}

      <label className={s.rotuloCampo} htmlFor="whatsapp-da-clinica">
        Número de WhatsApp da clínica
      </label>
      <input
        id="whatsapp-da-clinica"
        type="tel"
        className={s.input}
        placeholder="+55 11 98765-4321"
        value={numero}
        onChange={(e) => {
          setSucesso(false);
          setErro(null);
          setNumero(e.target.value);
        }}
      />
      <span className={s.dica}>
        É deste número que as mensagens saem. Sem ele, o envio não acontece — o paciente não confiaria numa
        confirmação vinda de um número que ele não conhece.
      </span>
      <div>
        <button
          type="submit"
          className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm"
          disabled={salvando}
          aria-disabled={salvando}
        >
          {salvando ? "Salvando…" : "Salvar número"}
        </button>
      </div>
    </form>
  );
}
