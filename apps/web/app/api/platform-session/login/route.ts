import { NextRequest, NextResponse } from "next/server";
import { ApiError, loginPlatformAdmin } from "../../../../lib/api";
import {
  SESSION_COOKIE_BASE,
  SESSION_COOKIE_NAMES,
  STAFF_ACCESS_COOKIE_MAX_AGE,
  STAFF_REFRESH_COOKIE_MAX_AGE,
} from "../../../../lib/session";

/** BFF de login do dono da plataforma — mesmo padrão do login de equipe, sem nenhuma clínica envolvida. */
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ message: "Preencha e-mail e senha." }, { status: 400 });
  }

  try {
    const { accessToken, refreshToken, user } = await loginPlatformAdmin(email, password);
    const response = NextResponse.json({ user });
    const base = SESSION_COOKIE_BASE;
    response.cookies.set(SESSION_COOKIE_NAMES.platformToken, accessToken, {
      ...base,
      maxAge: STAFF_ACCESS_COOKIE_MAX_AGE,
    });
    response.cookies.set(SESSION_COOKIE_NAMES.platformRefresh, refreshToken, {
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
