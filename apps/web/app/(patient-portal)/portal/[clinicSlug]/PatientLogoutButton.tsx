"use client";

import { useRouter } from "next/navigation";

export function PatientLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/patient-session/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        background: "none",
        border: "none",
        color: "var(--tinta-55)",
        cursor: "pointer",
        fontSize: 12,
        textDecoration: "underline",
        textUnderlineOffset: 2,
      }}
    >
      Sair
    </button>
  );
}
