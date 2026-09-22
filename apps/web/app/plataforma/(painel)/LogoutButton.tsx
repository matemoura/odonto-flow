"use client";

import { useRouter } from "next/navigation";
import s from "./painel.module.css";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/platform-session/logout", { method: "POST" });
    router.push("/plataforma/entrar");
    router.refresh();
  }

  return (
    <button type="button" className={s.sair} onClick={handleLogout}>
      Sair
    </button>
  );
}
