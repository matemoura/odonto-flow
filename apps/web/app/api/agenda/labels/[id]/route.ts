import { NextRequest, NextResponse } from "next/server";
import { ApiError, deleteAppointmentLabel, updateAppointmentLabel } from "../../../../../lib/api";
import { getStaffSession } from "../../../../../lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  try {
    const label = await updateAppointmentLabel(session.clinicSlug, session.token, id, body);
    return NextResponse.json(label);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao atualizar o rótulo." }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteAppointmentLabel(session.clinicSlug, session.token, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao excluir o rótulo." }, { status: 502 });
  }
}
