"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@odontoflow/ui";
import s from "./agenda.module.css";

export type SignaturePadHandle = {
  isEmpty: () => boolean;
  toDataUrl: () => string;
};

/**
 * Campo de assinatura por toque/mouse — um canvas simples, sem biblioteca.
 * `pointer events` cobre mouse, caneta e dedo com o mesmo código.
 *
 * O canvas é redimensionado para o `devicePixelRatio` na montagem, senão o
 * traço fica borrado em tela de celular/tablet (o mesmo canvas em CSS 300x120
 * precisa de um buffer 2x/3x maior nesses aparelhos para ficar nítido).
 */
export const SignaturePad = forwardRef<SignaturePadHandle>(function SignaturePad(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [vazio, setVazio] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const proporcao = window.devicePixelRatio || 1;
    const largura = canvas.clientWidth;
    const altura = canvas.clientHeight;
    canvas.width = largura * proporcao;
    canvas.height = altura * proporcao;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(proporcao, proporcao);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a1a";
  }, []);

  function posicaoRelativa(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // Sem isto, arrastar o ponteiro a partir de perto de um rótulo vira seleção
    // de texto do navegador em vez de traço no canvas.
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    desenhando.current = true;
    const { x, y } = posicaoRelativa(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    event.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = posicaoRelativa(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    setVazio(false);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    desenhando.current = false;
  }

  function limpar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setVazio(true);
  }

  useImperativeHandle(ref, () => ({
    isEmpty: () => vazio,
    toDataUrl: () => canvasRef.current?.toDataURL("image/png") ?? "",
  }));

  return (
    <div className={s.assinaturaCampo}>
      <canvas
        ref={canvasRef}
        className={s.assinaturaCanvas}
        aria-label="Área para desenhar a assinatura"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <Button type="button" variant="ghost" className="odontoflow-btn--sm" onClick={limpar}>
        Limpar assinatura
      </Button>
    </div>
  );
});
