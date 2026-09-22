"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import s from "../admin.module.css";

export function NfeDaClinicaForm({ nfeCnpjEmissor }: { nfeCnpjEmissor: string | null }) {
  const router = useRouter();
  const [cnpj, setCnpj] = useState(nfeCnpjEmissor ?? "");
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
        // Campo vazio é "apagar o CNPJ", não string vazia.
        body: JSON.stringify({ nfeCnpjEmissor: cnpj.trim() || null }),
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
      {sucesso ? <p className={s.sucesso}>CNPJ salvo.</p> : null}

      <label className={s.rotuloCampo} htmlFor="nfe-cnpj-emissor">
        CNPJ do emissor da nota fiscal
      </label>
      <input
        id="nfe-cnpj-emissor"
        type="text"
        inputMode="numeric"
        className={s.input}
        placeholder="00.000.000/0000-00"
        value={cnpj}
        onChange={(e) => {
          setSucesso(false);
          setErro(null);
          setCnpj(e.target.value);
        }}
      />
      <span className={s.dica}>
        A conta que emite (e a assinatura dela) é da Odonto Flow; este CNPJ é só o dado da sua clínica — é
        dele que a nota sai. Sem ele, a emissão não acontece.
      </span>
      <div>
        <button
          type="submit"
          className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm"
          disabled={salvando}
          aria-disabled={salvando}
        >
          {salvando ? "Salvando…" : "Salvar CNPJ"}
        </button>
      </div>
    </form>
  );
}
