"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { IntegrationKind, PlatformIntegrationCredential } from "../../../../lib/api";
import { INTEGRACOES, CAMPOS_CONEXAO, RESUMO_CHAVE } from "../../../../lib/integracoes";
import s from "../painel.module.css";

type Aviso = { tipo: "erro" | "ok"; texto: string };

function CartaoConexao({
  kind,
  credencial,
}: {
  kind: IntegrationKind;
  credencial: PlatformIntegrationCredential;
}) {
  const router = useRouter();
  const info = INTEGRACOES.find((i) => i.kind === kind)!;
  const campos = CAMPOS_CONEXAO[kind];
  const [providerName, setProviderName] = useState(credencial.providerName ?? "");
  const [config, setConfig] = useState<Record<string, string>>(() =>
    Object.fromEntries(campos.map((c) => [c.key, String(credencial.config?.[c.key] ?? "")])),
  );
  const [secret, setSecret] = useState("");
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAviso(null);
    setSalvando(true);
    try {
      const res = await fetch(`/api/platform/integrations/credentials/${kind}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerName, config, secret: secret || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          Array.isArray(data.message) ? data.message[0] : (data.message ?? "Não foi possível salvar."),
        );
      }
      setSecret("");
      setAviso({ tipo: "ok", texto: "Conectado." });
      router.refresh();
    } catch (error) {
      setAviso({ tipo: "erro", texto: error instanceof Error ? error.message : "Não foi possível salvar." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <li className={s.cartaoConexao}>
      <header className={s.cartaoConexaoTopo}>
        <div>
          <h3 className={s.cartaoConexaoNome}>{info.nome}</h3>
          <span className={s.dica}>{info.oQueFaz}</span>
        </div>
        {credencial.temSecret ? (
          <span className={`${s.selo} ${s["selo--ok"]}`}>Conectado</span>
        ) : (
          <span className={`${s.selo} ${s["selo--alerta"]}`}>Não conectado</span>
        )}
      </header>

      <form className={s.formConexao} onSubmit={handleSubmit}>
        <div className={s.linhaConexao}>
          <div className={s.campo}>
            <label className={s.rotuloCampo} htmlFor={`provedor-${kind}`}>
              Provedor
            </label>
            <input
              id={`provedor-${kind}`}
              className={s.input}
              list={`provedores-${kind}`}
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder={info.provedoresReais.split(", ")[0]}
              required
            />
          </div>

          {campos.map((campo) => (
            <div className={s.campo} key={campo.key}>
              <label className={s.rotuloCampo} htmlFor={`${kind}-${campo.key}`}>
                {campo.rotulo}
                {campo.opcional ? <span className={s.dica}> (opcional)</span> : null}
              </label>
              <input
                id={`${kind}-${campo.key}`}
                className={s.input}
                value={config[campo.key] ?? ""}
                onChange={(e) => setConfig((atual) => ({ ...atual, [campo.key]: e.target.value }))}
                required={!campo.opcional}
              />
            </div>
          ))}

          <div className={s.campo}>
            <label className={s.rotuloCampo} htmlFor={`${kind}-secret`}>
              {RESUMO_CHAVE[kind]}
            </label>
            <input
              id={`${kind}-secret`}
              className={s.input}
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={credencial.temSecret ? "•••••••• (deixe em branco para manter)" : ""}
              autoComplete="off"
              required={!credencial.temSecret}
            />
          </div>
        </div>

        {aviso ? (
          <p className={aviso.tipo === "erro" ? s.erro : s.sucesso} role={aviso.tipo === "erro" ? "alert" : undefined}>
            {aviso.texto}
          </p>
        ) : null}

        {credencial.lastError ? <p className={s.erro}>Último erro do provedor: {credencial.lastError}</p> : null}

        <div className={s.acoes}>
          <button
            type="submit"
            className="odontoflow-btn odontoflow-btn--secondary odontoflow-btn--sm"
            disabled={salvando}
            aria-disabled={salvando}
          >
            {salvando ? "Salvando…" : credencial.temSecret ? "Atualizar conexão" : "Conectar"}
          </button>
        </div>
      </form>
    </li>
  );
}

export function ConectarServicosForm({ credenciais }: { credenciais: PlatformIntegrationCredential[] }) {
  return (
    <div>
      <ul className={s.listaConexoes}>
        {credenciais.map((credencial) => (
          <CartaoConexao key={credencial.kind} kind={credencial.kind} credencial={credencial} />
        ))}
      </ul>

      {INTEGRACOES.map((info) => (
        <datalist key={info.kind} id={`provedores-${info.kind}`}>
          {info.provedoresReais.split(", ").map((provedor) => (
            <option key={provedor} value={provedor} />
          ))}
        </datalist>
      ))}
    </div>
  );
}
