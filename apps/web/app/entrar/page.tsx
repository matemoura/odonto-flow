import { Suspense } from "react";
import { BuscarClinicaForm } from "./BuscarClinicaForm";
import s from "./entrar.module.css";

export const metadata = { title: "Entrar — Odonto Flow" };

export default function EntrarPage() {
  return (
    <main id="conteudo" className={s.pagina}>
      <Suspense fallback={null}>
        <BuscarClinicaForm />
      </Suspense>
    </main>
  );
}
