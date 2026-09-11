import { NextRequest, NextResponse } from "next/server";
import { ApiError, updateAppointmentStatus, type AppointmentStatus } from "../../../../../../lib/api";
import { getStaffSession } from "../../../../../../lib/session";

/** BFF: repassa a troca de status para a API usando o token do cookie httpOnly. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { id } = await params;
  const { status } = (await req.json()) as { status: AppointmentStatus };

  try {
    const appointment = await updateAppointmentStatus(session.clinicSlug, session.token, id, status);
    return NextResponse.json(appointment);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao atualizar." }, { status: 502 });
  }
}
