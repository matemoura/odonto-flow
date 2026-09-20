import { NextRequest, NextResponse } from "next/server";
import { refreshStaffSession } from "./lib/api";
import { SESSION_COOKIE_BASE, SESSION_COOKIE_NAMES, STAFF_ACCESS_COOKIE_MAX_AGE } from "./lib/session";

/**
 * Renova a sessão da equipe sozinha, sem deslogar no meio do expediente: o
 * access token dura só 1h (ver AuthService), então antes de qualquer página
 * do painel renderizar, troca o token por um novo se estiver perto de
 * expirar (ou já expirado) e o refresh token (30d) ainda for válido. Se o
 * refresh também já não valer mais, deixa passar — a página em si redireciona
 * pra /entrar/[clínica] quando getStaffSession() não encontrar um token.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAMES.staffToken)?.value;
  const refreshToken = request.cookies.get(SESSION_COOKIE_NAMES.staffRefresh)?.value;
  const clinicSlug = request.cookies.get(SESSION_COOKIE_NAMES.staffClinic)?.value;

  if (!refreshToken || !clinicSlug || (token && !isExpiringSoon(token))) {
    return NextResponse.next();
  }

  try {
    const { accessToken } = await refreshStaffSession(clinicSlug, refreshToken);

    request.cookies.set(SESSION_COOKIE_NAMES.staffToken, accessToken);
    const response = NextResponse.next({ request });
    // Reusa SESSION_COOKIE_BASE em vez de repetir as opções: escritas à mão,
    // esta perdia o `secure`, e como a renovação acontece no máximo 1h depois
    // do login, TODO usuário de produção acabava com o token sem a flag.
    response.cookies.set(SESSION_COOKIE_NAMES.staffToken, accessToken, {
      ...SESSION_COOKIE_BASE,
      maxAge: STAFF_ACCESS_COOKIE_MAX_AGE,
    });
    return response;
  } catch {
    // Refresh token inválido/expirado — segue sem sessão válida; a página
    // (via getStaffSession()) manda pra /entrar/[clínica].
    return NextResponse.next();
  }
}

export function isExpiringSoon(token: string): boolean {
  try {
    const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(payloadB64)) as { exp?: number };
    if (!payload.exp) return true;
    const msRemaining = payload.exp * 1000 - Date.now();
    return msRemaining < 5 * 60 * 1000; // renova se faltar menos de 5min (ou já expirou)
  } catch {
    return true;
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|entrar|agendar|portal).*)"],
};
