import { NextRequest, NextResponse } from "next/server";
import { ApiError, getCardSettings, updateCardSettings } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  try {
    return NextResponse.json(await getCardSettings(session.clinicSlug, session.token));
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar as configurações." }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const body = await req.json();
  try {
    return NextResponse.json(await updateCardSettings(session.clinicSlug, session.token, body));
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao salvar as configurações." }, { status: 502 });
  }
}
