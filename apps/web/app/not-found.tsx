import Link from "next/link";

export const metadata = { title: "Página não encontrada — Odonto Flow" };

export default function NotFound() {
  return (
    <main
      id="conteudo"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "24px 16px",
        background: "var(--gaze-2)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          textAlign: "center",
          background: "var(--gaze)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--sombra)",
          padding: "28px 26px 26px",
        }}
      >
        <h1 style={{ fontFamily: "var(--fonte-display)", fontSize: 26, marginBottom: 6 }}>
          Odonto Flow
        </h1>
        <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600 }}>
          Página não encontrada.
        </p>
        <p style={{ margin: "6px 0 22px", fontSize: 13, color: "var(--tinta-70)" }}>
          O endereço acessado não existe ou o link está incorreto.
        </p>
        <Link href="/" className="odontoflow-btn odontoflow-btn--primary">
          Ir para a página inicial
        </Link>
      </div>
    </main>
  );
}
