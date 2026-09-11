import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ApiError, getPublicClinic } from "../../../lib/api";
import { EntrarClinicaForm } from "./EntrarClinicaForm";
import s from "../entrar.module.css";

export async function generateMetadata({ params }: { params: Promise<{ clinicSlug: string }> }) {
  const { clinicSlug } = await params;
  const clinica = await getPublicClinic(clinicSlug).catch(() => null);
  return { title: clinica ? `Entrar — ${clinica.name}` : "Entrar — Odonto Flow" };
}

export default async function EntrarClinicaPage({ params }: { params: Promise<{ clinicSlug: string }> }) {
  const { clinicSlug } = await params;

  let clinica;
  try {
    clinica = await getPublicClinic(clinicSlug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    return (
      <main id="conteudo" className={s.pagina}>
        <div className={s.folha} role="alert">
          Não foi possível carregar esta clínica agora. Tente novamente em instantes.
        </div>
      </main>
    );
  }

  return (
    <main id="conteudo" className={s.pagina}>
      <Suspense fallback={null}>
        <EntrarClinicaForm clinicSlug={clinicSlug} clinicName={clinica.name} />
      </Suspense>
    </main>
  );
}
