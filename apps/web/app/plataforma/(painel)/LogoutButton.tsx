"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/platform-session/logout", { method: "POST" });
    router.push("/plataforma/entrar");
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
        opacity: 0.85,
        cursor: "pointer",
        fontSize: 12.5,
        textDecoration: "underline",
        textUnderlineOffset: 2,
      }}
    >
      Sair
    </button>
  );
}
