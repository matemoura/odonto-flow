"use client";

import { useEffect, useState } from "react";
import { Button } from "@odontoflow/ui";

export function CopyLinkButton({ path }: { path: string }) {
  const [copiado, setCopiado] = useState(false);
  // Começa igual no servidor e no primeiro render do cliente (evita mismatch de
  // hidratação) — só troca para a URL absoluta depois de montado.
  const [url, setUrl] = useState(path);

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponível (ex.: contexto não seguro) — usuário pode selecionar o texto manualmente
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <code
        style={{
          padding: "10px 14px",
          background: "var(--branco)",
          border: "1px solid var(--linha-forte)",
          borderRadius: "var(--r-sm)",
          fontSize: 13,
          // URL é uma palavra só: sem isso, um slug longo empurra a página
          // para fora da tela no celular em vez de quebrar a linha
          overflowWrap: "anywhere",
          minWidth: 0,
        }}
      >
        {url}
      </code>
      <Button variant="secondary" onClick={handleCopy} type="button">
        {copiado ? "Copiado!" : "Copiar link"}
      </Button>
    </div>
  );
}
