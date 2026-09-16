import { NextRequest, NextResponse } from "next/server";
import { ApiError, getSchedulingSettings, updateSchedulingSettings } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  try {
    return NextResponse.json(await getSchedulingSettings(session.clinicSlug, session.token));
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar os dias de atendimento." }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const body = await req.json();
  try {
    return NextResponse.json(await updateSchedulingSettings(session.clinicSlug, session.token, body));
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao salvar os dias de atendimento." }, { status: 502 });
  }
}
