import { NextRequest, NextResponse } from "next/server";
import { ApiError, removeProcedurePrescriptionItem, updateProcedurePrescriptionItem } from "../../../../../../../lib/api";
import { getStaffSession } from "../../../../../../../lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id, itemId } = await params;
  const body = await req.json();
  try {
    const item = await updateProcedurePrescriptionItem(session.clinicSlug, session.token, id, itemId, body);
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao atualizar o item da receita padrão." }, { status: 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id, itemId } = await params;
  try {
    await removeProcedurePrescriptionItem(session.clinicSlug, session.token, id, itemId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao remover o item da receita padrão." }, { status: 502 });
  }
}
