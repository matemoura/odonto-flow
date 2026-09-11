"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@odontoflow/ui";
import s from "./entrar.module.css";

/**
 * Ponto de entrada sem link salvo: a pessoa digita o nome (slug) da clínica e
 * cai em /entrar/[clinicSlug] — a mesma URL que teria salvo/marcado se já
 * tivesse entrado antes. Não valida o slug aqui; quem valida é a página de
 * destino (mesmo padrão de /pacientes/[id], que trata 404 lá).
 */
export function BuscarClinicaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clinicSlug, setClinicSlug] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const slug = clinicSlug.trim().toLowerCase();
    if (!slug) return;

    const next = searchParams.get("next");
    const destino = `/entrar/${encodeURIComponent(slug)}${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    router.push(destino);
  }

  return (
    <div className={s.folha}>
      <h1 className={s.marca}>Odonto Flow</h1>
      <p className={s.subtitulo}>Entrar como profissional ou administrador da clínica.</p>

      <form onSubmit={handleSubmit}>
        <div className={s.campo}>
          <label className={s.rotuloCampo} htmlFor="clinicSlug">
            Nome da clínica
          </label>
          <input
            id="clinicSlug"
            className={s.input}
            value={clinicSlug}
            onChange={(e) => setClinicSlug(e.target.value)}
            placeholder="ex.: vila-nova"
            autoFocus
            required
          />
        </div>
        <div className={s.acoes}>
          <Button type="submit" variant="primary">
            Continuar
          </Button>
        </div>
      </form>

      <p className={s.rodape}>
        Ainda não tem conta? <Link href="/comecar">Cadastre sua clínica</Link>.
        <br />
        Dica: depois de entrar, salve o link da sua clínica nos favoritos — da próxima vez ele já
        abre direto na tela de login dela.
        <br />
        Ambiente de demonstração — clínica <code>vila-nova</code>.
      </p>
    </div>
  );
}
