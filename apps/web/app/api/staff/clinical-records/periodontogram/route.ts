import { NextRequest, NextResponse } from "next/server";
import { ApiError, getPeriodontogram, upsertPeriodontalEntry } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

export async function GET(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const patientId = new URL(req.url).searchParams.get("patientId") ?? "";
  try {
    const entries = await getPeriodontogram(session.clinicSlug, session.token, patientId);
    return NextResponse.json(entries);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar o periograma." }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const body = await req.json();
  try {
    const entry = await upsertPeriodontalEntry(session.clinicSlug, session.token, body);
    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao salvar o dente." }, { status: 502 });
  }
}
