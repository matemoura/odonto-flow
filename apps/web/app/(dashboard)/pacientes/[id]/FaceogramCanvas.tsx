"use client";

import { PointerEvent as ReactPointerEvent, useRef, useState } from "react";
import { Button } from "@odontoflow/ui";

export type Point = { x: number; y: number };
export type Stroke = { points: Point[]; kind: "freehand" | "guide" };

/**
 * Faceograma — desenho livre + linhas-guia (terços horizontais, linha média)
 * sobre a foto do paciente, para planejamento de harmonização orofacial (HOF).
 * Coordenadas dos traços são relativas (0–1) à imagem, então o SVG (viewBox
 * "0 0 1 1") escala sozinho com o tamanho renderizado — sem lógica de resize.
 */
export function FaceogramCanvas({
  imageUrl,
  initialStrokes,
  onSave,
  saving,
  interactive = true,
}: {
  imageUrl: string;
  initialStrokes: Stroke[];
  onSave?: (strokes: Stroke[]) => void;
  saving?: boolean;
  interactive?: boolean;
}) {
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [drawing, setDrawing] = useState<Point[] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function toRelative(clientX: number, clientY: number): Point {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrawing([toRelative(e.clientX, e.clientY)]);
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!drawing) return;
    setDrawing((prev) => (prev ? [...prev, toRelative(e.clientX, e.clientY)] : prev));
  }

  function handlePointerUp() {
    setDrawing((prev) => {
      if (prev && prev.length > 1) {
        setStrokes((strokes) => [...strokes, { points: prev, kind: "freehand" }]);
      }
      return null;
    });
  }

  function addGuide(kind: "third-upper" | "third-lower" | "midline") {
    const guide: Stroke =
      kind === "midline"
        ? { kind: "guide", points: [{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }] }
        : kind === "third-upper"
          ? { kind: "guide", points: [{ x: 0, y: 1 / 3 }, { x: 1, y: 1 / 3 }] }
          : { kind: "guide", points: [{ x: 0, y: 2 / 3 }, { x: 1, y: 2 / 3 }] };
    setStrokes((prev) => [...prev, guide]);
  }

  function undo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  function clearAll() {
    setStrokes([]);
  }

  const allStrokes = drawing ? [...strokes, { points: drawing, kind: "freehand" as const }] : strokes;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ position: "relative", maxWidth: 420, border: "1px solid var(--linha-forte)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Foto para faceograma" style={{ display: "block", width: "100%", touchAction: "none" }} draggable={false} />
        <svg
          ref={svgRef}
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            cursor: interactive ? "crosshair" : "default",
            pointerEvents: interactive ? "auto" : "none",
          }}
          onPointerDown={interactive ? handlePointerDown : undefined}
          onPointerMove={interactive ? handlePointerMove : undefined}
          onPointerUp={interactive ? handlePointerUp : undefined}
        >
          {allStrokes.map((stroke, i) => (
            <polyline
              key={i}
              points={stroke.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={stroke.kind === "guide" ? "#2563eb" : "#c23b3b"}
              strokeWidth={0.004}
              strokeDasharray={stroke.kind === "guide" ? "0.01 0.008" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      {interactive ? (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Button variant="secondary" className="odontoflow-btn--sm" onClick={() => addGuide("third-upper")}>
              Terço superior
            </Button>
            <Button variant="secondary" className="odontoflow-btn--sm" onClick={() => addGuide("third-lower")}>
              Terço inferior
            </Button>
            <Button variant="secondary" className="odontoflow-btn--sm" onClick={() => addGuide("midline")}>
              Linha média
            </Button>
            <Button variant="ghost" className="odontoflow-btn--sm" onClick={undo} disabled={strokes.length === 0}>
              Desfazer
            </Button>
            <Button variant="ghost" className="odontoflow-btn--sm" onClick={clearAll} disabled={strokes.length === 0}>
              Limpar
            </Button>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--tinta-55)" }}>
            Desenhe livremente sobre a foto (traço vermelho) ou use as linhas-guia (traço azul).
          </p>
          <Button variant="primary" onClick={() => onSave?.(strokes)} disabled={saving} style={{ alignSelf: "flex-start" }}>
            {saving ? "Salvando…" : "Salvar nova versão"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
