"use client";

/**
 * Botão de dente desenhado como um dente (não só o número) — usado no
 * odontograma e no periograma. `invertido` vira a coroa pra baixo (arcada
 * superior "pendurada" no céu da boca); a arcada inferior fica na orientação
 * natural (coroa pra cima) — as duas se encontram visualmente no meio, como
 * num mapa dentário de verdade.
 */
export function ToothButton({
  tooth,
  color,
  invertido,
  selecionado,
  title,
  onClick,
}: {
  tooth: number;
  color: string;
  invertido: boolean;
  selecionado: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "2px 3px",
        minWidth: 34,
        border: "none",
        borderRadius: "var(--r-sm)",
        background: selecionado ? "var(--gaze)" : "transparent",
        cursor: "pointer",
      }}
    >
      {invertido ? <span style={{ fontSize: 10, fontWeight: 600, color: "var(--tinta-70)" }}>{tooth}</span> : null}
      <svg width="26" height="36" viewBox="0 0 26 36" style={{ transform: invertido ? "scaleY(-1)" : undefined }}>
        <path
          d="M13 1C6.5 1 3 4.5 3 10c0 3.5 1 5 1.4 8.4.5 4.2 1.6 15.6 4 15.6 2.1 0 2.2-7.3 3.3-7.3 1.1 0 1.4 7.3 3.4 7.3 2.4 0 3.3-11.6 3.8-15.7C19.3 15 23 13.5 23 10c0-5.5-3.5-9-10-9Z"
          fill={color}
          stroke={selecionado ? "var(--consultorio)" : "var(--linha-forte)"}
          strokeWidth={selecionado ? 2.5 : 1}
        />
      </svg>
      {!invertido ? <span style={{ fontSize: 10, fontWeight: 600, color: "var(--tinta-70)" }}>{tooth}</span> : null}
    </button>
  );
}
