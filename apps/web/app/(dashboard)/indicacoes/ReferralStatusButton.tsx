"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@odontoflow/ui";
import type { ReferralStatus } from "../../../lib/api";

const NEXT_ACTION: Partial<Record<ReferralStatus, { next: ReferralStatus; label: string }>> = {
  PENDING: { next: "CONVERTED", label: "Marcar como convertida" },
  CONVERTED: { next: "REWARDED", label: "Marcar recompensa entregue" },
};

export function ReferralStatusButton({ referralId, status }: { referralId: string; status: ReferralStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const action = NEXT_ACTION[status];
  if (!action) return null;

  function handleClick() {
    startTransition(async () => {
      await fetch(`/api/staff/referrals/${referralId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: action!.next, rewardGranted: action!.next === "REWARDED" }),
      });
      router.refresh();
    });
  }

  return (
    <Button variant="secondary" className="odontoflow-btn--sm" onClick={handleClick} disabled={isPending}>
      {isPending ? "…" : action.label}
    </Button>
  );
}
