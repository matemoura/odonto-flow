import { NextRequest, NextResponse } from "next/server";
import { ApiError, getInventoryMovements } from "../../../../../../lib/api";
import { getStaffSession } from "../../../../../../lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const movements = await getInventoryMovements(session.clinicSlug, session.token, id);
    return NextResponse.json(movements);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Falha ao carregar o histórico." }, { status: 502 });
  }
}
