import { notFound, redirect } from "next/navigation";
import { ApiError, getPrescription } from "../../../lib/api";
import { getStaffSession } from "../../../lib/session";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Receita — Odonto Flow" };

export default async function ImprimirReceitaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) redirect("/entrar");

  const { id } = await params;

  let prescription;
  try {
    prescription = await getPrescription(session.clinicSlug, session.token, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <div style={{ padding: 40, fontSize: 13.5 }}>
        <p>Não foi possível carregar esta receita agora.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px", fontFamily: "var(--fonte-ui)" }}>
      <style>{`@media print { .no-imprimir { display: none !important; } body { background: #fff; } }`}</style>
      <div className="no-imprimir" style={{ marginBottom: 24 }}>
        <PrintButton />
      </div>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontFamily: "var(--fonte-ui)",
          fontSize: 14.5,
          lineHeight: 1.7,
          border: "1px solid var(--linha)",
          borderRadius: "var(--r-md)",
          padding: 32,
        }}
      >
        {prescription.content}
      </pre>
    </div>
  );
}
