import { PlataformaLoginForm } from "./PlataformaLoginForm";
import s from "../../entrar/entrar.module.css";

export const metadata = { title: "Entrar — Painel da plataforma" };

export default function PlataformaEntrarPage() {
  return (
    <main id="conteudo" className={s.pagina}>
      <PlataformaLoginForm />
    </main>
  );
}
