import { NextRequest, NextResponse } from "next/server";
import { ApiError, updateInventoryMovement } from "../../../../../../../lib/api";
import { getStaffSession } from "../../../../../../../lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; movementId: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id, movementId } = await params;
  const body = await req.json();
  try {
    const movement = await updateInventoryMovement(session.clinicSlug, session.token, id, movementId, body);
    return NextResponse.json(movement);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao corrigir a movimentação." }, { status: 502 });
  }
}
