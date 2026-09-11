import { NextRequest, NextResponse } from "next/server";
import { ApiError, syncProcedures } from "../../../../../../lib/api";
import { getStaffSession } from "../../../../../../lib/session";

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { sourceClinicId } = await req.json();
  try {
    const result = await syncProcedures(session.clinicSlug, session.token, sourceClinicId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Não foi possível sincronizar o catálogo." }, { status: 502 });
  }
}
