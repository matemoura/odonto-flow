"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mede a largura real do container para o gráfico desenhar em pixels de
 * verdade. Com `viewBox` escalado, o texto dos eixos encolhe junto com a
 * caixa e vira borrão em card estreito — medindo, 11px é sempre 11px, e aí
 * os gráficos podem dividir a linha em telas largas sem perder legibilidade.
 */
export function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;

    setLargura(elemento.getBoundingClientRect().width);
    const observador = new ResizeObserver(([entrada]) => {
      setLargura(entrada.contentRect.width);
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return [ref, largura] as const;
}
