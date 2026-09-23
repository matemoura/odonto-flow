import { NextRequest, NextResponse } from "next/server";
import { ApiError, removeTreatmentPlanOptionItem, updateTreatmentPlanOptionItem } from "../../../../../../../../lib/api";
import { getStaffSession } from "../../../../../../../../lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id, itemId } = await params;
  const body = await req.json();
  try {
    const option = await updateTreatmentPlanOptionItem(session.clinicSlug, session.token, id, itemId, body);
    return NextResponse.json(option);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao atualizar o serviço." }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id, itemId } = await params;
  try {
    const option = await removeTreatmentPlanOptionItem(session.clinicSlug, session.token, id, itemId);
    return NextResponse.json(option);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao remover o serviço." }, { status: 502 });
  }
}
