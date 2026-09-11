"use client";

import { useRouter } from "next/navigation";

export function LogoutButton({ clinicSlug }: { clinicSlug: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/session/logout", { method: "POST" });
    // Volta pro login desta mesma clínica, não pro buscador genérico — sair
    // geralmente é "trocar de usuário", não "esqueci minha clínica".
    router.push(`/entrar/${encodeURIComponent(clinicSlug)}`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        background: "none",
        border: "none",
        color: "inherit",
        opacity: 0.75,
        cursor: "pointer",
        fontSize: 11.5,
        textDecoration: "underline",
        textUnderlineOffset: 2,
        padding: "6px 0 0",
        textAlign: "left",
      }}
    >
      Sair
    </button>
  );
}
