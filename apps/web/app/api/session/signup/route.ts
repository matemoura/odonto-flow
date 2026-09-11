import { NextRequest, NextResponse } from "next/server";
import { ApiError, signup } from "../../../../lib/api";
import {
  SESSION_COOKIE_NAMES,
  STAFF_ACCESS_COOKIE_MAX_AGE,
  STAFF_REFRESH_COOKIE_MAX_AGE,
} from "../../../../lib/session";

/**
 * BFF do auto-cadastro: cria a clínica + o admin na API e já entra com a
 * sessão (mesmos cookies do login) — quem se cadastra cai direto no painel,
 * sem precisar digitar e-mail/senha de novo.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const { accessToken, refreshToken, user } = await signup(body);
    const response = NextResponse.json({ user, clinicSlug: body.clinicSlug });
    const base = { httpOnly: true, sameSite: "lax" as const, path: "/" };
    response.cookies.set(SESSION_COOKIE_NAMES.staffToken, accessToken, {
      ...base,
      maxAge: STAFF_ACCESS_COOKIE_MAX_AGE,
    });
    response.cookies.set(SESSION_COOKIE_NAMES.staffRefresh, refreshToken, {
      ...base,
      maxAge: STAFF_REFRESH_COOKIE_MAX_AGE,
    });
    response.cookies.set(SESSION_COOKIE_NAMES.staffClinic, body.clinicSlug, {
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
    return NextResponse.json({ message: "Não foi possível criar sua conta agora. Tente de novo." }, { status: 502 });
  }
}
