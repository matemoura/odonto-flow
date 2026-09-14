import { NextRequest, NextResponse } from "next/server";
import { ApiError, loginStaff } from "../../../../lib/api";
import {
  SESSION_COOKIE_BASE,
  SESSION_COOKIE_NAMES,
  STAFF_ACCESS_COOKIE_MAX_AGE,
  STAFF_REFRESH_COOKIE_MAX_AGE,
} from "../../../../lib/session";

/**
 * BFF de login do staff: recebe {clinicSlug, email, password} do formulário,
 * chama a API e guarda o JWT num cookie httpOnly — o token nunca fica
 * acessível a JS no navegador. O access token dura só 1h; o refresh token
 * (30d) é quem permite o middleware renovar a sessão sozinho (ver
 * middleware.ts) sem deslogar a equipe no meio do expediente.
 */
export async function POST(req: NextRequest) {
  const { clinicSlug, email, password } = await req.json();

  if (!clinicSlug || !email || !password) {
    return NextResponse.json({ message: "Preencha clínica, e-mail e senha." }, { status: 400 });
  }

  try {
    const { accessToken, refreshToken, user } = await loginStaff(clinicSlug, email, password);
    const response = NextResponse.json({ user });
    const base = SESSION_COOKIE_BASE;
    response.cookies.set(SESSION_COOKIE_NAMES.staffToken, accessToken, {
      ...base,
      maxAge: STAFF_ACCESS_COOKIE_MAX_AGE,
    });
    response.cookies.set(SESSION_COOKIE_NAMES.staffRefresh, refreshToken, {
      ...base,
      maxAge: STAFF_REFRESH_COOKIE_MAX_AGE,
    });
    response.cookies.set(SESSION_COOKIE_NAMES.staffClinic, clinicSlug, {
      ...base,
      maxAge: STAFF_REFRESH_COOKIE_MAX_AGE,
    });
    response.cookies.set(SESSION_COOKIE_NAMES.staffRole, user.role, {
      ...base,
      maxAge: STAFF_REFRESH_COOKIE_MAX_AGE,
    });
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Não foi possível entrar agora. Tente de novo." }, { status: 502 });
  }
}
