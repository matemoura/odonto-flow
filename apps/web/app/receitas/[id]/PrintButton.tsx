"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="odontoflow-btn odontoflow-btn--primary no-imprimir"
    >
      Imprimir
    </button>
  );
}
