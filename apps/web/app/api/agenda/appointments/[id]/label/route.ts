import { NextRequest, NextResponse } from "next/server";
import { ApiError, assignAppointmentLabel } from "../../../../../../lib/api";
import { getStaffSession } from "../../../../../../lib/session";

/** BFF: aplica ou remove (labelId: null) o rótulo de uma consulta. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id } = await params;
  const { labelId } = (await req.json()) as { labelId: string | null };
  try {
    const appointment = await assignAppointmentLabel(session.clinicSlug, session.token, id, labelId);
    return NextResponse.json(appointment);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao aplicar o rótulo." }, { status: 502 });
  }
}
