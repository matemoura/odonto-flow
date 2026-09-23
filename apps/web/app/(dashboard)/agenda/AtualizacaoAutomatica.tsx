"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import s from "./agenda.module.css";

const INTERVALO_MS = 10_000;

/**
 * Mantém a agenda atualizada sozinha enquanto a aba está visível — sem
 * recarregar a página, só `router.refresh()` (Server Component busca de novo,
 * o estado do cliente na tela não se perde). Pausa quando a aba fica em
 * segundo plano: ninguém está olhando, e é uma chamada a menos na API.
 */
export function AtualizacaoAutomatica() {
  const router = useRouter();
  const [segundosAtras, setSegundosAtras] = useState(0);
  const ultimaAtualizacao = useRef(Date.now());

  useEffect(() => {
    let idRefresh: ReturnType<typeof setInterval> | undefined;
    let idRelogio: ReturnType<typeof setInterval> | undefined;

    function atualizarAgora() {
      router.refresh();
      ultimaAtualizacao.current = Date.now();
      setSegundosAtras(0);
    }

    function iniciar() {
      idRefresh = setInterval(atualizarAgora, INTERVALO_MS);
      idRelogio = setInterval(() => {
        setSegundosAtras(Math.floor((Date.now() - ultimaAtualizacao.current) / 1000));
      }, 1000);
    }

    function parar() {
      clearInterval(idRefresh);
      clearInterval(idRelogio);
    }

    function handleVisibility() {
      if (document.hidden) {
        parar();
      } else {
        atualizarAgora();
        iniciar();
      }
    }

    if (!document.hidden) iniciar();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      parar();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router]);

  return (
    <span className={s.atualizacaoAutomatica} title="A agenda se atualiza sozinha a cada poucos segundos, sem recarregar a página">
      <span className={s.pontoAoVivo} aria-hidden="true" />
      {segundosAtras < 2 ? "Atualizado agora" : `Atualizado há ${segundosAtras}s`}
    </span>
  );
}
