import { NextRequest, NextResponse } from "next/server";
import { ApiError, createPrescription, getPrescriptions } from "../../../../lib/api";
import { getStaffSession } from "../../../../lib/session";

export async function GET(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const patientId = new URL(req.url).searchParams.get("patientId") ?? "";
  try {
    const prescriptions = await getPrescriptions(session.clinicSlug, session.token, patientId);
    return NextResponse.json(prescriptions);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar as receitas." }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const body = await req.json();
  try {
    const prescription = await createPrescription(session.clinicSlug, session.token, body);
    return NextResponse.json(prescription, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao emitir a receita." }, { status: 502 });
  }
}
