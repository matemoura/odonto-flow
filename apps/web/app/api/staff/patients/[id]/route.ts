import { NextRequest, NextResponse } from "next/server";
import { ApiError, updatePatient } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  try {
    const patient = await updatePatient(session.clinicSlug, session.token, id, body);
    return NextResponse.json(patient);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao atualizar paciente." }, { status: 502 });
  }
}
