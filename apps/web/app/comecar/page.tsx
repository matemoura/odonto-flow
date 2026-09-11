import { Suspense } from "react";
import { SignupForm } from "./SignupForm";
import s from "../entrar/entrar.module.css";

export const metadata = { title: "Criar conta — Odonto Flow" };

export default function ComecarPage() {
  return (
    <main id="conteudo" className={s.pagina}>
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
