import { NextRequest, NextResponse } from "next/server";
import { ApiError, removeProcedureMaterial, updateProcedureMaterial } from "../../../../../../../lib/api";
import { getStaffSession } from "../../../../../../../lib/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> },
) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id, materialId } = await params;
  const body = await req.json();
  try {
    const material = await updateProcedureMaterial(session.clinicSlug, session.token, id, materialId, body.quantityUsed);
    return NextResponse.json(material);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao atualizar material." }, { status: 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> },
) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id, materialId } = await params;
  try {
    await removeProcedureMaterial(session.clinicSlug, session.token, id, materialId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao remover material." }, { status: 502 });
  }
}
