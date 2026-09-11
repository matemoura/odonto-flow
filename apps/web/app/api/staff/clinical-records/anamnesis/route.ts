import { NextRequest, NextResponse } from "next/server";
import { ApiError, getAnamnesis, upsertAnamnesis } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

export async function GET(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const patientId = new URL(req.url).searchParams.get("patientId") ?? "";
  try {
    const anamnesis = await getAnamnesis(session.clinicSlug, session.token, patientId);
    return NextResponse.json(anamnesis);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar a anamnese." }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const body = await req.json();
  try {
    const anamnesis = await upsertAnamnesis(session.clinicSlug, session.token, body);
    return NextResponse.json(anamnesis);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao salvar a anamnese." }, { status: 502 });
  }
}
