import { NextRequest, NextResponse } from "next/server";
import { ApiError, createAppointmentLabel, getAppointmentLabels } from "../../../../lib/api";
import { getStaffSession } from "../../../../lib/session";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  try {
    const labels = await getAppointmentLabels(session.clinicSlug, session.token);
    return NextResponse.json(labels);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar os rótulos." }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const body = await req.json();
  try {
    const label = await createAppointmentLabel(session.clinicSlug, session.token, body);
    return NextResponse.json(label, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao criar o rótulo." }, { status: 502 });
  }
}
