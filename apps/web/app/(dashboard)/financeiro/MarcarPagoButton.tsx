"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "../../../lib/api";

const METODOS = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[];

export function MarcarPagoButton({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);

  function handlePagar(paymentMethod: PaymentMethod) {
    setErro(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/staff/finance/transactions/${transactionId}/pay`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paymentMethod }),
        });
        if (!res.ok) throw new Error();
        setEscolhendo(false);
        router.refresh();
      } catch {
        setErro("Falhou.");
      }
    });
  }

  if (!escolhendo) {
    return (
      <span>
        <Button variant="secondary" className="odontoflow-btn--sm" onClick={() => setEscolhendo(true)}>
          Marcar como pago
        </Button>
        {erro ? <span style={{ display: "block", fontSize: 11, color: "var(--ameixa)" }}>{erro}</span> : null}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 11.5, color: "var(--tinta-55)" }}>Forma:</span>
      {METODOS.map((metodo) => (
        <Button
          key={metodo}
          variant="secondary"
          className="odontoflow-btn--sm"
          onClick={() => handlePagar(metodo)}
          disabled={isPending}
          aria-disabled={isPending}
        >
          {PAYMENT_METHOD_LABEL[metodo]}
        </Button>
      ))}
      <Button
        variant="ghost"
        className="odontoflow-btn--sm"
        onClick={() => setEscolhendo(false)}
        disabled={isPending}
      >
        Cancelar
      </Button>
      {erro ? <span style={{ display: "block", fontSize: 11, color: "var(--ameixa)" }}>{erro}</span> : null}
    </span>
  );
}
