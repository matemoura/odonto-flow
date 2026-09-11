"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OpportunityStage } from "../../../lib/api";
import { STAGES } from "./stages";
import s from "./crm.module.css";

export function StageSelect({ opportunityId, stage }: { opportunityId: string; stage: OpportunityStage }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const newStage = event.target.value;
    startTransition(async () => {
      await fetch(`/api/staff/crm/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      router.refresh();
    });
  }

  return (
    <select className={s.cardSelect} value={stage} onChange={handleChange} disabled={isPending}>
      {STAGES.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
