import { NextRequest, NextResponse } from "next/server";
import { ApiError, updateBudgetStatus } from "../../../../../../lib/api";
import { getStaffSession } from "../../../../../../lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json();
  try {
    const budget = await updateBudgetStatus(session.clinicSlug, session.token, id, status);
    return NextResponse.json(budget);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao atualizar orçamento." }, { status: 502 });
  }
}
