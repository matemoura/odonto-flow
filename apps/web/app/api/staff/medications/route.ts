import { NextResponse } from "next/server";
import { ApiError, getMedications } from "../../../../lib/api";
import { getStaffSession } from "../../../../lib/session";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  try {
    const medications = await getMedications(session.clinicSlug, session.token);
    return NextResponse.json(medications);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar o catálogo de medicamentos." }, { status: 502 });
  }
}
