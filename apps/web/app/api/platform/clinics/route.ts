import { NextResponse } from "next/server";
import { ApiError, getPlatformClinics } from "../../../../lib/api";
import { getPlatformSession } from "../../../../lib/session";

export async function GET() {
  const session = await getPlatformSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  try {
    const clinics = await getPlatformClinics(session.token);
    return NextResponse.json(clinics);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar as clínicas." }, { status: 502 });
  }
}
