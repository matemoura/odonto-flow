import { NextRequest, NextResponse } from "next/server";
import { ApiError, executeBudgetItem } from "../../../../../../../../lib/api";
import { getStaffSession } from "../../../../../../../../lib/session";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id, itemId } = await params;
  try {
    const item = await executeBudgetItem(session.clinicSlug, session.token, id, itemId);
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao finalizar o procedimento." }, { status: 502 });
  }
}
