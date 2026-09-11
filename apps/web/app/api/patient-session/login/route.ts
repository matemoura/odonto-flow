import { NextRequest, NextResponse } from "next/server";
import { ApiError, loginPatient } from "../../../../lib/api";
import { SESSION_COOKIE_NAMES } from "../../../../lib/session";

export async function POST(req: NextRequest) {
  const { clinicSlug, email } = await req.json();

  if (!clinicSlug || !email) {
    return NextResponse.json({ message: "Informe o e-mail cadastrado na clínica." }, { status: 400 });
  }

  try {
    const { accessToken, patient } = await loginPatient(clinicSlug, email);
    const response = NextResponse.json({ patient });
    // Acompanha o `expiresIn: "24h"` do token de paciente em AuthService.loginPatientMock.
    const cookieOptions = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 };
    response.cookies.set(SESSION_COOKIE_NAMES.patientToken, accessToken, cookieOptions);
    response.cookies.set(SESSION_COOKIE_NAMES.patientClinic, clinicSlug, cookieOptions);
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Não foi possível entrar agora. Tente de novo." }, { status: 502 });
  }
}
