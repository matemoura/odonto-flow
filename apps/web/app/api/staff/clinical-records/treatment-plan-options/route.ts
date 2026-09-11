import { NextRequest, NextResponse } from "next/server";
import { ApiError, createTreatmentPlanOption, getTreatmentPlanOptions } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

export async function GET(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const patientId = new URL(req.url).searchParams.get("patientId") ?? "";
  try {
    const options = await getTreatmentPlanOptions(session.clinicSlug, session.token, patientId);
    return NextResponse.json(options);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar o plano de tratamento." }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const body = await req.json();
  try {
    const option = await createTreatmentPlanOption(session.clinicSlug, session.token, body);
    return NextResponse.json(option, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao criar a opção." }, { status: 502 });
  }
}
