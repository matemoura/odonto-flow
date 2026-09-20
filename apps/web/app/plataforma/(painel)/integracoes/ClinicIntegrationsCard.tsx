"use client";

import { useState } from "react";
import type { IntegrationKind, PlatformClinicIntegrations } from "../../../../lib/api";
import { INTEGRACOES } from "../../../../lib/integracoes";
import s from "../painel.module.css";

type Estado = { enabled: boolean; providerName: string };
type Aviso = { tipo: "erro" | "ok"; texto: string };

export function ClinicIntegrationsCard({ clinica }: { clinica: PlatformClinicIntegrations }) {
  const [estado, setEstado] = useState<Record<string, Estado>>(() =>
    Object.fromEntries(
      clinica.integrations.map((i) => [i.kind, { enabled: i.enabled, providerName: i.providerName }]),
    ),
  );
  const [avisos, setAvisos] = useState<Record<string, Aviso | undefined>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  async function salvar(kind: IntegrationKind, proximo: Estado) {
    const anterior = estado[kind];
    // Otimista: um interruptor que só se mexe depois da resposta parece travado.
    setEstado((atual) => ({ ...atual, [kind]: proximo }));
    setAvisos((atual) => ({ ...atual, [kind]: undefined }));
    setSalvando(kind);
    try {
      const res = await fetch(`/api/platform/integrations/${clinica.id}/${kind}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(proximo),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          Array.isArray(data.message) ? data.message[0] : (data.message ?? "Não foi possível salvar."),
        );
      }
      setAvisos((atual) => ({ ...atual, [kind]: { tipo: "ok", texto: "Salvo." } }));
    } catch (error) {
      // Desfaz: deixar o interruptor ligado depois de falhar seria mentir sobre
      // o que a clínica realmente tem.
      setEstado((atual) => ({ ...atual, [kind]: anterior }));
      setAvisos((atual) => ({
        ...atual,
        [kind]: { tipo: "erro", texto: error instanceof Error ? error.message : "Não foi possível salvar." },
      }));
    } finally {
      setSalvando(null);
    }
  }

  const liberadas = Object.values(estado).filter((e) => e.enabled).length;

  return (
    <section className={s.cartaoClinica}>
      <header className={s.cartaoClinicaTopo}>
        <div>
          <h2 className={s.cartaoClinicaNome}>{clinica.name}</h2>
          <span className={s.subtitulo}>/{clinica.slug}</span>
        </div>
        <span className={liberadas === 0 ? `${s.selo} ${s["selo--alerta"]}` : `${s.selo} ${s["selo--ok"]}`}>
          {liberadas} de {INTEGRACOES.length} liberadas
        </span>
      </header>

      <ul className={s.listaIntegracoes}>
        {INTEGRACOES.map((info) => {
          const atual = estado[info.kind] ?? { enabled: false, providerName: "mock" };
          const aviso = avisos[info.kind];
          return (
            <li key={info.kind} className={s.linhaIntegracao}>
              <label className={s.linhaIntegracaoChave}>
                <input
                  type="checkbox"
                  checked={atual.enabled}
                  disabled={salvando === info.kind}
                  onChange={(e) => salvar(info.kind, { ...atual, enabled: e.target.checked })}
                />
                <span>
                  {info.nome}
                  <span className={s.dica}>{info.oQueFaz}</span>
                </span>
              </label>

              <div className={s.linhaIntegracaoProvedor}>
                <label className="sr-only" htmlFor={`provedor-${clinica.id}-${info.kind}`}>
                  Provedor de {info.nome} da {clinica.name}
                </label>
                <input
                  id={`provedor-${clinica.id}-${info.kind}`}
                  className={s.input}
                  // As sugestões são as mesmas para toda clínica, então a
                  // <datalist> é uma só, na página — uma por cartão repetiria o
                  // mesmo id quatro vezes no documento.
                  list={`provedores-${info.kind}`}
                  defaultValue={atual.providerName}
                  disabled={salvando === info.kind}
                  // Salva ao sair do campo: digitar nome de provedor letra a
                  // letra dispararia um PUT por tecla.
                  onBlur={(e) => {
                    const providerName = e.target.value.trim() || "mock";
                    if (providerName !== atual.providerName) {
                      salvar(info.kind, { ...atual, providerName });
                    }
                  }}
                />
                {atual.providerName === "mock" ? (
                  <span className={s.dica}>modo demonstração (grátis)</span>
                ) : (
                  <span className={s.dica}>provedor real ainda não implementado no código</span>
                )}
              </div>

              {aviso ? (
                <p
                  className={aviso.tipo === "erro" ? s.erro : s.sucesso}
                  role={aviso.tipo === "erro" ? "alert" : undefined}
                >
                  {aviso.texto}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
