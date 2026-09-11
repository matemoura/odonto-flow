"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";

export function IssueInvoiceButton({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleClick() {
    setErro(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/staff/finance/transactions/${transactionId}/invoice`, { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? "Falha ao emitir.");
        }
        router.refresh();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Falha ao emitir.");
      }
    });
  }

  return (
    <span>
      <Button variant="secondary" className="odontoflow-btn--sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "…" : "Emitir NF-e"}
      </Button>
      {erro ? <span style={{ display: "block", fontSize: 11, color: "var(--ameixa)" }}>{erro}</span> : null}
    </span>
  );
}
